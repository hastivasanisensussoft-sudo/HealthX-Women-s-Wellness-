/**
 * HealthX API client shared by the web app, Web Admin and mobile app (platform-agnostic fetch).
 * - Access token: kept in memory only.
 * - Refresh token: web → HttpOnly cookie set by the API (never visible to JS);
 *   mobile → returned in the body and handed to `tokenStore` (OS keystore when available).
 * - On 401 the client refreshes once and retries; if that fails, `onSessionEnd` fires.
 */
import type { Action, AppState } from '../state';
import type { AdminAction, AdminState } from '../admin/state';
import type { PrivilegedCapability, StaffRole } from '../admin/rbac';
import type { ActivityFeedEntry, ActivityPage, ActivitySummary, ContentEngagementRow, HealthAccessGrant, HealthRecordResponse, UserNoteView, UserOverview } from '../admin/appUsers';
import type { UsageEvent } from '../activity';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
  /** Network failure (API not running / offline). */
  get offline() {
    return this.status === 0;
  }
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  /** One of the four SRS roles (§6.1–§6.4). */
  role: StaffRole;
  status: string;
  capabilities: string[];
  /** Admin accounts: privileged permissions held by this person. */
  privileges?: PrivilegedCapability[];
  mfaEnrolled: boolean;
  /** Email ownership proven (verification link, magic link or password reset). */
  emailVerified?: boolean;
}

export interface SessionResult {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  user: PublicUser;
}

export type LoginResult = { kind: 'session'; user: PublicUser } | { kind: 'mfa'; mfaToken: string };

export interface TokenStore {
  get(): Promise<string | null>;
  set(token: string | null): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  /** `web-admin` = Web Admin on the same origin as the web app (separate session cookie). */
  client: 'web' | 'web-admin' | 'mobile';
  /** Mobile only: where the refresh token lives between launches. */
  tokenStore?: TokenStore;
  onSessionEnd?: () => void;
  fetchImpl?: typeof fetch;
}

