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
  getThreadNameTraceEvent,
  getCommitLoadTraceEvent,
  getProcessNameTraceEvent,
} from './trace-event-creators';
import { getSmallestPidTidProfileInfo } from '../cpu/profile-selection';
import { decodeCmd } from '../utils/encode-command-data';

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
  const { pid, tid } = opt;
  const { startTime = 1, endTime, nodes, timeDeltas, samples } = cpuProfile;
  const id = `${pid}${tid}`;

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

function getTracingEvents(mainProfileInfo: CpuProfileInfo): TraceEvent[] {
  const { pid, tid, prefix } = mainProfileInfo;
  const url = prefix?.startsWith('MAIN-CPU--')
    ? 'cpu: ' + decodeCmd((prefix ?? '')?.replace('MAIN-CPU--', ''))
    : `Process: pid:${pid}`;
  const startTime = mainProfileInfo.cpuProfile.startTime;
  return [
    // @TODO: Document how thread name CrRendererMain and CommitLoadTrace Event works
    getThreadNameTraceEvent(pid, tid, 'CrRendererMain'),
    getCommitLoadTraceEvent({
      pid,
      tid,
      // @TODO: Check if + 1 is still needed here
      ts: startTime - 1,
      url,
    }),
    getStartTracing(pid, tid, {
      // @TODO: Check if + 1 is still needed here
      traceStartTs: startTime - 1,
      url,
    }),
  ];
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

  const mainProfileInfo = getSmallestPidTidProfileInfo(cpuProfileInfos);

  const { pid: mainPid, tid: mainTid } = mainProfileInfo;

  let allEvents: TraceEvent[] = [];

  const preparedProfiles = smoshCpuProfiles(cpuProfileInfos, {
    smosh,
    mainPid,
    mainTid,
  });

  allEvents = [
    ...allEvents,
    ...preparedProfiles.flatMap((profileInfo, idx) => {
      const { cpuProfile, tid, pid, sequence } = profileInfo;
      const isMainProfile = pid === mainPid && tid === mainTid;

      // PID and TID are different after smoshing, so we need to use the original profileInfo
      const unSmoshedProfile = cpuProfileInfos.at(idx);
      // child processes always have tid > 0
      const workerThreadName = `WorkerThread: pid:${unSmoshedProfile?.pid}, tid:${unSmoshedProfile?.tid}`;
      // child processes always have tid 0
      const childProcessName = `ChildProcess: pid:${unSmoshedProfile?.pid}`;
      const threadName =
        unSmoshedProfile?.tid !== 0 ? workerThreadName : childProcessName;

      return [
        getProcessNameTraceEvent(pid, tid, threadName),
        getThreadNameTraceEvent(pid, tid, threadName),
        // this colors the lanes like we are used to from Browser recordings
        ...(startTracingInBrowser && isMainProfile
          ? getTracingEvents(profileInfo)
          : []),
        ...cpuProfileToTraceProfileEvents(cpuProfile, {
          pid,
          tid,
          sequence: sequence ?? idx,
        }),
      ];
    }),
  ];

  const sortedEvents = sortTraceEvents(allEvents);

  return {
    metadata: getTraceMetadata(mainProfileInfo),
    traceEvents: sortedEvents, // smoshing is now done on profiles
  } as TraceEventContainer;
}

export type SmoshType = 'pid' | 'off';

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
    const isMainProfile =
      profileInfo.pid === mainPid && profileInfo.tid === mainTid;
    return {
      ...profileInfo,
      pid: mainPid,
      // Main profile keeps its original tid (always 0), others get sequential tids.
      tid: isMainProfile ? mainTid : index + 1,
    };
  });
}
