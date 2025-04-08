const { performance, Performance } = require('node:perf_hooks');
const os = require('os');

// Use a correct ISO timestamp for metadata startTime.
const metadata = {
  source: "DevTools",
  startTime: new Date().toISOString(),
  hardwareConcurrency: os.cpus().length,
  dataOrigin: "TraceEvents",
  modifications: {
    entriesModifications: {
      hiddenEntries: [],
      expandableEntries: []
    },
    initialBreadcrumb: {
      window: {
        // Set these relative to your own reference
        min: 0,
        max: 1000000,
        range: 1000000
      },
      child: null
    },
    annotations: {
      entryLabels: [],
      labelledTimeRanges: [],
      linksBetweenEntries: []
    }
  }
};

// Log metadata as the first event so DevTools can pick it up.
console.log(`metadata:JSON:${JSON.stringify(metadata)}`);

// Global array to store complete trace events.
const traceEvents = [];

// Metadata event to label the main thread.
const mainThreadMetadataEvent = {
  name: 'thread_name',
  cat: '__metadata',
  ph: 'M',
  pid: process.pid,
  tid: 0,
  ts: 0,
  args: { name: 'Main Thread' }
};

// Push the thread metadata event at the start.
traceEvents.push(mainThreadMetadataEvent);
console.log(`traceEvent:JSON:${JSON.stringify(mainThreadMetadataEvent)}`);

const originalMark = Performance.prototype.mark;
const originalMeasure = Performance.prototype.measure;

/**
 * Helper to parse an error stack into an array of frames.
 * Each frame is an object with: { functionName, file, line, column }.
 */
function parseStack(stack) {
  const frames = [];
  const lines = stack.split('\n').slice(2);
  for (const line of lines) {
    const trimmed = line.trim();
    const regex1 = /^at\s+(.*?)\s+\((.*):(\d+):(\d+)\)$/;
    const regex2 = /^at\s+(.*):(\d+):(\d+)$/;
    let match = trimmed.match(regex1);
    if (match) {
      frames.push({
        functionName: match[1],
        file: match[2],
        line: Number(match[3]),
        column: Number(match[4])
      });
    } else {
      match = trimmed.match(regex2);
      if (match) {
        frames.push({
          functionName: null,
          file: match[1],
          line: Number(match[2]),
          column: Number(match[3])
        });
      } else {
        frames.push({ raw: trimmed });
      }
    }
  }
  return frames;
}

// Override performance.mark to capture the full call stack.
Performance.prototype.mark = function (name, options) {
  const err = new Error();
  const callStack = parseStack(err.stack);
  const opt = Object.assign({}, options, {
    detail: Object.assign({}, (options && options.detail) || {}, { callStack })
  });
  // Optionally, also log the mark event for debugging.
  // console.log('Mark for', name, performance.now());
  return originalMark.call(this, name, opt);
};

// Override performance.measure to create complete events.
Performance.prototype.measure = function (name, start, end, options) {
  const startEntry = performance.getEntriesByName(start, 'mark')[0];
  const endEntry = performance.getEntriesByName(end, 'mark')[0];
  let event = null;
  if (startEntry && endEntry) {
    // Use the startEntry.startTime (ms) and convert to microseconds.
    const ts = startEntry.startTime * 1000;
    const dur = (endEntry.startTime - startEntry.startTime) * 1000;
    event = {
      name,
      cat: 'devtools.timeline',  // Use a category that Chrome recognizes for timeline events.
      ph: 'X',                   // "X" for complete events.
      ts,
      dur,
      pid: process.pid,
      tid: 0,
      args: {
        startDetail: startEntry.detail || {},
        endDetail: endEntry.detail || {},
        options
      }
    };

    traceEvents.push(event);
    console.log(`traceEvent:JSON:${JSON.stringify(event)}`);
  } else {
    console.warn('Missing start or end mark for measure', name);
  }
  return originalMeasure.call(this, name, start, end, options);
};

// Add a method to performance to return the full Chrome Trace profile.
performance.profile = function () {
  return { metadata, traceEvents };
};
performance.trace = traceEvents;

module.exports = { nxPerfProfile: { metadata, traceEvents } };
