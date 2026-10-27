// Runs Web Admin test files, each against a freshly started in-memory HealthX API on :4102
// (fresh seed data per file). Vite must already be serving the web app on :5182 with
// HEALTHX_API_URL=http://127.0.0.1:4102.   node admin-run.mjs <apiDir> <test.mjs> [more.mjs …]
import { spawn } from 'node:child_process';
import path from 'node:path';

const [apiDir, ...tests] = process.argv.slice(2);
const PORT = '4102';
const env = {
  ...process.env,
  PORT,
  ALLOWED_ORIGINS: 'http://localhost:5182,http://127.0.0.1:5182',
  // Test-only headroom: the suites sign in dozens of times within one rate window.
  RATE_GLOBAL: '200000',
  RATE_LOGIN_PER_ACCOUNT: '2000',
  RATE_ADMIN_WRITES: '20000',
};

function startApi() {
  return new Promise((resolve, reject) => {
    // `node --import tsx` keeps the API in this one process, so killing it frees the port.
    const p = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], { cwd: apiDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const onData = (d) => {
      out += d;
      if (out.includes('listening on')) resolve(p);
    };
    p.stdout.on('data', onData);
    p.stderr.on('data', (d) => (out += d));
    p.on('exit', (code) => reject(new Error(`API exited (${code}):\n${out}`)));
    setTimeout(() => reject(new Error('API start timeout:\n' + out)), 30_000);
  });
}

const stop = (p) =>
  new Promise((r) => {
    if (p.exitCode !== null) return r();
    p.removeAllListeners('exit');
    p.on('exit', () => r());
    p.kill();
  });

let failed = 0;
for (const t of tests) {
  const api = await startApi();
  console.log(`\n===== ${path.basename(t)} (fresh API pid ${api.pid}) =====`);
  const code = await new Promise((r) => {
    const c = spawn(process.execPath, [t], { stdio: 'inherit', env: { ...process.env, HX_API: `http://127.0.0.1:${PORT}`, HX_WEB: 'http://127.0.0.1:5182' } });
    c.on('exit', (x) => r(x ?? 1));
  });
  await stop(api);
  console.log(`===== ${path.basename(t)} exit ${code} =====`);
  if (code !== 0) failed++;
}
console.log(`\nfiles: ${tests.length}, failed: ${failed}`);
process.exit(failed ? 1 : 0);
