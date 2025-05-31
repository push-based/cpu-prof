import { readFile } from 'fs/promises';
import { basename } from 'node:path';
import { CPUProfile, CpuProfileInfo } from './cpuprofile.types';
import { parseCpuProfileName, type CpuProfileFileName } from './utils';

export type CpuProfileFilePath = `${string}/${CpuProfileFileName}`;

export async function loadCpuProfiles(
  filePaths: CpuProfileFilePath[]
): Promise<CpuProfileInfo[]> {
  return Promise.all(
    filePaths.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const cpuProfile = JSON.parse(content) as CPUProfile;
      const cpuProfileName = basename(file) as CpuProfileFileName;
      return { cpuProfile, ...parseCpuProfileName(cpuProfileName) };
    })
  );
}
