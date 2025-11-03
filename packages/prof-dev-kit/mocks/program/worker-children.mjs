import { Worker } from 'worker_threads';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const numWorkers = parseInt(process.argv[2], 10) || 2;
const workerScript = join(__dirname, 'child-process.mjs');

// Get CPU profile directory from parent process
const cpuProfDir = process.execArgv
  .find((arg) => arg.startsWith('--prof-dev-kit-dir='))
  .split('=')[1];
const cpuProfInterval =
  process.execArgv
    .find((arg) => arg.startsWith('--prof-dev-kit-interval='))
    ?.split('=')[1] || '100';

console.log(
  `PID ${process.pid}; spawning ${numWorkers} workers, 3 times each at 100ms intervals`
);

/**
 * Creates a Worker Thread with V8 CPU profiling enabled.
 *
 * @param {Object} options
 * @param {number} [options.interval=10] - Sampling interval in microseconds
 * @param {string} [options.dir='profiles'] - Output directory for .cpuprofile files
 */
function createWorkerWithCPUProfile({ interval = 10, dir = 'profiles' }) {
  const execArgv = [
    '--prof-dev-kit',
    ...(dir ? [`--prof-dev-kit-dir=${dir}`] : []),
    ...(interval ? [`--prof-dev-kit-interval=${interval}`] : []),
  ];

  const worker = new Worker(workerScript, {
    execArgv,
    stdout: true,
    stderr: true,
  });

  const workerId = worker.threadId;

  worker.stdout.on('data', (data) => {
    process.stdout.write(`Worker ${workerId}: ${data}`);
  });

  worker.stderr.on('data', (data) => {
    process.stderr.write(`Worker ${workerId} error: ${data}`);
  });

  worker.on('exit', (code) => {
    console.log(`Worker thread ${workerId} exited with code ${code}`);
  });

  worker.on('error', (err) => {
    console.error(`Worker ${workerId} error:`, err);
  });
}

// Start initial set of workers
for (let i = 0; i < numWorkers; i++) {
  createWorkerWithCPUProfile({
    ...(cpuProfDir ? { dir: cpuProfDir } : {}),
    ...(cpuProfInterval ? { interval: cpuProfInterval } : {}),
  });
}
