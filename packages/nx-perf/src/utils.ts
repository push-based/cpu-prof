export interface CpuProfileNameOptions {
    prefix?: string;
    pid: number;
    tid?: number;
    date?: Date;
    extension?: string;
}

// 📦 Sequence tracker for each (PID + TID) combo
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
 * // info = {
 * //   prefix: 'CPU',
 * //   pid: 51430,
 * //   tid: 1,
 * //   seq: 1,
 * //   date: Date('2025-05-10T13:46:25'),
 * //   extension: 'cpuprofile',
 * //   isMain: true
 * // }
 */
export function parseCpuProfileName(file: string): CpuProfileNameOptions & {
    isMain: boolean;
    date: Date;
    seq: number;
} {
    const pattern = /^(?<prefix>[^.]+)\.(?<ymd>\d{8})\.(?<hms>\d{6})\.(?<pid>\d+)\.(?<tid>\d+)\.(?<seq>\d+)\.(?<ext>[^.]+)$/;
    const match = file.match(pattern);
    if (!match?.groups) {
        throw new Error(`Invalid CPU profile filename: ${file}`);
    }

    const { prefix, ymd, hms, pid, tid, seq, ext: extension } = match.groups;
    const year = +ymd.slice(0, 4);
    const month = +ymd.slice(4, 6) - 1;
    const day = +ymd.slice(6, 8);
    const hours = +hms.slice(0, 2);
    const minutes = +hms.slice(2, 4);
    const seconds = +hms.slice(4, 6);

    return {
        prefix,
        pid: +pid,
        tid: +tid,
        seq: +seq,
        date: new Date(year, month, day, hours, minutes, seconds),
        extension,
        isMain: +seq === 1,
    };
}

