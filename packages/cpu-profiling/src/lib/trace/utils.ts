import { CPUProfile, CpuProfileInfo } from '../cpu/cpuprofile.types';
import {
  CpuProfilerStartProfilingEvent,
  ProfileEvent,
  ProfileChunkEvent,
  CpuProfilerStopProfilingEvent,
  TraceEvent,
  TraceFile,
  TraceEventContainer,
} from './traceprofile.types';
import {
  getCpuProfilerStartProfilingEvent,
  getProfileEvent,
  getProfileChunkEvent,
  getCpuProfilerStopProfilingEvent,
  getTraceMetadata,
  getStartTracing,
  getProcessNameTraceEvent,
} from './trace-event-creators';
import { getMainProfileInfo } from '../cpu/profile-selection';

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
  const id = `${pid}${tid}${sequence}`;

  return [
    getCpuProfilerStartProfilingEvent(pid, tid, startTime),
    getProfileEvent(pid, tid, startTime, id),
    getProfileChunkEvent(
      pid,
      tid,
      startTime,
      id,
      { nodes, samples },
      timeDeltas
    ),
    getCpuProfilerStopProfilingEvent(pid, tid, endTime),
  ];
}

export function sortTraceEvents(rawEvents: TraceEvent[]): TraceEvent[] {
  const metaOnly = rawEvents.filter((e) => e.ph === 'M');
  const eventsOnly = rawEvents.filter((e) => e.ph !== 'M');
  metaOnly.sort((a, b) => a.ts - b.ts);
  eventsOnly.sort((a, b) => a.ts - b.ts);
  return [...metaOnly, ...eventsOnly];
}

export function cpuProfilesToTraceFile(
  cpuProfileInfos: CpuProfileInfo[],
  options?: {
    smosh?: 'all' | 'pid' | 'tid' | 'none';
    startTracingInBrowser?: boolean;
  }
): TraceFile {
  if (cpuProfileInfos.length === 0) {
    throw new Error('No CPU profiles provided');
  }

  const { smosh = 'none', startTracingInBrowser } = options ?? {};

  // Use custom matcher if provided, otherwise use the default selection logic
  const mainProfileInfo = getMainProfileInfo(cpuProfileInfos);

  const { pid: mainPid, tid: mainTid, sequence = 0 } = mainProfileInfo;

  let allEvents: TraceEvent[] = [];

  // Add TracingStartedInBrowser event if requested
  if (startTracingInBrowser) {
    allEvents = [
      ...allEvents,
      getProcessNameTraceEvent(mainPid, mainTid, 'crRendererMain'),
      getStartTracing(mainPid, mainTid, {
        traceStartTs: 1,
        url: 'file:///merged-cpu-profile',
      }),
    ];
  }

  allEvents = [
    ...allEvents,
    ...cpuProfileInfos.flatMap((profileInfo, index) => {
      const { pid = mainPid, tid = mainTid + index, cpuProfile } = profileInfo;
      return cpuProfileToTraceProfileEvents(cpuProfile, {
        pid,
        tid,
        sequence: sequence + index,
      });
    }),
  ];

  const sortedEvents = sortTraceEvents(allEvents);
  const metadata = getTraceMetadata(mainProfileInfo);

  return {
    traceEvents:
      smosh === 'none'
        ? sortedEvents
        : smoshEvents(sortedEvents, {
            smosh,
            mainPid,
            mainTid,
          }),
    metadata,
  } as TraceEventContainer;
}

function smoshEvents(
  events: TraceEvent[],
  options?: {
    smosh: 'all' | 'pid' | 'tid' | 'none';
    mainPid: number;
    mainTid: number;
  }
): TraceEvent[] {
  const { smosh = 'none', mainPid = 1, mainTid = 0 } = options ?? {};
  // if smosh is all, return all events
  if (smosh === 'all') {
    return events.map((e) => {
      return {
        ...e,
        pid: mainPid,
        tid: mainTid,
      };
    });
  }
  // if smosh is pid, return events with pid === mainPid
  if (smosh === 'pid') {
    return events.map((e, idx) => {
      return {
        ...e,
        pid: mainPid,
        tid: idx, // scientific tid to avoid conflicts
      };
    });
  }
  // if smosh is tid, return events with tid === mainTid
  if (smosh === 'tid') {
    return events.map((e) => {
      return {
        ...e,
        tid: mainTid,
      };
    });
  }
  // if smosh is none, return all events
  return events;
}
