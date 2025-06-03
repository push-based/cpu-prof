export type CpuProfileNameOptions = {
  prefix?: string;
  pid?: number;
  tid?: number;
  date?: Date;
  extension?: string;
  seq?: number;
};

const cpuProfileSeqMap = new Map();

export type CpuProfileFileName =
  `${string}.${string}.${string}.${number}.${number}.${number}.cpuprofile}` | string;

/**
 * CPU profile filename pattern for validation and parsing
 */
const CPU_PROFILE_FILENAME_PATTERN =
  /^(?<prefix>[^.]+)\.(?<ymd>\d{8})\.(?<hms>\d{6})\.(?<pid>\d+)\.(?<tid>\d+)\.(?<seq>\d+)(?:\.(?<ext>.*))?$/;

/**
 * Type guard that validates and casts a string to CpuProfileFileName type.
 *
 * @param {string} filename - The filename to validate and cast
 * @returns {filename is CpuProfileFileName} True if the filename is a valid CPU profile name
 *
 * @example
 * const filename = 'CPU.20250510.134625.51430.1.001.cpuprofile';
 * if (isCpuProfileFileName(filename)) {
 *   // filename is now typed as CpuProfileFileName
 *   console.log(filename); // TypeScript knows this is a valid CPU profile filename
 * }
 */
export function isCpuProfileFileName(
  filename: string
): filename is CpuProfileFileName {
  if (!CPU_PROFILE_FILENAME_PATTERN.test(filename)) {
    return false;
  }
  return true;
}

// assert that the filename is a valid cpu profile filename
export function assertCpuProfileFileName(
  filename: string
): asserts filename is CpuProfileFileName {
  if (!isCpuProfileFileName(filename)) {
    throw new Error(`Invalid CPU profile filename: ${filename}`);
  }
}
/**
 * Generates a CPU profile filename like:
 * PREFIX.YYYYMMDD.HHMMSS.PID.TID.SEQ.cpuprofile
 */
export function getCpuProfileName(
  {
    prefix = 'CPU',
    pid,
    tid = 0,
    date = new Date(),
    extension = 'cpuprofile',
  }: CpuProfileNameOptions,
  sequenceMap = cpuProfileSeqMap
) {
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
  const cleanExtension = extension.startsWith('.')
    ? extension.slice(1)
    : extension;
   const preparedPrefix = prefix
       // Remove leading/trailing whitespace, replace spaces with dashes, and remove non-alphanumeric characters
       .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${preparedPrefix}.${datePart}.${timePart}.${pid}.${tid}.${seqPart}.${cleanExtension}`;
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
export function parseCpuProfileName(
  file: CpuProfileFileName
): Required<Omit<CpuProfileNameOptions, 'prefix' | 'extension'>> &
  Pick<CpuProfileNameOptions, 'prefix' | 'extension'> {
  const match = file.match(CPU_PROFILE_FILENAME_PATTERN);

  const {
    prefix,
    ymd,
    hms,
    pid = 1,
    tid = 0,
    seq,
    ext: extension = '',
  } = match?.groups ?? {};

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
    extension,
  };
}

export function microsecondsToDate(microseconds: number): Date {
  return new Date(microseconds / 1000);
}
