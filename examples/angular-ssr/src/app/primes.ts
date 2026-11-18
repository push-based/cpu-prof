/**
 * Deliberate CPU work, so the profiles have something to show. Runs on the server while
 * rendering, and again in the browser when the app boots. Search for `computePrimes` in DevTools:
 * it shows up in the Node lane and in the browser's main thread.
 */
export function computePrimes(limit: number): number[] {
  const primes: number[] = [];
  for (let n = 2; primes.length < limit; n++) {
    let isPrime = true;
    for (let d = 2; d * d <= n; d++) {
      if (n % d === 0) {
        isPrime = false;
        break;
      }
    }
    if (isPrime) primes.push(n);
  }
  return primes;
}
