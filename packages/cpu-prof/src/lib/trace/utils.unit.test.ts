import { describe, expect, it } from 'vitest';
import {
  cpuProfileToTraceProfileEvents,
  sortTraceEvents,
  cpuProfilesToTraceFile,
  smoshCpuProfiles,
} from './utils';
import { CPUProfile, CpuProfileInfo } from '../cpu/cpuprofile.types';
import { TraceEvent, TraceEventContainer } from './traceprofile.types';
import * as pyramideProfile from '../../../mocks/fixtures/minimal/pyramide.cpuprofile.json';
import * as stairUpProfile from '../../../mocks/fixtures/minimal/stair-up.cpuprofile.json';

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
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^0x/),
          name: 'Profile',
        }),
        expect.objectContaining({
          id: expect.stringMatching(/^0x/),
          name: 'ProfileChunk',
        }),
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
  const createMockCpuProfileInfo = (
    overrides: Omit<Partial<CpuProfileInfo>, 'cpuProfile'> &
      Pick<CpuProfileInfo, 'cpuProfile'>
  ): CpuProfileInfo => ({
    pid: 1,
    tid: 0,
    startDate: new Date('2023-01-01T00:00:00Z'),
    file: '/test/profile.cpuprofile',
    ...overrides,
  });

  it('should convert single CPU profile to trace file', () => {
    const result = cpuProfilesToTraceFile([
      createMockCpuProfileInfo({
        cpuProfile: pyramideProfile as CPUProfile,
      }),
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
    const pyramideProfileInfo = createMockCpuProfileInfo({
      cpuProfile: pyramideProfile as CPUProfile,
    });
    const stairUpProfileInfo = createMockCpuProfileInfo({
      cpuProfile: stairUpProfile as CPUProfile,
      pid: 2,
      tid: 1,
    });
    const result = cpuProfilesToTraceFile([
      pyramideProfileInfo,
      stairUpProfileInfo,
    ]) as TraceEventContainer;

    expect(result.traceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'process_name',
          pid: 1,
          tid: 0,
          args: { name: 'ChildProcess: pid:1' },
        }),
        expect.objectContaining({
          name: 'thread_name',
          pid: 1,
          tid: 0,
          args: { name: 'ChildProcess: pid:1' },
        }),
        expect.objectContaining({
          name: 'process_name',
          pid: 2,
          tid: 1,
          args: { name: 'WorkerThread: pid:2, tid:1' },
        }),
        expect.objectContaining({
          name: 'thread_name',
          pid: 2,
          tid: 1,
          args: { name: 'WorkerThread: pid:2, tid:1' },
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 1,
          tid: 0,
        }),
        expect.objectContaining({ name: 'Profile', pid: 1, tid: 0 }),
        expect.objectContaining({ name: 'ProfileChunk', pid: 1, tid: 0 }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 1,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 2,
          tid: 1,
        }),
        expect.objectContaining({ name: 'Profile', pid: 2, tid: 1 }),
        expect.objectContaining({ name: 'ProfileChunk', pid: 2, tid: 1 }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 2,
          tid: 1,
        }),
      ])
    );
  });

  it('should handle profiles without explicit pid/tid by using main profile info and incrementing tid', () => {
    const profileInfoWithPidTid = createMockCpuProfileInfo({
      pid: 10,
      tid: 5,
      cpuProfile: pyramideProfile,
    });
    const profileInfoUndefinedPidTid = createMockCpuProfileInfo({
      pid: undefined as unknown as number,
      tid: undefined as unknown as number,
      cpuProfile: stairUpProfile,
    });

    let result = cpuProfilesToTraceFile([
      profileInfoWithPidTid,
      profileInfoUndefinedPidTid,
    ]) as TraceEventContainer;

    expect(result.traceEvents).toEqual(
      expect.arrayContaining([
        // profileInfoWithPidTid events (pid: 10, tid: 5)
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 5,
        }),
        expect.objectContaining({
          name: 'Profile',
          pid: 10,
          tid: 5,
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          pid: 10,
          tid: 5,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 10,
          tid: 5,
        }),
        // profileInfoUndefinedPidTid events (pid: undefined, tid: undefined)
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
        }),
        expect.objectContaining({
          name: 'Profile',
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
        }),
      ])
    );

    result = cpuProfilesToTraceFile(
      [profileInfoWithPidTid, profileInfoUndefinedPidTid],
      { smosh: 'all' }
    ) as TraceEventContainer;
    expect(result.traceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 5,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 5,
        }),
      ])
    );

    result = cpuProfilesToTraceFile(
      [profileInfoWithPidTid, profileInfoUndefinedPidTid],
      { smosh: 'pid' }
    ) as TraceEventContainer;
    expect(result.traceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'Profile',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'Profile',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          pid: 10,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 10,
        }),
      ])
    );

    result = cpuProfilesToTraceFile(
      [profileInfoWithPidTid, profileInfoUndefinedPidTid],
      { smosh: 'tid' }
    ) as TraceEventContainer;
    expect(result.traceEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 5,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 5,
        }),
      ])
    );
  });

  describe('startTracingInBrowser option', () => {
    it('should add TracingStartedInBrowser events when startTracingInBrowser is true', () => {
      const profileInfo = createMockCpuProfileInfo({
        cpuProfile: pyramideProfile,
      });
      const result = cpuProfilesToTraceFile([profileInfo], {
        startTracingInBrowser: true,
      }) as TraceEventContainer;

      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'thread_name',
            args: { name: 'CrRendererMain' },
          }),
          expect.objectContaining({
            name: 'CommitLoad',
          }),
          expect.objectContaining({
            name: 'TracingStartedInBrowser',
          }),
        ])
      );
    });

    it('should not add TracingStartedInBrowser events when startTracingInBrowser is false or undefined', () => {
      const profileInfo = createMockCpuProfileInfo({
        cpuProfile: pyramideProfile,
      });
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
        ...pyramideProfile,
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
        ...pyramideProfile,
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
      const profileInfo1 = createMockCpuProfileInfo({
        cpuProfile: pyramideProfile,
        sequence: 5,
      });
      const profileInfo2 = createMockCpuProfileInfo({
        cpuProfile: stairUpProfile,
        tid: 1,
        sequence: 1,
      });
      const result = cpuProfilesToTraceFile([
        profileInfo1,
        profileInfo2,
      ]) as TraceEventContainer;

      expect(result.traceEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Profile',
            id: expect.stringMatching(/^0x/),
          }),
          expect.objectContaining({
            name: 'ProfileChunk',
            id: expect.stringMatching(/^0x/),
          }),
        ])
      );
    });

    it('should return TraceEventContainer structure', () => {
      const profileInfo = createMockCpuProfileInfo({
        cpuProfile: pyramideProfile,
      });
      const result = cpuProfilesToTraceFile([profileInfo]);

      expect(result).toHaveProperty('traceEvents');
      expect(result).toHaveProperty('metadata');
      expect(Array.isArray((result as TraceEventContainer).traceEvents)).toBe(
        true
      );
      expect(typeof (result as TraceEventContainer).metadata).toBe('object');
    });
  });

  describe('smoshCpuProfiles', () => {
    it('should return original profile infos when smosh is "off"', () => {
      const pyramideProfileInfo = createMockCpuProfileInfo({
        pid: 1,
        tid: 0,
        cpuProfile: pyramideProfile as CPUProfile,
      });
      const stairUpProfileInfo = createMockCpuProfileInfo({
        pid: 2,
        tid: 0,
        cpuProfile: stairUpProfile as CPUProfile,
      });
      const profileInfos: CpuProfileInfo[] = [
        pyramideProfileInfo,
        stairUpProfileInfo,
      ];
      const result = smoshCpuProfiles(profileInfos, {
        smosh: 'off',
        mainPid: 1,
        mainTid: 0,
      });

      expect(result).toHaveLength(2);
      expect(result).toStrictEqual([
        expect.objectContaining({
          pid: pyramideProfileInfo.pid,
          tid: pyramideProfileInfo.tid,
        }),
        expect.objectContaining({
          pid: stairUpProfileInfo.pid,
          tid: stairUpProfileInfo.tid,
        }),
      ]);
    });

    it('should default to smosh "off" if options.smosh is not explicitly passed (by internal default)', () => {
      const pyramideProfileInfo = createMockCpuProfileInfo({
        pid: 1,
        tid: 0,
        cpuProfile: pyramideProfile as CPUProfile,
      });
      const stairUpProfileInfo = createMockCpuProfileInfo({
        pid: 2,
        tid: 0,
        cpuProfile: stairUpProfile as CPUProfile,
      });
      const profileInfos: CpuProfileInfo[] = [
        pyramideProfileInfo,
        stairUpProfileInfo,
      ];
      const result = smoshCpuProfiles(profileInfos, {
        mainPid: 1,
        mainTid: 0,
      } as any);

      expect(result).toHaveLength(2);
      expect(result).toStrictEqual([
        expect.objectContaining({
          pid: pyramideProfileInfo.pid,
          tid: pyramideProfileInfo.tid,
        }),
        expect.objectContaining({
          pid: stairUpProfileInfo.pid,
          tid: stairUpProfileInfo.tid,
        }),
      ]);
    });

    it('should smosh all profile infos to mainPid and assign unique tids when smosh is "pid"', () => {
      const pyramideProfileInfo = createMockCpuProfileInfo({
        pid: 1,
        tid: 0,
        cpuProfile: pyramideProfile as CPUProfile,
      });
      const stairUpProfileInfo = createMockCpuProfileInfo({
        pid: 2,
        tid: 0,
        cpuProfile: stairUpProfile as CPUProfile,
      });
      const profileInfos: CpuProfileInfo[] = [
        pyramideProfileInfo,
        stairUpProfileInfo,
      ];
      const result = smoshCpuProfiles(profileInfos, {
        smosh: 'pid',
        mainPid: 1,
        mainTid: 0,
      });

      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ pid: 1, tid: 0 }),
          expect.objectContaining({ pid: 1, tid: 2 }),
        ])
      );
    });
  });
});
