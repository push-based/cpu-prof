import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const numProcesses = parseInt(process.argv[2], 10) || 2;
const childScript = join(__dirname, 'child-process.mjs');

// Get CPU profile directory from parent process
const cpuProfDir =
  (
    process.execArgv.find((arg) => arg.startsWith('--prof-dev-kit-dir=')) ?? ''
  )?.split('=')[1] ?? undefined;
const cpuProfInterval =
  process.execArgv
    .find((arg) => arg.startsWith('--prof-dev-kit-interval='))
    ?.split('=')[1] || '100';

console.log(
  `PID ${process.pid}; spawning ${numProcesses} processes, 3 times each at 100ms intervals`
);

/**
 * Spawns a Node.js process with V8 CPU profiling enabled.
 *
 * @param {Object} options
 * @param {number} [options.interval=10] - Sampling interval in microseconds
 * @param {string} [options.dir='profiles'] - Output directory for .cpuprofile files
 */
function spawnProcessWithCPUProfile({ interval = 10, dir = 'profiles' }) {
  const execArgv = [
    '--prof-dev-kit',
    ...(dir ? [`--prof-dev-kit-dir=${dir}`] : []),
    ...(interval ? [`--prof-dev-kit-interval=${interval}`] : []),
  ];

  const nodeProcess = spawn('node', [...execArgv, childScript], {
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  nodeProcess.stdout.on('data', (data) => {
    process.stdout.write(
      `Process ${nodeProcess.pid}: ${process.argv.join(' ')} ${data}`
    );
  });

  nodeProcess.stderr.on('data', (data) => {
    process.stderr.write(`Process ${nodeProcess.pid} error: ${data}`);
  });

  nodeProcess.on('close', (code) => {
    console.log(`Child process ${nodeProcess.pid} exited with code ${code}`);
  });

  nodeProcess.on('error', (err) => {
    console.error(`Process ${nodeProcess.pid} error:`, err);
  });
}

// Start initial set of processes
for (let i = 0; i < numProcesses; i++) {
  spawnProcessWithCPUProfile({
    ...(cpuProfDir ? { dir: cpuProfDir } : {}),
    ...(cpuProfInterval ? { interval: cpuProfInterval } : {}),
  });
}
