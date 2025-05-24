import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parseCpuProfileName } from './utils';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { CpuProfile } from './cpuprofile.types';
import { cpuProfilesToTraceFile } from './cpu-to-trace-events';
import { CpuProfileInfo } from './types';

export async function mergeCpuProfileFiles(
  sourceDir: string,
  outputFile: string
): Promise<void> {
  const files: string[] = (await readdir(sourceDir)).map((file) =>
    join(sourceDir, file)
  );
  if (files.length === 0) {
    throw new Error(`No CPU profiles present in ${sourceDir}`);
  }
  const profiles: CpuProfileInfo[] = await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, 'utf8');
      const cpuProfile = JSON.parse(content) as CpuProfile;
      return { cpuProfile, ...parseCpuProfileName(basename(file)) };
    })
  );

  const output = cpuProfilesToTraceFile(profiles);
  await writeFile(outputFile, JSON.stringify(output, null, 2));
}
