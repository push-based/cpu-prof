const { performance, Performance } = require('node:perf_hooks');

// Global array to store complete events.
const trace = [];

// Needed to label the thread as "Main Thread".
trace.push({
  name: 'thread_name',
  ph: 'M',
  pid: process.pid,
  tid: 0,
  ts: 0,
  args: { name: 'Main Thread' },
});

const originalMark = Performance.prototype.mark;
const originalMeasure = Performance.prototype.measure;

/**
 * Helper to parse an error stack into an array of frames.
 * Each frame is an object: { functionName, file, line, column }.
 *
 * @param {string} stack - The full error stack string.
 * @returns {Array<Object>} Array of stack frame objects.
 */
function parseStack(stack) {
  const frames = [];
  const lines = stack.split('\n').slice(2); // Skip error message & current function.
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
        column: Number(match[4]),
      });
    } else {
      match = trimmed.match(regex2);
      if (match) {
        frames.push({
          functionName: null,
          file: match[1],
          line: Number(match[2]),
          column: Number(match[3]),
        });
      } else {
        frames.push({ raw: trimmed });
      }
    }
  }
  return frames;
}

// Override performance.mark to capture full call stack.
Performance.prototype.mark = function (name, options) {
  const err = new Error();
  const callStack = parseStack(err.stack);
  const opt = Object.assign({}, options, {
    detail: Object.assign({}, options && options.detail, { callStack }),
  });
  console.log('Mark for', name, performance.now());
  return originalMark.call(this, name, opt);
};

// Override performance.measure to create complete events and attach the full event
// as detail on the returned measure object.
Performance.prototype.measure = function (name, start, end, options) {
  const startEntry = performance.getEntriesByName(start, 'mark')[0];
  const endEntry = performance.getEntriesByName(end, 'mark')[0];
  let event = null;
  if (startEntry && endEntry) {
    const ts = startEntry.startTime * 1000; // Convert ms to microseconds.
    const dur = (endEntry.startTime - startEntry.startTime) * 1000;
    event = {
      name: name,
      cat: 'measure',
      ph: 'X', // "X" for complete events.
      ts,
      dur,
      pid: process.pid,
      tid: 0, // Using thread id 0 for main thread.
      args: {
        // Save full details from both marks.
        startDetail: startEntry.detail || {},
        endDetail: endEntry.detail || {},
        options,
      },
    };
    trace.push(event);
    console.log('Measure:JSON:', JSON.stringify(event));
  } else {
    console.warn('Missing start or end mark for measure', name);
  }
  return originalMeasure.call(this, name, start, end);
};

// Add a new method to performance to return the full Chrome Trace profile.
performance.profile = function () {
  return trace;
};
performance.trace = trace;
