console.log(`PID ${process.pid}`);

let sum = 0;
for (let i = 0; i < 1_000_000; i++) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sum += Math.sqrt(i);
}
process.exit(0);
