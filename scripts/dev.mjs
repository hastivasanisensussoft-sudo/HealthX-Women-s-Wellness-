// Starts the HealthX API (http://127.0.0.1:4000) and the web app (http://localhost:5173) together.
// Ctrl+C stops both. The API keeps data in memory only — it resets on every restart.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['api', ['--prefix', 'apps/api', 'run', 'dev']],
  ['web', ['--prefix', 'apps/web', 'run', 'dev']],
].map(([name, args]) => {
  const p = spawn(npm, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const tag = (line) => `[${name}] ${line}`;
  p.stdout.on('data', (d) => process.stdout.write(String(d).split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  p.stderr.on('data', (d) => process.stderr.write(String(d).split('\n').filter(Boolean).map(tag).join('\n') + '\n'));
  p.on('exit', (code) => console.log(tag(`exited (${code ?? 0})`)));
  return p;
});
const stop = () => procs.forEach((p) => p.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
