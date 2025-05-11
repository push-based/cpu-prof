import SampleMapper from './sample-mapper';
import StackFrameMapper, { StackFrame } from './stackframe-mapper';
import getCategorizer from './get-categorizer';

interface CpuProfile {
    head: {
        id: number;
        functionName: string;
        url?: string;
        lineNumber?: number;
        children: any[];
    };
    startTime: string | number;
    endTime: string | number;
    samples: number[];
    title?: string;
}

interface TraceViewifyOptions {
    pid?: number;
    tid?: number;
    cpu?: number;
}

interface TraceViewifyResult {
    traceEvents: any[];
    stackFrames: { [key: number]: StackFrame };
    samples: any[];
}

function safeString(s: string | undefined | null, alternative: string): string {
    return (s && s.trim().length && s) || alternative;
}

function increaseIds(stackFrames: { [key: number]: StackFrame }): { [key: number]: StackFrame } {
    // workaround:  https://github.com/google/trace-viewer/issues/734
    //              StackFrames with id=0 cause starburst errors
    const result: { [key: number]: StackFrame } = {};
    const keys = Object.keys(stackFrames).map(k => parseInt(k));

    for (let i = keys.length - 1; i >= 0; i--) {
        const k = keys[i];
        const val = stackFrames[k];
        // todo: not sure why parent is null instead of not present
        if (typeof val.parent !== 'undefined') {
            val.parent++;
        }
        result[k + 1] = val;
    }
    return result;
}

/**
 * Converts given cpuprofile object to a trace viewer JSON object.
 *
 * @param cpuprofile - as produced by Chrome DevTools or cpuprofilify
 * @param opts - optional configuration
 * @param opts.pid - sets process id
 * @param opts.tid - sets thread id
 * @param opts.cpu - sets CPU number
 * @returns trace viewer JSON object
 */
export function traceviewify(cpuprofile: CpuProfile, opts: TraceViewifyOptions = {}): TraceViewifyResult {
    const stackFrames = new StackFrameMapper(cpuprofile.head, getCategorizer(cpuprofile)).map();
    const mapped = new SampleMapper(
        stackFrames,
        parseFloat(String(cpuprofile.startTime)) * 1000000.0,
        parseFloat(String(cpuprofile.endTime)) * 1000000.0,
        cpuprofile.samples,
        cpuprofile.title || 'CPU',
        opts.pid || 0,
        opts.tid || 0,
        opts.cpu || 0
    ).map();

    return {
        traceEvents: mapped.events,
        stackFrames: increaseIds(stackFrames),
        samples: mapped.samples
    };
}

export default traceviewify; 