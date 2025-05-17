const fs = require('fs');
const inputPath = 'packages/nx-perf/mocks/fixtures/Trace-20250513T192739.json';
const outputPath = 'packages/nx-perf/mocks/fixtures/Trace-20250513T192739.cleaned.json';

const trace = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Sort events by timestamp first
trace.traceEvents.sort((a, b) => (a.ts || 0) - (b.ts || 0));

// Find the minimum non-zero timestamp in the trace to use as the zero point
const minTs = trace.traceEvents.reduce((min, e) => (e.ts > 0 && e.ts < min) ? e.ts : min, Infinity);

// Define the window in microseconds (Chrome trace timestamps are in microseconds)
const windowStart = minTs + 40000; // 40ms after minTs
const windowEnd = minTs + 65500;   // 55ms after minTs

// Filtering function for network events
function isNetworkEvent(event) {
  const cat = event.cat || '';
  const name = event.name || '';
  const isNetworkCat = cat === 'loading' || cat.startsWith('devtools.timeline');
  const isNetworkName = /Resource|Request|Response|XHR/.test(name);
  return isNetworkCat || isNetworkName;
}

// Filtering function for GPU events
function isGPUEvent(event) {
  const cat = event.cat || '';
  const name = event.name || '';
  return /gpu/i.test(cat) || /gpu/i.test(name);
}

function isInTimeWindow(event, windowEnd) {
  // Exclude events with ts === 0
  if (event.ts === 0) return true;
  return typeof event.ts === 'number' && event.ts <= windowEnd;
}

function isNetworkEventToRemove(event) {
  return isNetworkEvent(event);
}

function isGPUEventToRemove(event) {
  return isGPUEvent(event);
}

function isBlinkEventToRemove(event) {
  return typeof event.cat === 'string' && event.cat.includes('blink');
}
function isBenchmarkToRemove(event) {
  return typeof event.cat === 'string' && event.cat.includes('benchmark');
}

function isNavigationToRemove(event) {
  return typeof event.cat === 'string' && event.cat.includes('navigation');
}

function isThreadPoolToRemove(event) {
  const argsName = event.args && typeof event.args.name === 'string' ? event.args.name.toLowerCase() : '';
  return argsName.includes('threadpool');
}

function removeTids({tid}) {
  return ![13315, 50691].includes(tid);
}


const filteredEvents = trace.traceEvents
  .filter(e => !isNetworkEventToRemove(e))
  .filter(e => !isGPUEventToRemove(e))
  .filter(e => !isBlinkEventToRemove(e))
  .filter(e => !isNavigationToRemove(e))
  .filter(e => !isThreadPoolToRemove(e))
  .filter(e => !isBenchmarkToRemove(e))
  .filter(removeTids)
  .filter(e => isInTimeWindow(e, windowEnd))

const cleanedTrace = { ...trace, traceEvents: filteredEvents };
fs.writeFileSync(outputPath, JSON.stringify(cleanedTrace, null, 2));
console.log(`Cleaned trace written to ${outputPath}`); 
