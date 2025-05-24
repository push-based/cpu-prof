import fs from 'fs';
import path from 'path';
import type { FileInfo } from '../lib/file-utils';

/**
 * Find the newest trace file in a directory (CLI-specific logic)
 */
export function findNewestTraceFile(
  directory: string = './packages/cpu-profiling/mocks/fixtures/'
): string {
  try {
    const files: FileInfo[] = fs
      .readdirSync(directory)
      .filter((file: string) => file.endsWith('.json'))
      .map((file: string) => ({
        name: file,
        path: path.join(directory, file),
        mtime: fs.statSync(path.join(directory, file)).mtime,
      }))
      .sort(
        (a: FileInfo, b: FileInfo) => b.mtime.getTime() - a.mtime.getTime()
      ); // Newest first

    if (files.length === 0) {
      throw new Error(`No .json files found in ${directory}`);
    }

    return files[0].path;
  } catch (error) {
    throw new Error(
      `Error reading directory ${directory}: ${(error as Error).message}`
    );
  }
}

/**
 * Generate output filename with suffix (CLI naming convention)
 */
export function generateOutputFilename(
  inputFile: string,
  suffix: string = '.reduced'
): string {
  return inputFile.replace('.json', `${suffix}.json`);
}
