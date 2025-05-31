console.log(`PID ${process.pid}`);

// Keep the process alive for a short duration to allow CPU profiling
// Do some CPU work to ensure we get profile data
let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += Math.sqrt(i);
}
process.exit(0);
