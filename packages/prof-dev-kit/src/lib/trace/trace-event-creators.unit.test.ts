import { describe, it, expect } from 'vitest';
import { CPUProfile, CpuProfileInfo } from '../cpu/cpuprofile.types';
import {
  getThreadNameTraceEvent,
  getProcessNameTraceEvent,
  getRunTaskTraceEvent,
  getStartTracing,
  getCpuProfilerStartProfilingEvent,
  getProfileEvent,
  getProfileChunkEvent,
  getCpuProfilerStopProfilingEvent,
  getThreadName,
  getTraceMetadata,
} from './trace-event-creators';

describe('getCpuProfilerStartProfilingEvent', () => {
  it('should return a CpuProfilerStartProfilingEvent', () => {
    expect(getCpuProfilerStartProfilingEvent(1, 2, 100)).toStrictEqual({
      cat: 'v8',
      name: 'CpuProfiler::StartProfiling',
      dur: 0,
      ph: 'X',
      pid: 1,
      tid: 2,
      ts: 100,
      args: { data: { startTime: 100 } },
    });
  });
});

describe('getProfileEvent', () => {
  it('should return a ProfileEvent', () => {
    expect(getProfileEvent(1, 2, 100)).toStrictEqual({
      cat: 'v8.cpu_profiler',
      id: `0x12`,
      name: 'Profile',
      ph: 'P',
      pid: 1,
      tid: 2,
      ts: 100,
      args: { data: { startTime: 100 } },
    });
  });
});

describe('getProfileChunkEvent', () => {
  it('should return a ProfileChunkEvent', () => {
    expect(
      getProfileChunkEvent(1, 2, 100, '123', { nodes: [], samples: [] }, [10])
    ).toStrictEqual({
      cat: 'v8.cpu_profiler',
      id: `0x123`,
      name: 'ProfileChunk',
      ph: 'P',
      pid: 1,
      tid: 2,
      ts: 100,
      args: {
        data: {
          cpuProfile: { nodes: [], samples: [] },
          timeDeltas: [10],
        },
      },
    });
  });
});

describe('getCpuProfilerStopProfilingEvent', () => {
  it('should return a CpuProfilerStopProfilingEvent', () => {
    expect(getCpuProfilerStopProfilingEvent(1, 2, 200)).toStrictEqual({
      cat: 'v8',
      name: 'CpuProfiler::StopProfiling',
      dur: 0,
      ph: 'X',
      pid: 1,
      tid: 2,
      ts: 200,
      args: {
        data: {
          endTime: 200,
        },
      },
    });
  });
});

describe('getThreadNameTraceEvent', () => {
  it('should return a ThreadNameEvent', () => {
    expect(getThreadNameTraceEvent(1, 2, 'TestThread')).toStrictEqual({
      cat: '__metadata',
      name: 'thread_name',
      ph: 'M',
      pid: 1,
      tid: 2,
      ts: 0,
      args: { name: 'TestThread' },
    });
  });
});

describe('getProcessNameTraceEvent', () => {
  it('should return a ProcessNameEvent', () => {
    expect(getProcessNameTraceEvent(1, 2, 'TestProcess')).toStrictEqual({
      cat: '__metadata',
      name: 'process_name',
      ph: 'M',
      pid: 1,
      tid: 2,
      ts: 0,
      args: { name: 'TestProcess' },
    });
  });
});

describe('getRunTaskTraceEvent', () => {
  it('should return a RunTask TraceEvent', () => {
    expect(getRunTaskTraceEvent(1, 2, { ts: 100, dur: 50 })).toStrictEqual({
      args: {},
      cat: 'devtools.timeline',
      dur: 50,
      name: 'RunTask',
      ph: 'X',
      pid: 1,
      tid: 2,
      ts: 100,
    });
  });
});

describe('getStartTracing', () => {
  it('should return a TracingStartedInBrowserEvent', () => {
    expect(
      getStartTracing(1, 2, { traceStartTs: 1000, url: 'http://localhost' })
    ).toStrictEqual({
      cat: 'devtools.timeline',
      name: 'TracingStartedInBrowser',
      ph: 'I',
      pid: 1,
      tid: 2,
      ts: 1000,
      s: 't',
      args: {
        data: {
          frameTreeNodeId: 102,
          frames: [
            {
              frame: 'FRAME0P1T2',
              isInPrimaryMainFrame: true,
              isOutermostMainFrame: true,
              name: '',
              processId: 1,
              url: 'http://localhost',
            },
          ],
          persistentIds: true,
        },
      },
    });
  });

  it('should use frameTreeNodeId if provided', () => {
    expect(
      getStartTracing(1, 2, {
        traceStartTs: 1000,
        url: 'http://localhost',
        frameTreeNodeId: 123,
      }).args.data?.frameTreeNodeId
    ).toBe(102);
    expect(
      getStartTracing(1, 2, {
        traceStartTs: 1000,
        url: 'http://localhost',
        frameTreeNodeId: 123,
      }).args.data?.frames[0]?.frame
    ).toBe('FRAME0P1T2');
  });
});

describe('getThreadName', () => {
  const baseCpuProfile: CPUProfile = {
    nodes: [],
    startTime: 0,
    endTime: 1,
    samples: [],
    timeDeltas: [],
  };
  const baseInfo: CpuProfileInfo = {
    pid: 1,
    tid: 1,
    cpuProfile: baseCpuProfile,
  };
  it('should return thread name from CpuProfileInfo', () => {
    const info: CpuProfileInfo = {
      ...baseInfo,
      sourceFilePath: '/path/to/script.js',
      execArgs: ['arg1', 'arg2'],
    };
    expect(getThreadName(info)).toBe('script.js arg1 arg2');
  });

  it('should handle missing sourceFilePath', () => {
    const info: CpuProfileInfo = { ...baseInfo, execArgs: ['arg1'] };
    expect(getThreadName(info)).toBe(' arg1');
  });

  it('should handle missing execArgs', () => {
    const info: CpuProfileInfo = {
      ...baseInfo,
      sourceFilePath: '/path/to/script.js',
    };
    expect(getThreadName(info)).toBe('script.js undefined');
  });

  it('should handle both missing sourceFilePath and execArgs', () => {
    const info: CpuProfileInfo = { ...baseInfo };
    expect(getThreadName(info)).toBe(' undefined');
  });
});

describe('getTraceMetadata', () => {
  const baseCpuProfile: CPUProfile = {
    nodes: [],
    startTime: 0,
    endTime: 1,
    samples: [],
    timeDeltas: [],
  };
  const baseInfo: CpuProfileInfo = {
    pid: 1,
    tid: 1,
    cpuProfile: baseCpuProfile,
  };
  it('should return TraceMetadata with default values if no info provided', () => {
    const metadata = getTraceMetadata();
    expect(metadata.source).toBe('DevTools');
    expect(metadata.hardwareConcurrency).toBe(1);
    expect(metadata.dataOrigin).toBe('TraceEvents');
    expect(metadata.startTime).toBeDefined();
  });

  it('should use startDate from CpuProfileInfo if provided', () => {
    const testDate = new Date('2023-01-01T00:00:00.000Z');
    const info: CpuProfileInfo = { ...baseInfo, startDate: testDate };
    expect(getTraceMetadata(info).startTime).toBe(testDate.toISOString());
  });

  it('should use current date if startDate is not in CpuProfileInfo', () => {
    const info: CpuProfileInfo = { ...baseInfo };
    expect(getTraceMetadata(info).startTime).not.toBe(
      new Date(0).toISOString()
    );
  });
});
