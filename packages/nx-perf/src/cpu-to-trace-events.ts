import {CpuProfile, CpuProfileInfo} from "./cpuprofile.types";
import {Metadata, TraceEvent, TraceFile} from "./traceprofile.types";
import {basename} from "node:path";

export function cpuProfileToTraceProfileEvents(cpuProfile: CpuProfile, opt: {
    pid: number;
    tid: number;
    sequence?: number;
}): TraceEvent[] {
    const {pid, tid, sequence = 0} = opt;
    const {startTime = 1, nodes, timeDeltas, samples} = cpuProfile;
    // we need a unique id to connect profile chunks
    const id = `${pid}${tid}${sequence}`;

    return [
        {
            cat: "disabled-by-default-v8.cpu_profiler",
            id: `0x${id}`,
            name: "Profile",
            ph: "P",
            pid,
            tid,
            // can't be 0 as the minimap needs the event timing
            ts: startTime,
            args: {
                data: {
                    startTime
                }
            },
        },
        {
            cat: 'disabled-by-default-v8.cpu_profiler',
            name: "ProfileChunk",
            id: `0x${id}`,
            ph: 'P',
            pid,
            tid,
            ts: 0,
            args: {
                data: {
                    cpuProfile: {
                        nodes,
                        samples
                    },
                    timeDeltas,
                }
            }
        }
    ]
}

export function getThreadNameTraceEvent(pid: number, tid: number, name = "CrRendererMain"): TraceEvent {
    return {
        cat: '__metadata',
        name: 'thread_name',
        ph: 'M',
        pid,
        tid,
        ts: 0,
        args: {
            ...(name !== undefined ? {name} : {}),
        }
    };
}

export function getProcessNameTraceEvent(pid: number, tid: number, name?: string): TraceEvent {
    return {
        cat: '__metadata',
        name: 'process_name',
        ph: 'M',
        pid,
        tid,
        ts: 0,
        args: {
            ...(name !== undefined ? {name} : {name: ''}),
        }
    };
}

export function getRunTaskTraceEvent(pid: number, tid: number, opt: {
    ts: number,
    dur: number
}): TraceEvent {
    const {ts, dur} = opt;
    return {
        args: {},
        cat: "disabled-by-default-devtools.timeline",
        dur,
        name: "RunTask",
        ph: "X",
        pid,
        tid,
        ts
    };
}

export function getStartTracing(pid: number, tid: number, opt: {
    traceStartTs: number
    frameTreeNodeId?: number
    url: string
}): TraceEvent {
    const {
        traceStartTs,
        frameTreeNodeId = 1,
        url
    } = opt;
    return {
        cat: 'disabled-by-default-devtools.timeline',
        name: 'TracingStartedInBrowser',
        ph: 'I',
        pid,
        tid,
        ts: traceStartTs,
        s: 't',
        args: {
            data: {
                frameTreeNodeId,
                frames: [{
                    frame: `frame-${frameTreeNodeId}`,
                    isInPrimaryMainFrame: true,
                    isOutermostMainFrame: true,
                    name: '',
                    processId: pid,
                    url,
                }],
                persistentIds: true
            }
        }
    };
}

export function getThreadName(info: CpuProfileInfo): string {
    const {sourceFilePath, execArgs} = info;
    return `${basename(sourceFilePath ?? '')} ${execArgs?.join(' ')}`;
}

export function getTraceMetadata(info?: CpuProfileInfo): Metadata {
    const {startDate} = info ?? {};
    return {
        source: 'DevTools',
        startTime: startDate?.toISOString() ?? new Date().toISOString(),
        hardwareConcurrency: 1,
        dataOrigin: 'TraceEvents'
    };
}
export function getMainProfileInfo(cpuProfileInfos: CpuProfileInfo[]): CpuProfileInfo {
    if (cpuProfileInfos.length === 0) {
        throw new Error('No CPU profiles provided');
    }

    return cpuProfileInfos.reduce((best, current) => {
        if (current.pid < best.pid) {
            return current;
        }

        if (current.pid === best.pid && current.tid < best.tid) {
            return current;
        }

        return best;
    });
}

/**
 * Wraps a V8 CPU profile into a Trace Event-Format JSON,
 * and injects minimal timeline events for DevTools
 **/
export function cpuProfilesToTraceFile(cpuProfileInfos: CpuProfileInfo[]) {
    const mainProfileInfo = getMainProfileInfo(cpuProfileInfos);
    const {
        pid: mainPid,
        tid: mainTid,
        sequence = 0
    } = mainProfileInfo;

    const traceFile: TraceFile = {
        metadata: getTraceMetadata(mainProfileInfo),
        traceEvents: [
            getProcessNameTraceEvent(mainPid, mainTid),
            getStartTracing(mainPid, mainTid, {
                traceStartTs: mainProfileInfo.cpuProfile.startTime ?? 0,
                // has to be valid URL
                url: `file://${getThreadName({...mainProfileInfo, sourceFilePath: ''})}`,
                frameTreeNodeId: sequence
            }),
            ...cpuProfileInfos.flatMap((info) => {
                const {cpuProfile, pid, tid} = info;
                return [
                    getThreadNameTraceEvent(pid, tid, pid !== mainPid || tid !== mainTid ? getThreadName(info) : undefined),
                    ...cpuProfileToTraceProfileEvents(cpuProfile, {
                        pid,
                        tid
                    }),
                    getRunTaskTraceEvent(pid, tid, {
                        ts: (cpuProfile.startTime ?? 0) + cpuProfile.timeDeltas.reduce((ts, d) => ts + d) + 100,
                        dur: 10
                    })
                ]
            })
        ]
    }

    return traceFile;
}

