/**
 * Web Admin store glue: React context + offline-demo persistence around the shared
 * admin reducer (packages/shared/src/admin/state.ts). With the API running, the API
 * owns the state and enforces permissions; this file only mirrors it for the UI.
 */
import { createContext, useContext } from 'react';
import { initialAdminState, migrateAdminState, type AdminAction, type AdminState } from '@healthx/shared/admin/state';
import { canWith, requiredRolesLabel, type Capability } from './rbac';

export * from '@healthx/shared/admin/state';

export const ADMIN_STORAGE_KEY = 'healthx.admin.state';

/** Offline demo state from this browser, migrated to the current version (e.g. seven roles → four); fresh demo data otherwise. */
export function loadAdminState(): AdminState {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const s = migrateAdminState(JSON.parse(raw));
      if (s) return s;
    }
  } catch {
    /* storage unavailable or unreadable — fall back to fresh demo data */
  }
  return initialAdminState();
}

export interface AdminCtxValue {
  state: AdminState;
  /**
   * API mode: sends the action to the server, which decides whether this staff member may do it;
   * resolves with the server's new state, or null when it was rejected (an error toast is shown).
   * Offline demo: applies it locally.
   */
  dispatch: (a: AdminAction) => Promise<AdminState | null>;
  /** Offline demo only — with the API, the server writes the audit log itself. */
  audit: (action: string, target: string, detail?: string) => void;
  /** True when connected to the HealthX API (permissions enforced server-side). */
  apiMode: boolean;
  signOut: () => Promise<void>;
  /** Loads the role-scoped state after an API sign-in. */
  adoptSession: () => Promise<AdminState>;
  /** Re-fetches server state (API mode). */
  reload: () => Promise<void>;
}

export const AdminCtx = createContext<AdminCtxValue | null>(null);

export function useAdmin(): AdminCtxValue {
  const c = useContext(AdminCtx);
  if (!c) throw new Error('useAdmin must be used inside AdminStoreProvider');
  return c;
}

/**
 * UI permission checks for the signed-in person: their role's row plus, for an Admin, their own
 * privileged permissions (from server state in API mode). The API enforces them; these only shape the UI.
 */
export function useAccess() {
  const { state } = useAdmin();
  const role = state.session?.role;
  const privileges = state.session?.privileges ?? [];
  return {
    session: state.session,
    role,
    privileges,
    permissions: state.permissions,
    can: (cap: Capability) => canWith(state.permissions, role, cap, privileges),
    whoCan: (cap: Capability) => requiredRolesLabel(state.permissions, cap),
  };
}
