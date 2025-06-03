import { threadId as t } from 'worker_threads';
console.log('spawn PID:', process.pid, 'TID:', t);
let sum = 0;
for (let i = 0; i < 10000000; i++) {
  sum += Math.sqrt(i);
}
process.exit(0);
