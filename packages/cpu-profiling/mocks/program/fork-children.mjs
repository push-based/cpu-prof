import { fork } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const numProcesses = parseInt(process.argv[2] || '2', 10);
const childScript = join(__dirname, 'child-process.mjs');

console.log(`PID ${process.pid}; forking ${numProcesses} processes, 3 times each at 100ms intervals`);

const children = [];

// Fork child processes
for (let i = 0; i < numProcesses; i++) {
  const child = fork(childScript, []);

  children.push(child);

  // Handle messages from child
  child.on('message', (message) => {
    console.log(`Process ${child.pid}: ${message}`);
  });

  // Handle child exit
  child.on('exit', (code) => {
    console.log(`Child process ${child.pid} exited with code ${code}`);
  });
}

// Handle parent process exit
process.on('exit', () => {
  // Cleanup any remaining children
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
});
