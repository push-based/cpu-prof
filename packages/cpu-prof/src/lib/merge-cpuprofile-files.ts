import { writeFile } from 'fs/promises';
import { join } from 'path';
import { CpuProfileInfo } from './cpu/cpuprofile.types';
import { cpuProfilesToTraceFile } from './trace/utils';
import { dirname } from 'node:path';
import { isCpuProfileFileName } from './cpu/utils';
import { readdir } from 'fs/promises';
import { isDirectory, ensureDirectoryExists } from './file-utils';
import {
  loadCpuProfiles,
  type CpuProfileFilePath,
} from './cpu/load-cpu-profiles';

export async function mergeCpuProfileFiles(
  sourceDir: string,
  outputFile: string,
  options: {
    smosh?: 'all' | 'pid' | 'tid' | 'off';
    startTracingInBrowser?: boolean;
  } = {}
): Promise<void> {
  const filesInDir: string[] = await readdir(sourceDir);

  const filesToProcess: CpuProfileFilePath[] = filesInDir
    .filter((file) => {
      const filePath = join(sourceDir, file);
      if (isDirectory(filePath) || !isCpuProfileFileName(file)) {
        return false;
      }
      return true;
    })
    .map((file) => join(sourceDir, file) as CpuProfileFilePath);

  if (filesToProcess.length === 0) {
    throw new Error(
      `No valid CPU profiles found in ${sourceDir} to merge (after excluding output file and/or previous merged files).`
    );
  }
  const profiles: CpuProfileInfo[] = await loadCpuProfiles(filesToProcess);

  const output = cpuProfilesToTraceFile(profiles, options);
  await ensureDirectoryExists(dirname(outputFile));
  await writeFile(outputFile, JSON.stringify(output, null, 2));
}
