import {exec} from 'child_process';
import {mkdir, rm} from 'fs/promises';
import {promisify} from 'util';
import {TraceEvent} from "./traceprofile.types";

const execAsync = promisify(exec);

export type CpuProfileNameOptions = {
    prefix?: string;
    pid?: number;
    tid?: number;
    date?: Date;
    extension?: string;
    seq?: number;
}

const cpuProfileSeqMap = new Map();

/**
 * Generates a CPU profile filename like:
 * PREFIX.YYYYMMDD.HHMMSS.PID.TID.SEQ.cpuprofile
 */
export function getCpuProfileName({
                                      prefix = 'CPU',
                                      pid,
                                      tid = 0,
                                      date = new Date(),
                                      extension = 'cpuprofile'
                                  }: CpuProfileNameOptions, sequenceMap = cpuProfileSeqMap) {
    const pad = (n: number, width = 2) => String(n).padStart(width, '0');

    // Build date/time segments
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    const datePart = `${year}${month}${day}`;
    const timePart = `${hours}${minutes}${seconds}`;

    // Get and increment the sequence for this PID-TID
    const key = `${pid}-${tid}`;
    const currentSeq = sequenceMap.get(key) || 0;
    const nextSeq = currentSeq + 1;
    sequenceMap.set(key, nextSeq);
    const seqPart = pad(nextSeq, 3);

    // Remove leading dot from extension if present
    const cleanExtension = extension.startsWith('.') ? extension.slice(1) : extension;

    return `${prefix}.${datePart}.${timePart}.${pid}.${tid}.${seqPart}.${cleanExtension}`;
}

/**
 * Parses a CPU profile filename and extracts its components.
 *
 * @param {string} file - Filename in the format:
 *   {prefix}.{YYYYMMDD}.{HHMMSS}.{pid}.{tid}.{seq}.{extension}
 * @returns {object} Parsed details including:
 *   prefix, pid, tid, seq, date (Date object), extension, isMain
 * @throws {Error} If the filename doesn't match the expected pattern.
 *
 * @example
 * const info = parseCpuProfileName('CPU.20250510.134625.51430.1.1.cpuprofile');
 *  info = {
 *    prefix: 'CPU',
 *    pid: 51430,
 *    tid: 1,
 *    seq: 1,
 *    date: Date('2025-05-10T13:46:25'),
 *    extension: 'cpuprofile',
 *    isMain: true
 *  }
 */
export function parseCpuProfileName(file: string): Required<Omit<CpuProfileNameOptions, 'prefix' | 'extension'>> & Pick<CpuProfileNameOptions, 'prefix' | 'extension'> {
    const pattern = /^(?<prefix>[^.]+)\.(?<ymd>\d{8})\.(?<hms>\d{6})\.(?<pid>\d+)\.(?<tid>\d+)\.(?<seq>\d+)(?:\.(?<ext>.*))?$/;
    const match = file.match(pattern);
    if (!match?.groups) {
        throw new Error(`Invalid CPU profile filename: ${file}`);
    }

    const {prefix, ymd, hms, pid = 0, tid = 0, seq, ext: extension = ''} = match.groups;

    const year = +ymd.slice(0, 4);
    const month = +ymd.slice(4, 6) - 1;
    const day = +ymd.slice(6, 8);
    const hours = +hms.slice(0, 2);
    const minutes = +hms.slice(2, 4);
    const seconds = +hms.slice(4, 6);

    return {
        prefix,
        pid: Number(pid),
        tid: Number(tid),
        seq: Number(seq),
        date: new Date(year, month, day, hours, minutes, seconds),
        extension
    };
}

export interface CpuProfOptions {
    /** Enable the V8 CPU profiler */
    enabled?: boolean; // default: true

    /** Directory to write .cpuprofile files */
    dir?: string;

    /** Filename pattern (supports %P, %T, %D, %H) */
    name?: string;

    /** Sampling interval in microseconds (default: 1000) */
    interval?: number;
}

export interface ExecWithCpuProfConfig {
    scriptPath: string;
    outputDir: string;
    timeoutMs?: number;
    cpuProfOptions?: CpuProfOptions;
    sampleProfInterval?: string;
}

export async function execWithCpuProf(config: ExecWithCpuProfConfig): Promise<{ stdout: string; stderr: string }> {
    const {
        scriptPath,
        outputDir,
        timeoutMs = 5000,
        cpuProfOptions = {},
        sampleProfInterval
    } = config;

    const {
        enabled = true,
        interval = 1000,
        dir = outputDir,
        name
    } = cpuProfOptions;

    // Prepare output directory
    await rm(dir, {recursive: true, force: true});
    await mkdir(dir, {recursive: true});

    // Build profiling flags
    const profFlags: string[] = [];

    if (enabled) {
        profFlags.push('--cpu-prof');
        if (interval) profFlags.push(`--cpu-prof-interval=${interval}`);
        if (dir) profFlags.push(`--cpu-prof-dir="${dir}"`);
        if (name) profFlags.push(`--cpu-prof-name="${name}"`);
    }

    if (sampleProfInterval) {
        profFlags.push(`--sample-prof-interval=${sampleProfInterval}`);
    }

    const command = `node ${profFlags.join(' ')} "${scriptPath}"`;

    try {
        const result = await execAsync(command, (timeoutMs ? {timeout: timeoutMs} : {}));
        return result;
    } catch (error: any) {
        throw new Error(`CPU profile execution failed: ${error.message || error}`);
    }
}

export function microsecondsToDate(microseconds: number): Date {
    return new Date(microseconds / 1000);
}

export function sortTraceEvents(rawEvents: TraceEvent[]): TraceEvent[] {
    const metaOnly = rawEvents.filter(e => e.ph === 'M');
    const eventsOnly = rawEvents.filter(e => e.ph !== 'M');
    metaOnly.sort((a, b) => a.ts - b.ts);
    eventsOnly.sort((a, b) => a.ts - b.ts);
    return [...metaOnly, ...eventsOnly];
}
