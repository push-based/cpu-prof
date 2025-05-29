import { basename } from 'path';
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
  getThreadNameTraceEvent,
  getProcessNameTraceEvent,
  getThreadName,
  getTraceMetadata,
} from './trace-event-creators';

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
  options?: { mainProfileMatcher?: (info: CpuProfileInfo) => boolean }
): TraceFile {
  if (cpuProfileInfos.length === 0) {
    throw new Error('No CPU profiles provided');
  }

  const mainProfileInfo = getMainProfileInfo(
    cpuProfileInfos,
    options?.mainProfileMatcher
  );
  const { pid: mainPid, tid: mainTid, sequence = 0 } = mainProfileInfo;

  const allEvents: TraceEvent[] = [];

  // Add metadata events
  allEvents.push(
    getProcessNameTraceEvent(mainPid, mainTid, 'CPU Profile'),
    getThreadNameTraceEvent(mainPid, mainTid, getThreadName(mainProfileInfo))
  );

  // Process each profile
  cpuProfileInfos.forEach((profileInfo, index) => {
    const { pid = mainPid, tid = mainTid + index, cpuProfile } = profileInfo;
    const events = cpuProfileToTraceProfileEvents(cpuProfile, {
      pid,
      tid,
      sequence: sequence + index,
    });
    allEvents.push(...events);

    // Add thread name for each profile
    if (index > 0) {
      allEvents.push(
        getThreadNameTraceEvent(pid, tid, getThreadName(profileInfo))
      );
    }
  });

  const sortedEvents = sortTraceEvents(allEvents);
  const metadata = getTraceMetadata(mainProfileInfo);

  return {
    traceEvents: sortedEvents,
    metadata,
  } as TraceEventContainer;
}

function getMainProfileInfo(
  cpuProfileInfos: CpuProfileInfo[],
  mainProfileMatcher?: (info: CpuProfileInfo) => boolean
): CpuProfileInfo {
  if (mainProfileMatcher) {
    const mainProfile = cpuProfileInfos.find(mainProfileMatcher);
    if (mainProfile) {
      return mainProfile;
    }
  }

  // Default to first profile
  return cpuProfileInfos[0];
}
