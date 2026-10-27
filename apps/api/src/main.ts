/** Entry point: `npm run dev` (watch) or `npm start`. */
import { listen } from './app';
import { loadConfig } from './config';

// Log (never crash on) stray promise rejections — the store is in memory, a crash would lose all data.
process.on('unhandledRejection', (e) => console.error('[api] unhandled rejection:', (e as Error)?.message ?? e));

const config = loadConfig();
const { url, store } = await listen(config, undefined, (line) => console.log(`[api] ${line}`));
console.log(`HealthX API listening on ${url}  ·  storage: in-memory (no database — data resets on restart)`);
if (config.seedDemo) {
  const staff = [...store.accounts.values()].filter((a) => a.role !== 'end_user' && a.status === 'active');
  console.log(`Demo accounts (synthetic, development only) · password: ${config.demoPassword}`);
  console.log('  app users: aisha@example.com, riya.test@example.com');
  console.log(`  staff (MFA): ${staff.map((s) => `${s.email} [${s.role}]`).join(', ')}`);
  if (config.devTools) console.log('  current MFA code: GET /v1/dev/mfa-code?email=<staff email>  ·  emails: GET /v1/dev/outbox');
}
