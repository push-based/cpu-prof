import fs from 'node:fs';
import path, { join } from 'node:path';

export type FileInfo = {
  name: string;
  path: string;
  mtime: Date;
};

/**
 * Generate output filename with suffix
 * @example
 * generateOutputFilename('input.json', '.reduced') // 'input.reduced.json'
 * generateOutputFilename('input.json') // 'input.reduced.json'
 */
export function generateOutputFilename(
  inputFile: string,
  suffix = '.reduced'
): string {
  return inputFile.replace('.json', `${suffix}.json`);
}

/**
 * Find the newest file with a specific extension in a directory
 * @param directory - Directory to search in
 * @param extension - File extension to filter by (e.g., '.json', '.cpuprofile')
 * @returns Path to the newest file
 * @throws Error if no files found or directory cannot be read
 */
export function findNewestFile(directory: string, extension: string): string {
  try {
    const files: FileInfo[] = fs
      .readdirSync(directory)
      .filter((file: string) => file.endsWith(extension))
      .map((file: string) => ({
        name: file,
        path: path.join(directory, file),
        mtime: fs.statSync(path.join(directory, file)).mtime,
      }))
      .sort(
        (a: FileInfo, b: FileInfo) => b.mtime.getTime() - a.mtime.getTime()
      ); // Newest first

    if (files.length === 0) {
      throw new Error(`No ${extension} files found in ${directory}`);
    }

    return files[0].path;
  } catch (error) {
    throw new Error(
      `Error reading directory ${directory}: ${(error as Error).message}`
    );
  }
}

/**
 * Find the newest trace file in the default profiling directory
 * Uses the standard CLI profiling folder: `{cwd}/profiles`
 * @param directory - Optional custom directory. Defaults to `{cwd}/profiles`
 * @returns Path to the newest trace file
 * @throws Error if no trace files found or directory cannot be read
 */
export function findNewestTraceFile(
  directory = join(process.cwd(), 'profiles')
): string {
  return findNewestFile(directory, '.json');
}
