import {Performance, performance} from "node:perf_hooks";
import {basename} from "node:path";
import {cpus} from "node:os";

// Global array to store complete events.
const traceEvents = [];

// Metadata events.

const processMetadata = {
  name: 'process_name', // Used to label the main process
  ph: 'M',
  pid: 0,
  tid: process.pid,
  ts: 0,
  args: { name: 'Measure Process' },
};

const threadMetadata = {
  name: 'thread_name', // Used to label the child processes
  ph: 'M',
  pid: 0,
  tid: process.pid,
  ts: 0,
  args: { name: `Child Process: ${basename(process.argv.at(0))} ${basename(process.argv.at(1))} ${process.argv.slice(2).join(' ')}` },
};


const originalMark = Performance.prototype.mark;
const originalMeasure = Performance.prototype.measure;

let correlationIdCounter = 0;
function generateCorrelationId() {
  return ++correlationIdCounter;
}

/**
 * Parse an error stack into an array of frames.
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
        file: match[2].replace(process.cwd(), ''),
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

Performance.prototype.mark = function(name, options) {
  const err = new Error();
  const callStack = parseStack(err.stack);
  const opt = Object.assign({}, options, {
    detail: Object.assign({}, (options && options.detail) || {}, { callStack }),
  });
  return originalMark.call(this, name, opt);
};
Performance.prototype.measure = function(name, start, end, options) {
  const startEntry = performance.getEntriesByName(start, 'mark')[0];
  const endEntry = performance.getEntriesByName(end, 'mark')[0];
  let event = null;

  if (startEntry && endEntry) {
    const ts = startEntry.startTime * 1000; // Convert ms to µs
    const dur = (endEntry.startTime - startEntry.startTime) * 1000;

    const correlationId = generateCorrelationId();
    const callFrame = (startEntry.detail?.callStack || [])[0] || {};
    const file = (callFrame.file || 'unknown').replace(process.cwd(), '.');
    const functionName = callFrame.functionName != null ? callFrame.functionName : 'anonymous';
    const line = callFrame.line || null;

    event = {
      name: name.replace(process.cwd(), ''), // sometimes the name includes a path
      cat: 'measure',
      ph: 'X',
      ts,
      dur,
      pid: 0,
      tid: process.pid,
      args: {
        startDetail: startEntry.detail || {},
        endDetail: endEntry.detail || {},
        uiLabel: functionName,
        correlationId,
        timestamp: new Date().toISOString(),
        durationMs: dur / 1000,
        file,
        functionName,
        line
      }
    };

    if (traceEvents.length < 1) {
      traceEvents.push(threadMetadata);
      console.log(`traceEvent:JSON:${JSON.stringify(threadMetadata)}`);
      traceEvents.push(processMetadata);
      console.log(`traceEvent:JSON:${JSON.stringify(processMetadata)}`);
    }

    traceEvents.push(event);
    console.log(`traceEvent:JSON:${JSON.stringify(event)}`);
  } else {
    console.warn('Missing start or end mark for measure', name);
  }

  return originalMeasure.call(this, name, start, end, options);
};

// Return the complete Chrome Trace profile object.
performance.profile = function() {
  return {
    metadata: {
      source: "Nx Advanced Profiling",
      startTime: Date.now() / 1000,
      hardwareConcurrency: cpus().length,
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

