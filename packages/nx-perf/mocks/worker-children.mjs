import { Worker } from "worker_threads";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const numWorkers = parseInt(process.argv[2], 10) || 2;
const workerScript = join(__dirname, 'child-process.mjs');

// Get CPU profile directory from parent process
const cpuProfDir = process.execArgv.find(arg => arg.startsWith('--cpu-prof-dir=')).split('=')[1];
const cpuProfInterval = process.execArgv.find(arg => arg.startsWith('--cpu-prof-interval='))?.split('=')[1] || '100';

console.log(`PID ${process.pid}; spawning ${numWorkers} workers, 3 times each at 100ms intervals`);

/**
 * Creates a Worker Thread with V8 CPU profiling enabled.
 *
 * @param {Object} options
 * @param {number} [options.interval=10] - Sampling interval in microseconds
 * @param {string} [options.dir='.cpu-profiles'] - Output directory for .cpuprofile files
 */
function createWorkerWithCPUProfile({
  interval = 10,
  dir = '.cpu-profiles'
}) {
  const execArgs = [
    '--cpu-prof',
    ...(dir ? [`--cpu-prof-dir=${dir}`] : []),
    ...(interval ? [`--cpu-prof-interval=${interval}`] : [])
  ];

  const worker = new Worker(workerScript, {
   // execArgv: execArgs,
    stdout: true,
    stderr: true
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
        ...(cpuProfInterval ? { interval: cpuProfInterval } : {})
    });
}
