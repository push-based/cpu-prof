import { describe, it, expect } from 'vitest';
import { sortTraceEvents, cpuProfileToTraceProfileEvents } from './utils';
import {
  getThreadNameTraceEvent,
  getProcessNameTraceEvent,
  getRunTaskTraceEvent,
  getStartTracing,
} from './trace-event-creators';
import { CPUProfile } from '../cpu/cpuprofile.types';
import { TraceEvent } from './traceprofile.types';

describe('sortTraceEvents', () => {
  it('should sort meta events before other events, then by timestamp (comprehensive)', () => {
    const events: TraceEvent[] = [
      { ph: 'X', ts: 100 } as unknown as TraceEvent,
      { ph: 'M', ts: 50 } as unknown as TraceEvent,
      { ph: 'I', ts: 20 } as unknown as TraceEvent,
      { ph: 'M', ts: 10 } as unknown as TraceEvent,
    ];
    expect(sortTraceEvents(events)).toStrictEqual([
      { ph: 'M', ts: 10 },
      { ph: 'M', ts: 50 },
      { ph: 'I', ts: 20 },
      { ph: 'X', ts: 100 },
    ]);
  });

  it('should prioritize metadata events (ph: M) over non-metadata events regardless of timestamp', () => {
    const events: TraceEvent[] = [
      { ph: 'X', ts: 5 } as unknown as TraceEvent,
      { ph: 'M', ts: 200 } as unknown as TraceEvent,
      { ph: 'I', ts: 1 } as unknown as TraceEvent,
      { ph: 'M', ts: 100 } as unknown as TraceEvent,
    ];
    expect(sortTraceEvents(events)).toStrictEqual([
      { ph: 'M', ts: 100 },
      { ph: 'M', ts: 200 },
      { ph: 'I', ts: 1 },
      { ph: 'X', ts: 5 },
    ]);
  });

  it('should sort metadata events (ph: M) by timestamp', () => {
    const events: TraceEvent[] = [
      { ph: 'M', ts: 50 } as unknown as TraceEvent,
      { ph: 'M', ts: 10 } as unknown as TraceEvent,
      { ph: 'M', ts: 100 } as unknown as TraceEvent,
    ];
    expect(sortTraceEvents(events)).toStrictEqual([
      { ph: 'M', ts: 10 },
      { ph: 'M', ts: 50 },
      { ph: 'M', ts: 100 },
    ]);
  });

  it('should sort non-metadata events by timestamp', () => {
    const events: TraceEvent[] = [
      { ph: 'X', ts: 50 } as unknown as TraceEvent,
      { ph: 'I', ts: 10 } as unknown as TraceEvent,
      { ph: 'B', ts: 100 } as unknown as TraceEvent,
      { ph: 'E', ts: 5 } as unknown as TraceEvent,
    ];
    expect(sortTraceEvents(events)).toStrictEqual([
      { ph: 'E', ts: 5 },
      { ph: 'I', ts: 10 },
      { ph: 'X', ts: 50 },
      { ph: 'B', ts: 100 },
    ]);
  });
});

