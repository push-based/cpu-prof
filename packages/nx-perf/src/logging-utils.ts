import type {
  CompleteEvent,
  InstantEvent,
  TraceEvent,
  TraceFile,
} from './traceprofile.types';

export type TaskStatus = 'completed' | 'failed';

// Filename generation (inspired by Node.js CPU Profiling filenames)
export type PerfLogNameOptions = {
  prefix?: string;
  pid?: number;
  tid?: number;
  date?: Date;
  extension?: string;
};

let perfLogSeq = 0;

export function getPerfLogName({
  prefix = 'EVENT-TRACE',
  pid = process.pid,
  tid = 1,
  date = new Date(),
}: Omit<PerfLogNameOptions, 'extension'>): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  const extension = '.json';

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const datePart = `${year}${month}${day}`;
  const timePart = `${hours}${minutes}${seconds}`;

  const nextSeq = ++perfLogSeq;
  const seqPart = pad(nextSeq, 3);

  const cleanExtension = extension.startsWith('.')
    ? extension.slice(1)
    : extension;
  const preparedPrefix = prefix.replace(/\s+/g, '-').replace(/[^\w-]/g, '-');

  return `${preparedPrefix}.${datePart}.${timePart}.${pid}.${tid}.${seqPart}.${cleanExtension}`;
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
