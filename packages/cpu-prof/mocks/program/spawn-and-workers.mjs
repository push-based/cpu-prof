import { spawn } from 'child_process';
import { Worker } from 'worker_threads';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- simple flag parsing
function getFlag(name, def) {
  const prefixed = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefixed));
  if (!found) return def;
  const v = found.slice(prefixed.length);
  if (v === '' || v == null) return def;
  const asNum = Number(v);
  return Number.isFinite(asNum) && String(asNum) === v ? asNum : v;
}

// Configurable options
const numProcesses = Number(getFlag('procs', 2));
const numWorkers = Number(getFlag('workers', 2));
const cycles = Number(getFlag('cycles', 1));
const delayMs = Number(getFlag('delay', 100));
const childScript = join(__dirname, String(getFlag('child', 'child-process.mjs')));

// V8 profiling forwarding (can also be overridden via flags)
const cpuProfDir =
  getFlag('dir', undefined) ??
  (process.execArgv.find((arg) => arg.startsWith('--cpu-prof-dir='))?.split('=')[1] ?? undefined);
const cpuProfInterval =
  getFlag('interval', undefined) ??
  (process.execArgv.find((arg) => arg.startsWith('--cpu-prof-interval='))?.split('=')[1] ?? undefined);

function buildExecArgv() {
  const execArgv = ['--cpu-prof'];
  if (cpuProfDir) execArgv.push(`--cpu-prof-dir=${cpuProfDir}`);
  if (cpuProfInterval) execArgv.push(`--cpu-prof-interval=${cpuProfInterval}`);
  return execArgv;
}

function spawnProcessWithCPUProfile() {
  const execArgv = buildExecArgv();
  const nodeProcess = spawn('node', [...execArgv, childScript], {
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  nodeProcess.stdout.on('data', (data) => {
    process.stdout.write(`Process ${nodeProcess.pid}: ${data}`);
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

function createWorkerWithCPUProfile() {
  const execArgv = buildExecArgv();
  const worker = new Worker(childScript, {
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async function run() {
  console.log(
    `PID ${process.pid}; cycles=${cycles}, procs/cycle=${numProcesses}, workers/cycle=${numWorkers}, delay=${delayMs}ms, child=${basename(
      childScript
    )}`
  );
  if (cpuProfDir || cpuProfInterval) {
    console.log(
      `Profiling flags forwarded: dir=${cpuProfDir ?? 'default'}, interval=${cpuProfInterval ?? 'default'}`
    );
  }

  for (let c = 0; c < cycles; c++) {
    console.log(`Cycle ${c + 1}/${cycles}`);

    // spawn processes
    for (let i = 0; i < numProcesses; i++) {
      spawnProcessWithCPUProfile();
    }

    // create workers
    for (let i = 0; i < numWorkers; i++) {
      createWorkerWithCPUProfile();
    }

    if (c < cycles - 1) {
      await sleep(delayMs);
    }
  }
})();


