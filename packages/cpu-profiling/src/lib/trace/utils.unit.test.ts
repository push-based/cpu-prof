import { describe, expect, it } from 'vitest';
import {
  cpuProfileToTraceProfileEvents,
  sortTraceEvents,
  cpuProfilesToTraceFile,
} from './utils';
import { CPUProfile, CpuProfileInfo } from '../cpu/cpuprofile.types';
import { TraceEvent, TraceEventContainer } from './traceprofile.types';

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

describe('cpuProfilesToTraceFile', () => {
  const mockCpuProfile: CPUProfile = {
    nodes: [
      {
        id: 1,
        callFrame: {
          functionName: '(root)',
          scriptId: '0',
          url: '',
          lineNumber: -1,
          columnNumber: -1,
        },
        children: [2],
      },
      {
        id: 2,
        callFrame: {
          functionName: 'testFunction',
          scriptId: '1',
          url: 'file:///test.js',
          lineNumber: 1,
          columnNumber: 0,
        },
      },
    ],
    samples: [1, 2],
    timeDeltas: [0, 10],
    startTime: 100,
    endTime: 200,
  };

  const createMockCpuProfileInfo = (
    overrides: Partial<CpuProfileInfo> = {}
  ): CpuProfileInfo => ({
    pid: 1,
    tid: 0,
    cpuProfile: mockCpuProfile,
    startDate: new Date('2023-01-01T00:00:00Z'),
    sourceFilePath: '/test/profile.cpuprofile',
    execArgs: ['node', 'test.js'],
    ...overrides,
  });

  describe('basic functionality', () => {
    it('should convert single CPU profile to trace file', () => {
      const profileInfo = createMockCpuProfileInfo();
      const result = cpuProfilesToTraceFile([
        profileInfo,
      ]) as TraceEventContainer;

      expect(result).toMatchObject({
        traceEvents: expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            pid: 1,
            tid: 0,
          }),
          expect.objectContaining({
            name: 'Profile',
            pid: 1,
            tid: 0,
          }),
          expect.objectContaining({
            name: 'ProfileChunk',
            pid: 1,
            tid: 0,
          }),
          expect.objectContaining({
            name: 'CpuProfiler::StopProfiling',
            pid: 1,
            tid: 0,
          }),
        ]),
        metadata: expect.objectContaining({
          source: 'DevTools',
          startTime: expect.any(String),
          hardwareConcurrency: 1,
          dataOrigin: 'TraceEvents',
        }),
      });
    });

    it('should convert multiple CPU profiles to trace file', () => {
      const profileInfo1 = createMockCpuProfileInfo({ pid: 1, tid: 0 });
      const profileInfo2 = createMockCpuProfileInfo({ pid: 2, tid: 1 });
      const result = cpuProfilesToTraceFile([
        profileInfo1,
        profileInfo2,
      ]) as TraceEventContainer;

      expect(result.traceEvents).toHaveLength(8); // 4 events per profile

      // Check first profile events
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            pid: 1,
            tid: 0,
          }),
          expect.objectContaining({
            name: 'Profile',
            pid: 1,
            tid: 0,
          }),
        ])
      );

      // Check second profile events
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            pid: 2,
            tid: 1,
          }),
          expect.objectContaining({
            name: 'Profile',
            pid: 2,
            tid: 1,
          }),
        ])
      );
    });

    it('should handle profiles without explicit pid/tid by using main profile info and incrementing tid', () => {
      const profileInfo1 = createMockCpuProfileInfo({ pid: 10, tid: 5 });
      const profileInfo2 = createMockCpuProfileInfo({
        pid: undefined,
        tid: undefined,
      } as any);
      const result = cpuProfilesToTraceFile([
        profileInfo1,
        profileInfo2,
      ]) as TraceEventContainer;

      // First profile should keep its own pid/tid
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            pid: 10,
            tid: 5,
          }),
        ])
      );

      // Second profile should use main pid with incremented tid
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            pid: 10,
            tid: 6, // mainTid + index
          }),
        ])
      );
    });
  });

  describe('smosh options', () => {
    const profileInfo1 = createMockCpuProfileInfo({ pid: 1, tid: 0 });
    const profileInfo2 = createMockCpuProfileInfo({ pid: 2, tid: 1 });

    it('should not smosh events when smosh is "none" (default)', () => {
      const result = cpuProfilesToTraceFile([profileInfo1, profileInfo2], {
        smosh: 'none',
      }) as TraceEventContainer;

      // Should preserve original pids and tids
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ pid: 1, tid: 0 }),
          expect.objectContaining({ pid: 2, tid: 1 }),
        ])
      );
    });

    it('should smosh all events to main pid/tid when smosh is "all"', () => {
      const result = cpuProfilesToTraceFile([profileInfo1, profileInfo2], {
        smosh: 'all',
      }) as TraceEventContainer;

      // All events should have the main pid (1) and tid (0)
      result.traceEvents.forEach((event: TraceEvent) => {
        expect(event).toMatchObject({ pid: 1, tid: 0 });
      });
    });

    it('should smosh events to main pid with scientific tid when smosh is "pid"', () => {
      const result = cpuProfilesToTraceFile([profileInfo1, profileInfo2], {
        smosh: 'pid',
      }) as TraceEventContainer;

      // All events should have the main pid (1)
      result.traceEvents.forEach((event: TraceEvent) => {
        expect(event.pid).toBe(1);
        expect(typeof event.tid).toBe('number');
      });
    });

    it('should smosh events to main tid when smosh is "tid"', () => {
      const result = cpuProfilesToTraceFile([profileInfo1, profileInfo2], {
        smosh: 'tid',
      }) as TraceEventContainer;

      // All events should have the main tid (0)
      result.traceEvents.forEach((event: TraceEvent) => {
        expect(event.tid).toBe(0);
      });
    });
  });

  describe('startTracingInBrowser option', () => {
    it('should add TracingStartedInBrowser events when startTracingInBrowser is true', () => {
      const profileInfo = createMockCpuProfileInfo();
      const result = cpuProfilesToTraceFile([profileInfo], {
        startTracingInBrowser: true,
      }) as TraceEventContainer;

      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'process_name',
            args: { name: 'crRendererMain' },
          }),
          expect.objectContaining({
            name: 'TracingStartedInBrowser',
          }),
        ])
      );
    });

    it('should not add TracingStartedInBrowser events when startTracingInBrowser is false or undefined', () => {
      const profileInfo = createMockCpuProfileInfo();
      const result1 = cpuProfilesToTraceFile([profileInfo], {
        startTracingInBrowser: false,
      }) as TraceEventContainer;
      const result2 = cpuProfilesToTraceFile([
        profileInfo,
      ]) as TraceEventContainer;

      [result1, result2].forEach((result) => {
        expect(result.traceEvents).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'TracingStartedInBrowser',
            }),
          ])
        );
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when no CPU profiles are provided', () => {
      expect(() => cpuProfilesToTraceFile([])).toThrow(
        'No CPU profiles provided'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle CPU profile with undefined startTime', () => {
      const cpuProfileWithUndefinedStartTime: CPUProfile = {
        ...mockCpuProfile,
        // @ts-expect-error Testing with undefined startTime
        startTime: undefined,
      };
      const profileInfo = createMockCpuProfileInfo({
        cpuProfile: cpuProfileWithUndefinedStartTime,
      });

      const result = cpuProfilesToTraceFile([
        profileInfo,
      ]) as TraceEventContainer;

      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            ts: 1, // should default to 1
          }),
        ])
      );
    });

    it('should handle CPU profile with zero startTime', () => {
      const cpuProfileWithZeroStartTime: CPUProfile = {
        ...mockCpuProfile,
        startTime: 0,
      };
      const profileInfo = createMockCpuProfileInfo({
        cpuProfile: cpuProfileWithZeroStartTime,
      });

      const result = cpuProfilesToTraceFile([
        profileInfo,
      ]) as TraceEventContainer;

      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'CpuProfiler::StartProfiling',
            ts: 0, // should preserve 0
          }),
        ])
      );
    });

    it('should handle sequences correctly for multiple profiles', () => {
      const profileInfo1 = createMockCpuProfileInfo({ sequence: 5 });
      const profileInfo2 = createMockCpuProfileInfo({ sequence: undefined });
      const result = cpuProfilesToTraceFile([
        profileInfo1,
        profileInfo2,
      ]) as TraceEventContainer;

      // Should use sequence + index for each profile
      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Profile',
            id: '0x105', // pid(1) + tid(0) + sequence(5+0)
          }),
          expect.objectContaining({
            name: 'Profile',
            id: '0x106', // pid(1) + tid(1) + sequence(5+1)
          }),
        ])
      );
    });

    it('should return TraceEventContainer structure', () => {
      const profileInfo = createMockCpuProfileInfo();
      const result = cpuProfilesToTraceFile([profileInfo]);

      expect(result).toHaveProperty('traceEvents');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray((result as TraceEventContainer).traceEvents)).toBe(
        true
      );
      expect(typeof (result as TraceEventContainer).metadata).toBe('object');
    });

    it('should sort events correctly with metadata events first', () => {
      const profileInfo = createMockCpuProfileInfo();
      const result = cpuProfilesToTraceFile([profileInfo], {
        startTracingInBrowser: true,
      }) as TraceEventContainer;

      // Find metadata events (ph: 'M')
      const metadataEvents = result.traceEvents.filter(
        (event: TraceEvent) => event.ph === 'M'
      );
      const nonMetadataEvents = result.traceEvents.filter(
        (event: TraceEvent) => event.ph !== 'M'
      );

      // Metadata events should come first
      const firstMetadataIndex = result.traceEvents.findIndex(
        (event: TraceEvent) => event.ph === 'M'
      );
      const firstNonMetadataIndex = result.traceEvents.findIndex(
        (event: TraceEvent) => event.ph !== 'M'
      );

      if (metadataEvents.length > 0 && nonMetadataEvents.length > 0) {
        expect(firstMetadataIndex).toBeLessThan(firstNonMetadataIndex);
      }
    });
  });
});