describe('cpuProfileToTraceProfileEvents', () => {
  it('should convert CPUProfile to TraceEvent array', () => {
    const cpuProfile: CPUProfile = {
      nodes: [
        {
          id: 1,
          callFrame: {
            functionName: 'fn',
            scriptId: '0',
            url: '',
            lineNumber: -1,
            columnNumber: -1,
          },
          children: [],
        },
      ],
      samples: [1],
      timeDeltas: [10],
      startTime: 100,
      endTime: 200,
    };
    const pid = 1;
    const tid = 2;
    const events = cpuProfileToTraceProfileEvents(cpuProfile, { pid, tid });
    expect(events).toHaveLength(4);

    expect(events[0]?.name).toBe('CpuProfiler::StartProfiling');
    expect(events[1]?.name).toBe('Profile');
    expect(events[2]?.name).toBe('ProfileChunk');
    expect(events[3]?.name).toBe('CpuProfiler::StopProfiling');

    expect(events[2]?.args.data.cpuProfile?.nodes).toBe(cpuProfile.nodes);
    expect(events[2]?.args.data.cpuProfile?.samples).toBe(cpuProfile.samples);
    expect(events[2]?.args.data.timeDeltas).toBe(cpuProfile.timeDeltas);
  });

  it('should use sequence if provided', () => {
    const cpuProfile: CPUProfile = {
      nodes: [],
      startTime: 0,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };
    const pid = 1;
    const tid = 2;
    const sequence = 3;
    const events = cpuProfileToTraceProfileEvents(cpuProfile, {
      pid,
      tid,
      sequence,
    });
    const expectedId = `0x${pid}${tid}${sequence}`;
    expect(events[1]?.id).toBe(expectedId);
    expect(events[2]?.id).toBe(expectedId);
  });

  it('should use startTime = 1 if startTime is undefined, and actual value if 0', () => {
    const cpuProfileUndefinedStartTime: CPUProfile = {
      nodes: [],
      // @ts-expect-error Testing with undefined startTime, which the function should default to 1
      startTime: undefined,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };
    const cpuProfileZeroStartTime: CPUProfile = {
      nodes: [],
      startTime: 0, // startTime is explicitly 0
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };
    const pid = 1;
    const tid = 2;

    const eventsUndefinedStartTime = cpuProfileToTraceProfileEvents(
      cpuProfileUndefinedStartTime,
      { pid, tid }
    );
    expect(eventsUndefinedStartTime[0]?.ts).toBe(1); // Should default to 1
    expect(eventsUndefinedStartTime[1]?.ts).toBe(1); // Should default to 1
    expect(eventsUndefinedStartTime[2]?.ts).toBe(1); // Should default to 1 for ProfileChunk as well

    const eventsZeroStartTime = cpuProfileToTraceProfileEvents(
      cpuProfileZeroStartTime,
      { pid, tid }
    );
    expect(eventsZeroStartTime[0]?.ts).toBe(0); // Should be 0, not defaulted
    expect(eventsZeroStartTime[1]?.ts).toBe(0); // Should be 0, not defaulted
    expect(eventsZeroStartTime[2]?.ts).toBe(0); // Should be 0 for ProfileChunk as well
  });
});

describe('getThreadNameTraceEvent', () => {
  it('should return a ThreadNameEvent', () => {
    const pid = 1;
    const tid = 2;
    const name = 'TestThread';
    const event = getThreadNameTraceEvent(pid, tid, name);
    expect(event).toEqual({
      cat: '__metadata',
      name: 'thread_name',
      ph: 'M',
      pid,
      tid,
      ts: 0,
      args: { name },
    });
  });
});

describe('getProcessNameTraceEvent', () => {
  it('should return a ProcessNameEvent', () => {
    const pid = 1;
    const tid = 2;
    const name = 'TestProcess';
    const event = getProcessNameTraceEvent(pid, tid, name);
    expect(event).toEqual({
      cat: '__metadata',
      name: 'process_name',
      ph: 'M',
      pid,
      tid,
      ts: 0,
      args: { name },
    });
  });
});

describe('getRunTaskTraceEvent', () => {
  it('should return a RunTask TraceEvent', () => {
    const pid = 1;
    const tid = 2;
    const ts = 100;
    const dur = 50;
    const event = getRunTaskTraceEvent(pid, tid, { ts, dur });
    expect(event).toEqual({
      args: {},
      cat: 'devtools.timeline',
      dur,
      name: 'RunTask',
      ph: 'X',
      pid,
      tid,
      ts,
    });
  });
});

describe('getStartTracing', () => {
  it('should return a TracingStartedInBrowserEvent', () => {
    const pid = 1;
    const tid = 2;
    const traceStartTs = 1000;
    const url = 'http://localhost';
    const event = getStartTracing(pid, tid, { traceStartTs, url });
    expect(event).toEqual({
      cat: 'devtools.timeline',
      name: 'TracingStartedInBrowser',
      ph: 'I',
      pid,
      tid,
      ts: traceStartTs,
      s: 't',
      args: {
        data: {
          frameTreeNodeId: 1,
          frames: [
            {
              frame: 'frame-1',
              isInPrimaryMainFrame: true,
              isOutermostMainFrame: true,
              name: '',
              processId: pid,
              url,
            },
          ],
          persistentIds: true,
        },
      },
    });
  });

  it('should use frameTreeNodeId if provided', () => {
    const pid = 1;
    const tid = 2;
    const traceStartTs = 1000;
    const url = 'http://localhost';
    const frameTreeNodeId = 123;
    const event = getStartTracing(pid, tid, {
      traceStartTs,
      url,
      frameTreeNodeId,
    });
    expect(event.args.data?.frameTreeNodeId).toBe(frameTreeNodeId);
    expect(event.args.data?.frames[0]?.frame).toBe(`frame-${frameTreeNodeId}`);
  });
});
