import { readdir, readFile } from 'fs/promises';
import { basename } from 'node:path';
import { CPUProfile, CpuProfileInfo } from './cpuprofile.types';
import {
  parseCpuProfileName,
  type CpuProfileFileName,
  isCpuProfileFileName,
} from './utils';
import { join } from 'path';
import { isDirectory } from '../file-utils';

export type CpuProfileFilePath = `${string}/${CpuProfileFileName}`;

export async function loadCpuProfiles(
  sourceDir: string
): Promise<CpuProfileInfo[]> {
  const filesInDir: string[] = await readdir(sourceDir);

  const filePaths: CpuProfileFilePath[] = filesInDir
    .filter((file) => {
      const filePath = join(sourceDir, file);
      if (isDirectory(filePath) || !isCpuProfileFileName(file)) {
        return false;
      }
      return true;
    })
    .map((file) => join(sourceDir, file) as CpuProfileFilePath);

  return Promise.all(
    filePaths.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const cpuProfile = JSON.parse(content) as CPUProfile;
      const cpuProfileName = basename(file) as CpuProfileFileName;
      return { cpuProfile, file, ...parseCpuProfileName(cpuProfileName) };
    })
  );
}
