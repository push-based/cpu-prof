import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { parseCpuProfileName } from './utils';
import { readdir } from 'fs/promises';
import { CPUProfile } from './cpuprofile.types';
import { cpuProfilesToTraceFile } from './cpu-to-trace-events';
import { CpuProfileInfo } from './types';

export async function mergeCpuProfileFiles(
  sourceDir: string,
  outputFile: string,
  options: { smosh?: boolean } = {}
): Promise<void> {
  const filesInDir: string[] = await readdir(sourceDir);
  const outputFileNameIfInSourceDir =
    dirname(outputFile) === sourceDir ? basename(outputFile) : null;

  const filesToProcess = filesInDir
    .filter((file) => {
      // 1. Never process the exact file we are about to write to, if it's in the sourceDir.
      if (file === outputFileNameIfInSourceDir) {
        return false;
      }
      // 2. If the default "merged-profile.json" is in sourceDir,
      //    and we are NOT currently writing to "sourceDir/merged-profile.json" (i.e. outputFileNameIfInSourceDir is not "merged-profile.json"),
      //    then ignore the "merged-profile.json" in sourceDir to prevent it from being included if current output is different.
      if (
        file === 'merged-profile.json' &&
        outputFileNameIfInSourceDir !== 'merged-profile.json'
      ) {
        return false;
      }
      return true;
    })
    .map((file) => join(sourceDir, file));

  if (filesToProcess.length === 0) {
    throw new Error(
      `No valid CPU profiles found in ${sourceDir} to merge (after excluding output file and/or previous merged files).`
    );
  }
  const profiles: CpuProfileInfo[] = await Promise.all(
    filesToProcess.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const cpuProfile = JSON.parse(content) as CPUProfile;
      return { cpuProfile, ...parseCpuProfileName(basename(file)) };
    })
  );

  const output = cpuProfilesToTraceFile(profiles, options);
  await writeFile(outputFile, JSON.stringify(output, null, 2));
}
