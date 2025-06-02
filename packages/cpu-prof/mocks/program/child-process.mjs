console.log(`PID ${process.pid}`);

let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += Math.sqrt(i);
}
process.exit(0);
