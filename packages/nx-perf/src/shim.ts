import {
  performance,
  PerformanceObserver,
  PerformanceEntry,
} from 'node:perf_hooks';
import { basename } from 'node:path';
import { cpus } from 'node:os';
import { TraceEvent, CallFrame, PerformanceMarkOptions } from './types';

// Global array to store complete events.
const traceEvents: TraceEvent[] = [];

// Metadata events.
const processMetadata: TraceEvent = {
  name: 'process_name',
  ph: 'M',
  pid: 0,
  tid: process.pid,
  ts: 0,
  args: { name: 'Measure Process' },
};

const threadMetadata: TraceEvent = {
  name: 'thread_name',
  ph: 'M',
  pid: 0,
  tid: process.pid,
  ts: 0,
  args: {
    name: `Child Process: ${basename(process.argv.at(0) ?? '')} ${basename(
      process.argv.at(1) ?? ''
    )} ${process.argv.slice(2).join(' ')}`,
  },
};

// Store original mark function
const originalMark = performance.mark;

let correlationIdCounter = 0;
function generateCorrelationId(): number {
  return ++correlationIdCounter;
}

/**
 * Parse an error stack into an array of frames.
 */
function parseStack(stack: string): CallFrame[] {
  const frames: CallFrame[] = [];
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
          file: match[1].replace(process.cwd(), ''),
          line: Number(match[2]),
          column: Number(match[3]),
        });
      } else {
        frames.push({
          functionName: null,
          file: trimmed,
          line: 0,
          column: 0,
          raw: trimmed,
        });
      }
    }
  }
  return frames;
}

// Patch mark to include call stack
performance.mark = function (name: string, options?: PerformanceMarkOptions) {
  const err = new Error();
  const callStack = parseStack(err.stack || '');
  const opt = Object.assign({}, options, {
    detail: Object.assign({}, (options && options.detail) || {}, { callStack }),
  });
  return originalMark.call(performance, name, opt);
};

// Use PerformanceObserver to enrich and capture measure events
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const startEntry = performance.getEntriesByName(
      entry.startTime ? entry.name.split(' -> ')[0] : '',
      'mark'
    )[0] as PerformanceMarkOptions & PerformanceEntry;
    const endEntry = performance.getEntriesByName(
      entry.name,
      'mark'
    )[0] as PerformanceMarkOptions & PerformanceEntry; // fallback if needed

    const correlationId = generateCorrelationId();
    const callFrame = (startEntry?.detail?.callStack || [])[0] || {};
    const file = (callFrame.file || 'unknown').replace(process.cwd(), '.');
    const functionName =
      callFrame.functionName != null ? callFrame.functionName : 'anonymous';
    const line = callFrame.line || null;

    const ts = entry.startTime * 1000;
    const dur = entry.duration * 1000;

    const event: TraceEvent = {
      name: entry.name.replace(process.cwd(), ''),
      cat: 'measure',
      ph: 'X',
      ts,
      dur,
      pid: 0,
      tid: process.pid,
      args: {
        startDetail: startEntry?.detail || {},
        endDetail: endEntry?.detail || {},
        uiLabel: functionName,
        correlationId,
        timestamp: new Date().toISOString(),
        durationMs: dur / 1000,
        file,
        functionName,
        line,
      },
    };

    if (traceEvents.length < 1) {
      traceEvents.push(threadMetadata);
      console.log(`traceEvent:JSON:${JSON.stringify(threadMetadata)}`);
      traceEvents.push(processMetadata);
      console.log(`traceEvent:JSON:${JSON.stringify(processMetadata)}`);
    }

    traceEvents.push(event);
    console.log(`traceEvent:JSON:${JSON.stringify(event)}`);
  }
});
observer.observe({ entryTypes: ['measure'], buffered: true });

// Add profile method to performance object
(performance as any).profile = function () {
  return {
    metadata: {
      source: 'Nx Advanced Profiling',
      startTime: Date.now() / 1000,
      hardwareConcurrency: cpus().length,
      dataOrigin: 'TraceEvents',
      modifications: {
        entriesModifications: {
          hiddenEntries: [],
          expandableEntries: [],
        },
        initialBreadcrumb: {
          window: {
            min: 269106047711,
            max: 269107913714,
            range: 1866003,
          },
          child: null,
        },
        annotations: {
          entryLabels: [],
          labelledTimeRanges: [],
          linksBetweenEntries: [],
        },
      },
    },
    traceEvents,
  };
};
