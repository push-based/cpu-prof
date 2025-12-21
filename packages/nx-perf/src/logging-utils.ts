import type {
  CompleteEvent,
  InstantEvent,
  TraceEvent,
  TraceFile,
} from '@push-based/prof-dev-kit';

export type TaskStatus = 'completed' | 'failed';

// Filename generation (inspired by Node.js CPU Profiling filenames)
export type PerfLogNameOptions = {
  prefix?: string;
  pid?: number;
  tid?: number;
  date?: Date;
  extension?: string;
};

import { getCpuProfileName } from '@push-based/prof-dev-kit';

export function getPerfLogName(
  options: Omit<PerfLogNameOptions, 'extension'>
): string {
  return getCpuProfileName({
    ...options,
    extension: 'json',
  });
}

export function createNxTaskCompleteEvent(options: {
  name: string;
  pid: number;
  tid: number;
  startTimeUs: number;
  durationUs: number;
  status: TaskStatus;
  error?: unknown;
}): CompleteEvent {
  const { name, pid, tid, startTimeUs, durationUs, status, error } = options;
  const durationMsText = `${(durationUs / 1000).toFixed(2)}ms`;

  return {
    name,
    cat: 'nx-tasks',
    ph: 'X',
    ts: startTimeUs,
    dur: durationUs,
    pid,
    tid,
    args: {
      status,
      error: error ? String(error) : undefined,
      devtools: {
        dataType: 'track-entry',
        track: 'Nx Task Performance',
        trackGroup: 'Nx Build System',
        color: status === 'completed' ? 'primary' : 'error',
        properties: [
          ['Duration', durationMsText],
          ['Status', status],
          ...(error ? [['Error', String(error)]] : []),
        ],
        tooltipText:
          status === 'completed'
            ? `Task '${name}' completed in ${durationMsText}`
            : `Task '${name}' failed after ${durationMsText}`,
      },
    },
  };
}

export function createNxErrorInstantEvent(options: {
  taskName: string;
  pid: number;
  tid: number;
  timestampUs: number;
  error: unknown;
}): InstantEvent {
  const { taskName, pid, tid, timestampUs, error } = options;
  return {
    name: taskName,
    cat: 'nx-errors',
    ph: 'I',
    dur: 0,
    ts: timestampUs,
    pid,
    tid,
    s: 'p',
    args: {
      status: 'error',
      error: error ? String(error) : undefined,
      devtools: {
        dataType: 'marker',
        color: 'error',
        properties: [
          ['Task', taskName],
          ['Error Type', (error as any)?.constructor?.name || 'Unknown'],
          ['Error Message', String(error)],
        ],
        tooltipText: `Error in task '${taskName}': ${String(error)}`,
      },
    },
  };
}

export function createTraceContainer(entries: TraceEvent[]): TraceFile {
  return {
    traceEvents: entries,
    metadata: {
      source: 'nx-perf',
      startTime: new Date().toISOString(),
      version: '1.0.0',
    },
  };
}
