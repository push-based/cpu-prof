import {sortTraceEvents} from "./utils";

export interface CallFrame {
  functionName?: string;
  scriptId: number;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface CpuProfileNode {
  id: number;
  callFrame: CallFrame;
  children?: number[];
  hitCount?: number;
}

export interface CpuProfile {
  nodes: CpuProfileNode[];
  startTime: number;
  endTime: number;
  samples: number[];
  timeDeltas: number[]; // in µs
}

export interface TraceEvent {
  ph: string;
  name: string;
  pid: number;
  tid: number;
  ts: number;
  tts?: number;
  s?: string;
  cat: string;
  args: Record<string, unknown>;
  dur?: number;
}

export interface ProfileInfo {
  isMain?: boolean;
  profile: CpuProfile;
  pid: number;
  tid: number;
  sequence?: number;
  date?: Date;
  source?: string;
}

export interface TraceOutput {
  metadata?: {
    source?: string;
    startTime?: string;
    hardwareConcurrency?: number;
    dataOrigin?: string;
    modifications?: {
      entriesModifications: {
        hiddenEntries: unknown[];
        expandableEntries: unknown[];
      };
      initialBreadcrumb: {
        window: {
          min: number;
          max: number;
        };
      };
    };
  }
  traceEvents: TraceEvent[];
  displayTimeUnit: string;
}

/**
 * Converts a V8 CpuProfile → Chrome TraceEvents, merging
 * all spans by node.id so that each function appears as one
 * continuous X-span.
 */
export function convertCpuProfileToTraceFile(opts: ProfileInfo): TraceOutput {
  const { pid, tid, source = 'CPU-Profiling', profile } = opts;

  // --- Build parent lookup for stack reconstruction ---
  const nodeMap   = new Map<number, CpuProfileNode>();
  const parentMap = new Map<number, number>();
  for (const n of profile.nodes) {
    nodeMap.set(n.id, n);
    if (n.children) {
      for (const c of n.children) {
        parentMap.set(c, n.id);
      }
    }
  }
  function rebuildStack(nodeId: number): CpuProfileNode[] {
    const stack: CpuProfileNode[] = [];
    let cur: number | undefined = nodeId;
    while (cur != null && nodeMap.has(cur)) {
      const node = nodeMap.get(cur)!;
      stack.unshift(node);
      cur = parentMap.get(cur);
    }
    return stack;
  }

  // --- Emit raw per-sample X events, tagging each with its frameId ---
  const rawEvents: TraceEvent[] = [];
  // metadata for Process and Tread so Chrome groups them
  rawEvents.push({
    ph: 'M', cat: '__metadata', name: 'thread_name',
    pid, tid, ts: 0,
    args: { name: `${tid}` }
  });
  rawEvents.push({
    ph: 'M', cat: '__metadata', name: 'process_name',
    pid, tid, ts: 0,
    args: {  name: `${pid}` }
  });

  // start at the profile.startTime so spans use absolute timestamps
  let tsCursor = profile.startTime;
  for (let i = 0; i < profile.samples.length; i++) {
    const nodeId = profile.samples[i];
    const dur    = profile.timeDeltas[i];
    const stack  = rebuildStack(nodeId);

    for (const frame of stack) {
      const { functionName, url, lineNumber, columnNumber } = frame.callFrame;
      rawEvents.push({
        ph: 'X',
        cat: 'function',
        name: functionName || '(anonymous)',
        pid, tid,
        ts: tsCursor,
        dur,
        args: {
          url,
          line: lineNumber,
          col: columnNumber,
          frameId: frame.id
        }
      });
    }
    tsCursor += dur;
  }

  // --- Merge all X-events by frameId into one continuous span each ---
  const byId = new Map<number, TraceEvent[]>();
  for (const ev of rawEvents) {
    if (ev.ph === 'X' && typeof ev.args.frameId === 'number') {
      const arr = byId.get(ev.args.frameId) || [];
      arr.push(ev);
      byId.set(ev.args.frameId, arr);
    }
  }

  const merged: TraceEvent[] = [];
  for (const evs of byId.values()) {
    evs.sort((a, b) => a.ts - b.ts);
    let curr = { ...evs[0] };
    for (let i = 1; i < evs.length; i++) {
      const next   = evs[i];
      const endCurr = curr.ts + (curr.dur || 0);
      const endNext = next.ts + (next.dur || 0);
      if (next.ts <= endCurr) {
        // overlapping or adjacent: extend
        curr.dur = Math.max(endCurr, endNext) - curr.ts;
      } else {
        merged.push(curr);
        curr = { ...next };
      }
    }
    merged.push(curr);
  }

  // --- Final assembly and sort by ts ---
  const finalEvents = sortTraceEvents(merged);

  return {
    metadata: {
      source: "DevTools",
      startTime: "2025-05-11T07:25:15.135Z",
      hardwareConcurrency: 12,
      dataOrigin: "CPU-Profiling"
    },
    traceEvents: finalEvents,
    displayTimeUnit: 'ms'
  };
}
