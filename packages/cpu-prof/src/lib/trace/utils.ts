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
} from './trace-event-creators';
import { getSmallestPidTidProfileInfo } from '../cpu/profile-selection';
import {decodeCmd} from "../utils/encode-command-data";

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
  const mainProfileInfo = getSmallestPidTidProfileInfo(cpuProfileInfos);

  const { pid: mainPid, tid: mainTid } = mainProfileInfo;

  let allEvents: TraceEvent[] = [];

  if (startTracingInBrowser) {
    // const url =  'about:blank';
    const url = mainProfileInfo?.prefix === 'CPU' ? 'cpu:profile' : 'cpu: '+ decodeCmd((mainProfileInfo?.prefix ?? '')?.replace('MAIN-CPU--', ''));
    const startTime = mainProfileInfo.cpuProfile.startTime;
    allEvents = [
      getThreadNameTraceEvent(mainPid, mainTid, 'CrRendererMain'),
      getCommitLoadTraceEvent({
        pid: mainPid,
        tid: mainTid,
        ts: startTime - 10,
        url,
      }),
      getStartTracing(mainPid, mainTid, {
        traceStartTs: startTime - 10,
        url,
      }),
      ...allEvents,
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
        //  getProcessNameTraceEvent(pid, tid, `P:${pid}, T:${tid}`),
        //  getThreadNameTraceEvent(pid, tid, `P:${pid}, T:${tid}`),
        ...cpuProfileToTraceProfileEvents(cpuProfile, {
          pid,
          tid,
          sequence: sequence ?? index,
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
        tid: index, // Assign sequential tids based on index
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
