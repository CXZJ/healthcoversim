import { spawn } from 'node:child_process';

// Run both development processes without a separate process-runner dependency.
const children = [
  spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'], { stdio: 'inherit' }),
];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (child.exitCode === null) child.kill('SIGTERM');
  }
}

for (const child of children) {
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code, signal) => {
    if (!stopping) stop(code ?? (signal ? 1 : 0));
  });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
