import { CPUProfile } from './cpuprofile.types';
import {
  CpuProfilerStartProfilingEvent,
  CpuProfilerStopProfilingEvent,
  ProcessNameEvent,
  ProfileChunkEvent,
  ProfileEvent,
  ThreadNameEvent,
  TraceEvent,
  TraceFile,
  TraceMetadata,
  TracingStartedInBrowserEvent,
} from './traceprofile.types';
import { basename } from 'node:path';
import { getMainProfileInfo } from './profile-selection';
import { CpuProfileInfo } from './types';

/**
 * Converts a V8 CPU profile into Trace Event-Format JSON.
 * This is used to visualize the CPU profile in the DevTools timeline.
 *
 * @param cpuProfile - The V8 CPU profile to convert.
 * @param opt - Options for the conversion.
 * @returns An array of Trace Event objects representing the CPU profile.
 */
export function cpuProfileToTraceProfileEvents(
  cpuProfile: CPUProfile,
  opt: {
    pid: number;
    tid: number;
    sequence?: number;
  }
): [
  CpuProfilerStartProfilingEvent,
  ProfileEvent,
  ProfileChunkEvent,
  CpuProfilerStopProfilingEvent
] {
  const { pid, tid, sequence = 0 } = opt;
  const { startTime = 1, endTime, nodes, timeDeltas, samples } = cpuProfile;
  // we need a unique id to connect profile chunks
  const id = `${pid}${tid}${sequence}`;

  return [
    // CpuProfiler::StartProfiling event is needed to make it visible in the panel
    {
      cat: 'v8',
      name: 'CpuProfiler::StartProfiling',
      dur: 0,
      ph: 'I',
      pid,
      tid,
      ts: startTime,
      args: {
        data: {
          startTime,
        },
      },
    },
    // 1 Profile event is needed to make the panel aware of the profile
    {
      cat: 'v8.cpu_profiler',
      id: `0x${id}`,
      name: 'Profile',
      ph: 'P',
      pid,
      tid,
      // can't be 0 as the minimap needs the event timing
      ts: startTime,
      args: {
        data: {
          startTime,
        },
      },
    },
    // 1 ProfileChunk event is needed to including the full profile
    {
      cat: 'v8.cpu_profiler',
      name: 'ProfileChunk',
      id: `0x${id}`,
      ph: 'P',
      pid,
      tid,
      ts: 0,
      args: {
        data: {
          cpuProfile: {
            nodes,
            samples,
          },
          timeDeltas,
        },
      },
    },
    // CpuProfiler::StopProfiling event is optional but here for completeness
    {
      cat: 'v8',
      name: 'CpuProfiler::StopProfiling',
      dur: 0,
      ph: 'I',
      pid,
      tid,
      ts: endTime,
      args: {
        data: {
          endTime,
        },
      },
    },
  ];
}

export function getThreadNameTraceEvent(
  pid: number,
  tid: number,
  name: string
): ThreadNameEvent {
  return {
    cat: '__metadata',
    name: 'thread_name',
    ph: 'M',
    pid,
    tid,
    ts: 0,
    args: {
      name,
    },
  };
}

export function getProcessNameTraceEvent(
  pid: number,
  tid: number,
  name: string
): ProcessNameEvent {
  return {
    cat: '__metadata',
    name: 'process_name',
    ph: 'M',
    pid,
    tid,
    ts: 0,
    args: {
      name,
    },
  };
}

export function getRunTaskTraceEvent(
  pid: number,
  tid: number,
  opt: {
    ts: number;
    dur: number;
  }
): TraceEvent {
  const { ts, dur } = opt;
  return {
    args: {},
    cat: 'devtools.timeline',
    dur,
    name: 'RunTask',
    ph: 'X',
    pid,
    tid,
    ts,
  };
}

