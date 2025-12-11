console.log(`PID ${process.pid}`);

let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += Math.sqrt(i);
}
console.log('Computation complete, sum:', sum);
process.exit(0);
