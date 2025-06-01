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

  const preparedProfiles = smoshCpuProfiles(cpuProfileInfos, {
    smosh,
    mainPid,
    mainTid,
  });

  allEvents = [
    ...allEvents,
    ...preparedProfiles.flatMap((profileInfo, index) => {
      // When smosh is 'pid', the tid is already adjusted by smoshCpuProfiles.
      // We need to ensure that the tid used here is the one from preparedProfiles.
      // For other smosh types, or if pid/tid are not set in profileInfo, we fallback to mainPid/mainTid + index.
      const pidToUse =
        profileInfo.pid !== undefined ? profileInfo.pid : mainPid;
      const tidToUse =
        profileInfo.tid !== undefined ? profileInfo.tid : mainTid + index;
      const { cpuProfile } = profileInfo;
      return cpuProfileToTraceProfileEvents(cpuProfile, {
        pid: pidToUse,
        tid: tidToUse,
        sequence: sequence + index,
      });
    }),
  ];

  const sortedEvents = sortTraceEvents(allEvents);
  const metadata = getTraceMetadata(mainProfileInfo);

  return {
    traceEvents: sortedEvents, // smoshing is now done on profiles
    metadata,
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

  if (smosh === 'off') {
    return profileInfos.map((profileInfo) => ({
      pid: profileInfo.pid,
      tid: profileInfo.tid,
      cpuProfile: profileInfo.cpuProfile,
    }));
  }

  return profileInfos.map((profileInfo, index) => {
    const { cpuProfile } = profileInfo;
    // Initialize with original pid/tid, these act as defaults if not overwritten by a specific smosh type.
    const smoshedProfile: CpuProfileInfo = {
      pid: profileInfo.pid,
      tid: profileInfo.tid,
      cpuProfile,
    };

    if (smosh === 'all') {
      smoshedProfile.pid = mainPid;
      smoshedProfile.tid = mainTid;
    } else if (smosh === 'pid') {
      smoshedProfile.pid = mainPid;
      // Use the original tid from profileInfo plus the index (as per last working version)
      smoshedProfile.tid = profileInfo.tid + index;
    } else if (smosh === 'tid') {
      // pid is already profileInfo.pid from initialization
      smoshedProfile.tid = mainTid;
    }
    // 'off' case is handled by early return.
    // 'all', 'pid', 'tid' are the only remaining SmoshType values.
    return smoshedProfile;
  });
}