export function getStartTracing(
  pid: number,
  tid: number,
  opt: {
    traceStartTs: number;
    frameTreeNodeId?: number;
    url: string;
  }
): TracingStartedInBrowserEvent {
  const { traceStartTs, frameTreeNodeId = 1, url } = opt;
  return {
    cat: 'devtools.timeline',
    name: 'TracingStartedInBrowser',
    ph: 'I',
    pid,
    tid,
    ts: traceStartTs,
    s: 't',
    args: {
      data: {
        frameTreeNodeId,
        frames: [
          {
            frame: `frame-${frameTreeNodeId}`,
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
  };
}

export function getThreadName(info: CpuProfileInfo): string {
  const { sourceFilePath, execArgs } = info;
  return `${basename(sourceFilePath ?? '')} ${execArgs?.join(' ')}`;
}

export function getTraceMetadata(info?: CpuProfileInfo): TraceMetadata {
  const { startDate } = info ?? {};
  return {
    source: 'DevTools',
    startTime: startDate?.toISOString() ?? new Date().toISOString(),
    hardwareConcurrency: 1,
    dataOrigin: 'TraceEvents',
  };
}

/**
 * Prepares CPU profile information based on the smosh option.
 * Smosh options control how process IDs (pid) and thread IDs (tid) are handled:
 * - false: Keep original values
 * - true: Set both pid and tid to 1
 * - 'pid': Set pid to 1 and use index as tid
 * - 'tid': Set tid to 1 and keep original pid
 */
function prepareProfileInfos(
  cpuProfileInfos: CpuProfileInfo[],
  smosh: false | 'all' | 'pid' | 'tid' = false
): CpuProfileInfo[] {
  if (smosh === false) return cpuProfileInfos;
  if (smosh === 'all') {
    return cpuProfileInfos.map((info, idx) => {
      const { pid: _, tid: __, ...rest } = info;
      return { ...rest, pid: 1, tid: 1 };
    });
  }
  if (smosh === 'pid') {
    return cpuProfileInfos.map((info, idx) => {
      const { pid: _, ...rest } = info;
      return { ...rest, pid: 1 };
    });
  }
  if (smosh === 'tid') {
    return cpuProfileInfos.map((info) => {
      const { tid: _, ...rest } = info;
      return { ...rest, tid: 1 };
    });
  }
  return cpuProfileInfos;
}

/**
 * Wraps a V8 CPU profile into a Trace Event-Format JSON,
 * and injects minimal timeline events for DevTools
 **/
export function cpuProfilesToTraceFile(
  cpuProfileInfos: CpuProfileInfo[],
  options?: { smosh?: 'all' | 'pid' | 'tid'; startTracingInBrowser?: boolean }
): TraceFile {
  const { smosh = false, startTracingInBrowser = true } = options ?? {};

  const preparedProfileInfos = prepareProfileInfos(cpuProfileInfos, smosh);

  const mainProfileInfo = getMainProfileInfo(preparedProfileInfos);
  const { pid: mainPid, tid: mainTid, sequence = 0 } = mainProfileInfo;

  const traceEvents = [];

  // Conditionally add TracingStartedInBrowser event
  if (startTracingInBrowser) {
    traceEvents.push(
      getStartTracing(mainPid, mainTid, {
        traceStartTs: mainProfileInfo.cpuProfile.startTime ?? 0,
        // has to be valid URL @TODO
        url: `file://test-file`,
        frameTreeNodeId: sequence,
      })
    );
  }

  // Add the rest of the trace events
  traceEvents.push(
    ...preparedProfileInfos.flatMap((info) => {
      const { cpuProfile, pid, tid, sourceFilePath } = info;
      return [
        // @TODO handle naming more intuitively
        ...(sourceFilePath ? [getProcessNameTraceEvent(pid, tid, '')] : []),
        getThreadNameTraceEvent(pid, tid, ''),
        ...cpuProfileToTraceProfileEvents(cpuProfile, {
          pid,
          tid,
        }),
      ];
    })
  );

  const traceFile: TraceFile = {
    metadata: getTraceMetadata(mainProfileInfo),
    traceEvents,
  };

  return traceFile;
}
