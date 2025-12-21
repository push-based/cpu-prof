import { type Options, bundleRequire } from 'bundle-require';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { statSync } from 'node:fs';

import path from 'node:path';
import { logger } from './logger.js';
import { settlePromise } from './promises.js';

export function fileExistsSync(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export function directoryExistsSync(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return buffer.toString();
}

export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const text = await readTextFile(filePath);
  return JSON.parse(text) as T;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function directoryExists(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDirectoryExists(baseDir: string) {
  try {
    await mkdir(baseDir, { recursive: true });
    return;
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException;
    logger.warn(fsError.message);
    if (fsError.code !== 'EEXIST') {
      throw error;
    }
  }
}

export async function removeDirectoryIfExists(dir: string) {
  if (await directoryExists(dir)) {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function importModule<T = unknown>(options: Options): Promise<T> {
  const resolvedStats = await settlePromise(stat(options.filepath));
  if (resolvedStats.status === 'rejected') {
    throw new Error(`File '${options.filepath}' does not exist`);
  }
  if (!resolvedStats.value.isFile()) {
    throw new Error(`Expected '${options.filepath}' to be a file`);
  }

  const { mod } = await bundleRequire<object>(options);

  if (typeof mod === 'object' && 'default' in mod) {
    return mod.default as T;
  }
  return mod as T;
}

type SplitFilePath = {
  folders: string[];
  file: string;
};

export function splitFilePath(filePath: string): SplitFilePath {
  const file = path.basename(filePath);
  const folders: string[] = [];
  // eslint-disable-next-line functional/no-loop-statements
  for (
    // eslint-disable-next-line functional/no-let
    let dirPath = path.dirname(filePath);
    path.dirname(dirPath) !== dirPath;
    dirPath = path.dirname(dirPath)
  ) {
    // eslint-disable-next-line functional/immutable-data
    folders.unshift(path.basename(dirPath));
  }
  return { folders, file };
}
