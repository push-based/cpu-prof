import { spawn as _spawn } from 'node:child_process';
import { Worker, threadId } from 'node:worker_threads';

const spawn = (...args) => _spawn(...args);

console.log('Main PID:', process.pid, 'TID:', threadId);

const childScript =
  "const { threadId: t } = require('worker_threads'); console.log('spawn PID:', process.pid, 'TID:', t);";
const children = [
  spawn(process.execPath, ['-e', childScript], { stdio: 'inherit' }),
  spawn(process.execPath, ['-e', childScript], { stdio: 'inherit' }),
];

const workerScript =
  "const { threadId: t } = require('worker_threads'); console.log('Worker PID:', process.pid, 'TID:', t);";
const workers = [
  new Worker(workerScript, { eval: true }),
  new Worker(workerScript, { eval: true }),
];

let exited = 0;
function checkDone() {
  exited++;
  if (exited === children.length + workers.length) {
    process.exit(0);
  }
}

[...children, ...workers].forEach((child) => {
  child.on('exit', checkDone);
});
