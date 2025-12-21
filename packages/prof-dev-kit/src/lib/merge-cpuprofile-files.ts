import { writeFile } from 'node:fs/promises';
import { CpuProfileInfo } from './cpu/cpuprofile.types';
import { cpuProfilesToTraceFile, type SmoshType } from './trace/utils.js';
import { dirname } from 'node:path';
import { ensureDirectoryExists } from './utils/file-system.js';
import { loadCpuProfiles } from './cpu/load-cpu-profiles.js';

export async function mergeCpuProfileFiles(
  sourceDir: string,
  outputFile: string,
  options: {
    smosh?: SmoshType;
    startTracingInBrowser?: boolean;
  } = {}
): Promise<void> {
  const profiles: CpuProfileInfo[] = await loadCpuProfiles(sourceDir);
  if (profiles.length === 0) {
    throw new Error(
      `No valid CPU profiles found in ${sourceDir} to merge (after excluding output file and/or previous merged files).`
    );
  }

  const output = cpuProfilesToTraceFile(profiles, options);
  await ensureDirectoryExists(dirname(outputFile));
  await writeFile(outputFile, JSON.stringify(output, null, 2));
}
