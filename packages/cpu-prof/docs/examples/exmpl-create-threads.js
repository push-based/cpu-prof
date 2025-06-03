import { Worker, threadId } from 'worker_threads';

const workerCodeESM = `import { threadId as t } from 'worker_threads'; console.log('Worker PID:', process.pid, 'TID:', t);`;
const workerDataURLString =
  'data:text/javascript,' + encodeURIComponent(workerCodeESM);

new Worker(new URL(workerDataURLString));
new Worker(new URL(workerDataURLString));

console.log('Main PID:', process.pid, 'TID:', threadId);
