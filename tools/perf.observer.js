import { Performance, performance, PerformanceObserver } from "node:perf_hooks";
import { cwd } from "node:process";

// Global array to store complete trace events.
const traceEvents = [];

// Utility to remove the base path from a file path.
function removeBasePath(filePath) {
  return filePath.replace(cwd(), '.');
}

/**
 * Parse an error stack into an array of frames.
 * Each frame is an object with: { functionName, file, line, column }.
 */
function parseStack(stack) {
  const frames = [];
  const lines = stack.split('\n').slice(2); // Skip error message & current function.
  const regex1 = /^at\s+(.*?)\s+\((.*):(\d+):(\d+)\)$/;
  const regex2 = /^at\s+(.*):(\d+):(\d+)$/;
  for (const line of lines) {
    const trimmed = line.trim();
    let match = trimmed.match(regex1);
    if (match) {
      frames.push({
        functionName: match[1],
        file: removeBasePath(match[2]),
        line: Number(match[3]),
        column: Number(match[4])
      });
    } else {
      match = trimmed.match(regex2);
      if (match) {
        frames.push({
          functionName: null,
          file: removeBasePath(match[1]),
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

// Override performance.mark to capture full call stacks.
const originalMark = Performance.prototype.mark;
Performance.prototype.mark = function(name, options) {
  const err = new Error();
  const callStack = parseStack(err.stack);
  const opt = Object.assign({}, options, {
    detail: Object.assign({}, (options && options.detail) || {}, { callStack })
  });
  console.log('Mark for', name, performance.now());
  return originalMark.call(this, name, opt);
};

// --- Global Metadata Events ---
const threadMetadata = {
  name: 'thread_name',
  ph: 'M', // Metadata events use "M" to label threads.
  pid: process.pid,
  tid: 0,
  ts: 0,
  args: { name: `Main Thread` }
};

const processMetadata = {
  name: 'process_name',
  ph: 'M',
  pid: process.pid,
  tid: process.pid,
  ts: 0,
  args: { name: 'Measure Process' }
};

// Push metadata events only once.
if (traceEvents.length < 1) {
  traceEvents.push(threadMetadata);
  console.log(`traceEvent:JSON:${JSON.stringify(threadMetadata)}`);
  traceEvents.push(processMetadata);
  console.log(`traceEvent:JSON:${JSON.stringify(processMetadata)}`);
}

// A simple correlation id generator.
let correlationIdCounter = 0;
function generateCorrelationId() {
  return ++correlationIdCounter;
}

// --- Set up a Performance Observer to listen for measure entries ---
const observer = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  for (const entry of entries) {
    if (entry.entryType === 'measure') {
      // Create a complete event with similar structure to Chrome Trace events.
      const ts = entry.startTime * 1000; // Convert ms to microseconds.
      const dur = entry.duration * 1000;
      const event = {
        name: entry.name,
        cat: 'measure',  // Category same as in your performance traceEvents.
        ph: 'X',         // "X" indicates a complete event.
        ts,
        dur,
        pid: process.pid,
        tid: process.pid,
        args: {
          // Optionally, incorporate any additional properties.
          correlationId: generateCorrelationId(),
          uiLabel: entry.name,
          // If the marks had callStack details, they can be found in entry.detail.
          detail: entry.detail || {}
        }
      };
      traceEvents.push(event);
      console.log(`traceEvent:JSON:${JSON.stringify(event)}`);
    }
  }
});
observer.observe({ entryTypes: ['measure'], buffered: true });

// --- Expose the profile in Chrome Trace format ---
performance.profile = function () {
  return {
    metadata: {
      source: "DevTools",
      startTime: "2025-04-08T13:20:54.094Z",
      hardwareConcurrency: 12,
      dataOrigin: "TraceEvents",
      modifications: {
        entriesModifications: {
          hiddenEntries: [],
          expandableEntries: []
        },
        initialBreadcrumb: {
          window: {
            min: 269106047711,
            max: 269107913714,
            range: 1866003
          },
          child: null
        },
        annotations: {
          entryLabels: [],
          labelledTimeRanges: [],
          linksBetweenEntries: []
        }
      }
    },
    traceEvents
  };
};

performance.traceEvents = traceEvents;
