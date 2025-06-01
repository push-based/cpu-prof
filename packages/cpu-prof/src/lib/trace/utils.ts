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
  getThreadNameTraceEvent,
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
    smosh?: SmoshType;
    startTracingInBrowser?: boolean;
  }
): TraceFile {
  if (cpuProfileInfos.length === 0) {
    throw new Error('No CPU profiles provided');
  }

  const { smosh = 'off', startTracingInBrowser = false } = options ?? {};

  // Use custom matcher if provided, otherwise use the default selection logic
  const mainProfileInfo = getMainProfileInfo(cpuProfileInfos);

  const { pid: mainPid, tid: mainTid, sequence = 0 } = mainProfileInfo;

  let allEvents: TraceEvent[] = [];

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

  const preparedProfiles = smoshCpuProfiles(cpuProfileInfos, {
    smosh,
    mainPid,
    mainTid,
  });

  allEvents = [
    ...allEvents,
    ...preparedProfiles.flatMap((profileInfo, index) => {
      const { cpuProfile, tid, pid, sequence } = profileInfo;
      return [
        getProcessNameTraceEvent(pid, tid, `P:${pid}, T:${tid}`),
        getThreadNameTraceEvent(pid, tid, `P:${pid}, T:${tid}`),
        ...cpuProfileToTraceProfileEvents(cpuProfile, {
          pid,
          tid,
          sequence: sequence ?? index,
        }),
      ];
    }),
  ];

  const sortedEvents = sortTraceEvents(allEvents);
  const cleanedEvents = cleanProfiningEvents(sortedEvents);

  return {
    metadata: getTraceMetadata(mainProfileInfo),
    traceEvents: cleanedEvents, // smoshing is now done on profiles
  } as TraceEventContainer;
}

export type SmoshType = 'all' | 'pid' | 'tid' | 'off';

export function smoshCpuProfiles(
  profileInfos: CpuProfileInfo[],
  options: {
    smosh: SmoshType;
    mainPid: number;
    mainTid: number;
  }
): CpuProfileInfo[] {
  const { smosh, mainPid, mainTid } = options;

  if (smosh === 'off' || smosh === undefined) {
    return profileInfos;
  }

  return profileInfos.map((profileInfo, index) => {
    if (smosh === 'pid') {
      return {
        ...profileInfo,
        pid: mainPid,
        tid: parseInt(profileInfo.pid + '0' + index), // Assign sequential tids based on pid
      };
    } else if (smosh === 'tid') {
      return {
        ...profileInfo,
        tid: mainTid,
      };
    }
    // 'all' case is handled by early return.
    return {
      ...profileInfo,
      pid: mainPid,
      tid: mainTid,
    };
  });
}

/**
 * It can happen that moltiple 'CpuProfiler::StartProfiling' and 'CpuProfiler::StopProfiling' events are present in the same profile.
 * This function will keep only the earliest and latest start and end profiling events per tid.
 *
 * @param traceEvents
 * @returns
 */
export function cleanProfiningEvents(traceEvents: TraceEvent[]): TraceEvent[] {
  const eventsByPidTid: Record<string, TraceEvent[]> = {};

  // Group events by pid and tid
  for (const event of traceEvents) {
    // pid and tid can be undefined for some meta events, those should be kept as is
    if (event.pid === undefined || event.tid === undefined) {
      const key = 'meta';
      if (!eventsByPidTid[key]) {
        eventsByPidTid[key] = [];
      }
      eventsByPidTid[key].push(event);
      continue;
    }
    const key = `${event.pid}-${event.tid}`;
    if (!eventsByPidTid[key]) {
      eventsByPidTid[key] = [];
    }
    eventsByPidTid[key].push(event);
  }

  const cleanedEvents: TraceEvent[] = [];

  for (const key in eventsByPidTid) {
    const groupEvents = eventsByPidTid[key];
    if (key === 'meta') {
      cleanedEvents.push(...groupEvents);
      continue;
    }

    const startProfilingEvents = groupEvents.filter(
      (e) => e.name === 'CpuProfiler::StartProfiling'
    );
    const stopProfilingEvents = groupEvents.filter(
      (e) => e.name === 'CpuProfiler::StopProfiling'
    );
    const profileEvents = groupEvents.filter((e) => e.name === 'Profile');
    const otherEvents = groupEvents.filter(
      (e) =>
        e.name !== 'CpuProfiler::StartProfiling' &&
        e.name !== 'CpuProfiler::StopProfiling' &&
        e.name !== 'Profile'
    );

    if (startProfilingEvents.length > 0) {
      const earliestStart = startProfilingEvents.reduce((prev, curr) =>
        prev.ts < curr.ts ? prev : curr
      );
      cleanedEvents.push(earliestStart);
    }

    // Keep only the first Profile event if multiple exist
    if (profileEvents.length > 0) {
      cleanedEvents.push(profileEvents[0]);
    }

    cleanedEvents.push(...otherEvents);

    if (stopProfilingEvents.length > 0) {
      const latestStop = stopProfilingEvents.reduce((prev, curr) =>
        prev.ts > curr.ts ? prev : curr
      );
      cleanedEvents.push(latestStop);
    }
  }
  // Sort events again as the order might have changed
  return sortTraceEvents(cleanedEvents);
}
