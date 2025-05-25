import { CPUProfile } from './cpuprofile.types';
import {
  TraceMetadata,
  TraceEvent,
  TraceFile,
  ThreadNameEvent,
  ProcessNameEvent,
  ProfileEvent,
  ProfileChunkEvent,
  TracingStartedInBrowserEvent,
  CpuProfilerStartProfilingEvent,
  CpuProfilerStopProfilingEvent,
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
      cat: 'disabled-by-default-v8',
      name: 'CpuProfiler::StartProfiling',
      dur: 0,
      ph: 'i',
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
      cat: 'disabled-by-default-v8.cpu_profiler',
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
      cat: 'disabled-by-default-v8.cpu_profiler',
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
      cat: 'disabled-by-default-v8',
      name: 'CpuProfiler::StopProfiling',
      dur: 0,
      ph: 'i',
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
  name: string = 'CrRendererMain'
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
    cat: 'disabled-by-default-devtools.timeline',
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
    cat: 'disabled-by-default-devtools.timeline',
    name: 'TracingStartedInBrowser',
    ph: 'i',
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
 * Wraps a V8 CPU profile into a Trace Event-Format JSON,
 * and injects minimal timeline events for DevTools
 **/
export function cpuProfilesToTraceFile(
  cpuProfileInfos: CpuProfileInfo[]
): TraceFile {
  const mainProfileInfo = getMainProfileInfo(cpuProfileInfos);
  const { pid: mainPid, tid: mainTid, sequence = 0 } = mainProfileInfo;

  const traceFile: TraceFile = {
    metadata: getTraceMetadata(mainProfileInfo),
    traceEvents: [
      /* getStartTracing(mainPid, mainTid, {
                traceStartTs: mainProfileInfo.cpuProfile.startTime ?? 0,
                // has to be valid URL @TODO
                url: `file://${getThreadName({...mainProfileInfo, sourceFilePath: ''})}`,
                frameTreeNodeId: sequence
            }),*/
      ...cpuProfileInfos.flatMap((info) => {
        const { cpuProfile, pid, tid, sourceFilePath } = info;
        const { startTime, timeDeltas = [] } = cpuProfile;
        return [
          // @TODO handle naming more intuitively
          ...(sourceFilePath
            ? [getProcessNameTraceEvent(pid, tid, sourceFilePath)]
            : []),
          getThreadNameTraceEvent(
            pid,
            tid,
            pid !== mainPid || tid !== mainTid ? getThreadName(info) : undefined
          ),
          ...cpuProfileToTraceProfileEvents(cpuProfile, {
            pid,
            tid,
          }),
          // have a random event at the end to hackfix broken view @Todo find real problem
          getRunTaskTraceEvent(pid, tid, {
            ts: (startTime ?? 0) + timeDeltas.reduce((ts, d) => ts + d) + 100,
            dur: 10,
          }),
        ];
      }),
    ],
  };

  return traceFile;
}