/** Query string from defined values only. */
const query = (o: Record<string, string | number | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export class ApiClient {
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  user: PublicUser | null = null;

  constructor(private opts: ApiClientOptions) {}

  get signedIn() {
    return !!this.accessToken;
  }

  private async raw<T>(method: string, path: string, body?: unknown, auth = true): Promise<T> {
    const headers: Record<string, string> = { 'X-Client': this.opts.client, 'X-Requested-With': 'healthx' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    let res: Response;
    try {
      res = await (this.opts.fetchImpl ?? fetch)(this.opts.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: this.opts.client === 'mobile' ? 'omit' : 'include',
      });
    } catch {
      throw new ApiError(0, 'offline', 'Can’t reach the HealthX server. Check your connection and try again.');
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    let json: any;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const e = json?.error ?? {};
      throw new ApiError(res.status, e.code ?? 'error', e.message ?? `Request failed (${res.status}).`, e.details);
    }
    return json as T;
  }

  /** Authenticated request with one transparent refresh on 401. */
  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    try {
      return await this.raw<T>(method, path, body);
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) throw e;
      if (!(await this.refresh())) {
        this.endSession();
        throw e;
      }
      return this.raw<T>(method, path, body);
    }
  }

  private async adopt(s: SessionResult) {
    this.accessToken = s.accessToken;
    this.user = s.user;
    if (s.refreshToken && this.opts.tokenStore) await this.opts.tokenStore.set(s.refreshToken);
    return s.user;
  }

  private endSession() {
    this.accessToken = null;
    this.user = null;
    void this.opts.tokenStore?.set(null);
    this.opts.onSessionEnd?.();
  }

  /** Restores a session after a reload/app start (cookie on web, keystore token on mobile). */
  async refresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const stored = this.opts.client === 'mobile' ? await this.opts.tokenStore?.get() : undefined;
        if (this.opts.client === 'mobile' && !stored) return false;
        const s = await this.raw<SessionResult>('POST', '/v1/auth/refresh', stored ? { refreshToken: stored } : {}, false);
        await this.adopt(s);
        return true;
      } catch {
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  // ---------- auth ----------
  async register(input: { name: string; email: string; password: string; acceptTerms: boolean }) {
    return this.adopt(await this.raw<SessionResult>('POST', '/v1/auth/register', input, false));
  }
  async login(email: string, password: string): Promise<LoginResult> {
    const r = await this.raw<SessionResult | { mfaRequired: true; mfaToken: string }>('POST', '/v1/auth/login', { email, password }, false);
    if ('mfaRequired' in r) return { kind: 'mfa', mfaToken: r.mfaToken };
    return { kind: 'session', user: await this.adopt(r) };
  }
  async verifyMfa(mfaToken: string, code: string) {
    return this.adopt(await this.raw<SessionResult>('POST', '/v1/auth/mfa/verify', { mfaToken, code }, false));
  }
  async logout() {
    try {
      if (this.accessToken) await this.raw('POST', '/v1/auth/logout');
    } finally {
      this.accessToken = null;
      this.user = null;
      await this.opts.tokenStore?.set(null);
    }
  }
  async logoutAll() {
    await this.call('POST', '/v1/auth/logout-all');
    this.accessToken = null;
    this.user = null;
    await this.opts.tokenStore?.set(null);
  }
  me = () => this.call<{ user: PublicUser; capabilities: string[] }>('GET', '/v1/auth/me');
  sessions = () => this.call<{ sessions: { id: string; client: string; userAgent: string; createdAt: string; lastSeenAt: string; current: boolean }[] }>('GET', '/v1/auth/sessions');
  revokeSession = (id: string) => this.call<void>('DELETE', `/v1/auth/sessions/${encodeURIComponent(id)}`);
  changePassword = (currentPassword: string, newPassword: string) => this.call<void>('POST', '/v1/auth/password/change', { currentPassword, newPassword });
  forgotPassword = (email: string) => this.raw<{ ok: true }>('POST', '/v1/auth/password/forgot', { email }, false);
  resetPassword = (token: string, newPassword: string) => this.raw<void>('POST', '/v1/auth/password/reset', { token, newPassword }, false);
  requestMagicLink = (email: string) => this.raw<{ ok: true }>('POST', '/v1/auth/magic-link', { email }, false);
  async verifyMagicLink(token: string) {
    return this.adopt(await this.raw<SessionResult>('POST', '/v1/auth/magic-link/verify', { token }, false));
  }
  verifyEmail = (token: string) => this.raw<{ ok: true }>('POST', '/v1/auth/verify-email', { token }, false);
  resendVerification = () => this.call<{ ok: true }>('POST', '/v1/auth/verify-email/resend');
  acceptInvite = (token: string, password: string) => this.raw<{ mfaSecret: string; otpauthUrl: string }>('POST', '/v1/auth/invite/accept', { token, password }, false);
  oauth = (provider: 'apple' | 'google') => this.raw<never>('POST', `/v1/auth/oauth/${provider}`, {}, false);

  // ---------- app user (own data only) ----------
  async getState(): Promise<AppState> {
    return (await this.call<{ state: AppState }>('GET', '/v1/me/state')).state;
  }
  /** Sends one reducer action; `id` makes retries idempotent. */
  sendAction = (action: Action, id: string = newId()) => this.call<{ ok: true; duplicate?: boolean }>('POST', '/v1/me/actions', { id, action });
  exportData = () => this.call<Record<string, unknown>>('GET', '/v1/me/export');
  deleteAccount = (password: string) => this.call<void>('DELETE', '/v1/me', { password, confirm: 'DELETE' });
  startTrial = () => this.call<{ ok: true; plan: 'premium'; trialEndsAt: string }>('POST', '/v1/me/subscription/trial');
  cancelSubscription = () => this.call<{ ok: true; plan: 'free' }>('POST', '/v1/me/subscription/cancel');
  loadSampleData = () => this.call<{ ok: true }>('POST', '/v1/me/data/sample');
  clearData = () => this.call<{ ok: true }>('POST', '/v1/me/data/clear');
  /** App-usage events (recorded by the API only while the user's analytics consent is on). */
  trackEvents = (events: { name: UsageEvent; detail?: string }[]) => this.call<{ ok: true; recorded: number; analyticsConsent: boolean }>('POST', '/v1/me/events', { events });

  // ---------- Web Admin (server enforces every permission) ----------
  async adminState(): Promise<AdminState> {
    return (await this.call<{ state: AdminState }>('GET', '/v1/admin/state')).state;
  }
  async adminAction(action: AdminAction): Promise<AdminState> {
    return (await this.call<{ state: AdminState }>('POST', '/v1/admin/actions', { action })).state;
  }
  revealEmail = (userId: string) => this.call<{ email: string }>('POST', `/v1/admin/users/${encodeURIComponent(userId)}/reveal-email`);
  breakGlass = (userId: string, reason: string) => this.call<HealthAccessGrant>('POST', `/v1/admin/users/${encodeURIComponent(userId)}/break-glass`, { reason });
  endHealthAccess = (userId: string) => this.call<void>('DELETE', `/v1/admin/users/${encodeURIComponent(userId)}/break-glass`);
  healthRecord = (userId: string) => this.call<HealthRecordResponse>('GET', `/v1/admin/users/${encodeURIComponent(userId)}/health`);
  userOverview = (userId: string) => this.call<{ overview: UserOverview }>('GET', `/v1/admin/users/${encodeURIComponent(userId)}/overview`);
  userActivity = (userId: string, opts: { page?: number; size?: number; category?: string } = {}) =>
    this.call<ActivityPage>('GET', `/v1/admin/users/${encodeURIComponent(userId)}/activity?${query(opts)}`);
  addUserNote = (userId: string, text: string) => this.call<{ note: UserNoteView }>('POST', `/v1/admin/users/${encodeURIComponent(userId)}/notes`, { text });
  activityFeed = (opts: { limit?: number; category?: string; source?: string } = {}) => this.call<{ events: ActivityFeedEntry[] }>('GET', `/v1/admin/activity?${query(opts)}`);
  activitySummary = (days = 30) => this.call<{ summary: ActivitySummary }>('GET', `/v1/admin/activity/summary?days=${days}`);
  contentEngagement = (days = 30) => this.call<{ days: number; rows: ContentEngagementRow[] }>('GET', `/v1/admin/content/engagement?days=${days}`);

  // ---------- public ----------
  health = () => this.raw<{ status: string; storage: string }>('GET', '/v1/health', undefined, false);
  contact = (input: { name: string; email: string; topic: string; message: string }) => this.raw<{ ok: true; reference: string }>('POST', '/v1/contact', input, false);
}
