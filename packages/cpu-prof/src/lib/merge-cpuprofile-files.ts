import {writeFile} from 'fs/promises';
import {CpuProfileInfo} from './cpu/cpuprofile.types';
import {cpuProfilesToTraceFile} from './trace/utils';
import {dirname} from 'node:path';
import {ensureDirectoryExists} from './file-utils';
import {loadCpuProfiles,} from './cpu/load-cpu-profiles';

export async function mergeCpuProfileFiles(
  sourceDir: string,
  outputFile: string,
  options: {
    smosh?: 'all' | 'pid' | 'tid' | 'off';
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
