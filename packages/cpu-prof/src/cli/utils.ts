import fs from 'fs';
import path from 'path';
import type { FileInfo } from '../lib/file-utils';

/**
 * Find the newest trace file in a directory (CLI-specific logic)
 */
export function findNewestTraceFile(
  directory: string = './packages/cpu-prof/mocks/fixtures/'
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

/**
 * Helper function to coerce string array arguments from CLI input
 */
export function coerceStringArray(
  arg: string[] | string | boolean
): string[] | undefined {
  if (arg === false || arg === undefined) {
    return undefined;
  }
  if (typeof arg === 'string') {
    return arg.split(',').map((item: string) => item.trim());
  }
  if (Array.isArray(arg)) {
    return arg.flatMap((item: string) =>
      item.split(',').map((s: string) => s.trim())
    );
  }
  return undefined;
}

/**
 * Helper function to coerce number array arguments from CLI input
 */
export function coerceNumberArray(
  arg: string[] | string | boolean,
  type: 'PID' | 'TID'
): number[] | undefined {
  if (arg === false || arg === undefined) {
    return undefined;
  }
  const values =
    typeof arg === 'string'
      ? arg.split(',')
      : Array.isArray(arg)
      ? arg.flatMap((item: string) => item.split(','))
      : [];
  return values.map((id: string) => {
    const numId = parseInt(id.trim(), 10);
    if (isNaN(numId)) {
      throw new Error(`Invalid ${type}: ${id}. ${type}s must be numbers.`);
    }
    return numId;
  });
}

/**
 * Helper function to coerce string array arguments with default values
 */
export function coerceStringArrayWithDefaults(
  arg: string[] | string | boolean,
  defaults: string[] = []
): string[] {
  // Handle yargs negation (--no-exclude-*)
  if (arg === false || arg === undefined) {
    return [];
  }

  if (typeof arg === 'string') {
    const userValues = arg.split(',').map((item: string) => item.trim());
    return [...new Set([...defaults, ...userValues])];
  }
  if (Array.isArray(arg)) {
    const userValues = arg.flatMap((item: string) =>
      item.split(',').map((s: string) => s.trim())
    );
    return [...new Set([...defaults, ...userValues])];
  }
  return defaults;
}
