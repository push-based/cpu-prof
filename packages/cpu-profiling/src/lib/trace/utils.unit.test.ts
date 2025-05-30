import {describe, expect, it} from 'vitest';
import {cpuProfileToTraceProfileEvents, sortTraceEvents} from './utils';
import {CPUProfile} from '../cpu/cpuprofile.types';
import {TraceEvent} from './traceprofile.types';

describe('sortTraceEvents', () => {
  it('should sort meta events before other events, then by timestamp (comprehensive)', () => {
    const events: TraceEvent[] = [
      { ph: 'X', ts: 100 } as unknown as TraceEvent,
      { ph: 'M', ts: 50 } as unknown as TraceEvent,
      { ph: 'I', ts: 20 } as unknown as TraceEvent,
      { ph: 'M', ts: 10 } as unknown as TraceEvent,
    ];

    expect(sortTraceEvents(events)).toStrictEqual([
      expect.objectContaining({ ph: 'M', ts: 10 }),
      expect.objectContaining({ ph: 'M', ts: 50 }),
      expect.objectContaining({ ph: 'I', ts: 20 }),
      expect.objectContaining({ ph: 'X', ts: 100 }),
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
      expect.objectContaining({ ph: 'M', ts: 100 }),
      expect.objectContaining({ ph: 'M', ts: 200 }),
      expect.objectContaining({ ph: 'I', ts: 1 }),
      expect.objectContaining({ ph: 'X', ts: 5 }),
    ]);
  });

  it('should sort metadata events (ph: M) by timestamp', () => {
    const events: TraceEvent[] = [
      { ph: 'M', ts: 50 } as unknown as TraceEvent,
      { ph: 'M', ts: 10 } as unknown as TraceEvent,
      { ph: 'M', ts: 100 } as unknown as TraceEvent,
    ];

    expect(sortTraceEvents(events)).toStrictEqual([
      expect.objectContaining({ ph: 'M', ts: 10 }),
      expect.objectContaining({ ph: 'M', ts: 50 }),
      expect.objectContaining({ ph: 'M', ts: 100 }),
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
      expect.objectContaining({ ph: 'E', ts: 5 }),
      expect.objectContaining({ ph: 'I', ts: 10 }),
      expect.objectContaining({ ph: 'X', ts: 50 }),
      expect.objectContaining({ ph: 'B', ts: 100 }),
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

    expect(
      cpuProfileToTraceProfileEvents(cpuProfile, { pid: 1, tid: 2 })
    ).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
        }),
        expect.objectContaining({
          name: 'Profile',
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          args: {
            data: {
              cpuProfile: {
                nodes: cpuProfile.nodes,
                samples: cpuProfile.samples,
              },
              timeDeltas: cpuProfile.timeDeltas,
            },
          },
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
        }),
      ])
    );
  });

  it('should use sequence if provided', () => {
    const cpuProfile: CPUProfile = {
      nodes: [],
      startTime: 0,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };

    const events = cpuProfileToTraceProfileEvents(cpuProfile, {
      pid: 1,
      tid: 2,
      sequence: 3,
    });
    const expectedId = `0x123`;

    expect(events).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: expectedId, name: 'Profile' }),
        expect.objectContaining({ id: expectedId, name: 'ProfileChunk' }),
      ])
    );
  });

  it('should use startTime = 1 if startTime is undefined', () => {
    const cpuProfileUndefinedStartTime: CPUProfile = {
      nodes: [],
      // @ts-expect-error Testing with undefined startTime, which the function should default to 1
      startTime: undefined,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };

    const eventsUndefinedStartTime = cpuProfileToTraceProfileEvents(
      cpuProfileUndefinedStartTime,
      { pid: 1, tid: 2 }
    );

    expect(eventsUndefinedStartTime).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ ts: 1, name: 'CpuProfiler::StartProfiling' }),
        expect.objectContaining({ ts: 1, name: 'Profile' }),
        expect.objectContaining({ ts: 1, name: 'ProfileChunk' }),
      ])
    );
  });

  it('should use actual startTime value when it is 0', () => {
    const cpuProfileZeroStartTime: CPUProfile = {
      nodes: [],
      startTime: 0,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    };

    const eventsZeroStartTime = cpuProfileToTraceProfileEvents(
      cpuProfileZeroStartTime,
      { pid: 1, tid: 2 }
    );

    expect(eventsZeroStartTime).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ ts: 0, name: 'CpuProfiler::StartProfiling' }),
        expect.objectContaining({ ts: 0, name: 'Profile' }),
        expect.objectContaining({ ts: 0, name: 'ProfileChunk' }),
      ])
    );
  });
});

