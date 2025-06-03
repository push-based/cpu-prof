import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { mergeCpuProfileFiles } from './merge-cpuprofile-files';
import { vol } from 'memfs';
import * as fileUtils from './file-utils';
import * as cpuUtils from './cpu/utils';
import * as loadCpuProfilesModule from './cpu/load-cpu-profiles';
import * as traceUtils from './trace/utils';

describe('mergeCpuProfileFiles', () => {
  const ensureDirectoryExistsSpy = vi.spyOn(fileUtils, 'ensureDirectoryExists');
  const isCpuProfileFileNameSpy = vi.spyOn(cpuUtils, 'isCpuProfileFileName');
  const loadCpuProfilesSpy = vi.spyOn(loadCpuProfilesModule, 'loadCpuProfiles');
  const cpuProfilesToTraceFileSpy = vi.spyOn(
    traceUtils,
    'cpuProfilesToTraceFile'
  );

  beforeEach(() => {
    ensureDirectoryExistsSpy.mockImplementation(() => {});
  });

  it('should merge files in a folder', async () => {
    isCpuProfileFileNameSpy.mockReturnValue(true);

    const profilesDir = 'profiles';
    const profilePath1 = `${profilesDir}/CPU.20250519.100000.10.0.001.cpuprofile`;

    vol.fromJSON({
      [profilePath1]: '{"mock": "profile1"}',
    });

    cpuProfilesToTraceFileSpy.mockReturnValue({ mock: 'profile1' } as any);
    const outputFile = join(profilesDir, 'merged-profile.json');
    await mergeCpuProfileFiles(profilesDir, outputFile);

    const outputFileContent = await readFile(outputFile, 'utf8');

    expect(outputFileContent).toBe(
      JSON.stringify({ mock: 'profile1' }, null, 2)
    );
  });

  it('should skip files when isCpuProfileFileName returns false', async () => {
    isCpuProfileFileNameSpy.mockImplementation((fileName: string) => {
      return fileName.includes('CPU.20250519.120000.12.0.001.cpuprofile');
    });

    const profilesDir = 'profiles';
    vol.fromJSON({
      [`${profilesDir}/CPU.20250519.120000.12.0.001.cpuprofile`]: '{}',
      [`${profilesDir}/invalid.txt`]: 'some text file',
      [`${profilesDir}/another.json`]: JSON.stringify({ some: 'data' }),
      [`${profilesDir}/invalid.cpuprofile`]: JSON.stringify({ some: 'data' }),
    });

    const outputFile = join(profilesDir, 'merged-profile.json');
    await mergeCpuProfileFiles(profilesDir, outputFile);

    expect(loadCpuProfilesSpy).toHaveBeenCalledWith(profilesDir);
    expect(loadCpuProfilesSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw error when no valid CPU profiles are found', async () => {
    isCpuProfileFileNameSpy.mockReturnValue(false);

    const profilesDir = 'profiles';
    vol.fromJSON({
      [`${profilesDir}/invalid.txt`]: 'some text file',
      [`${profilesDir}/another.json`]: JSON.stringify({ some: 'data' }),
    });

    const outputFile = join(profilesDir, 'merged-profile.json');

    await expect(mergeCpuProfileFiles(profilesDir, outputFile)).rejects.toThrow(
      'No valid CPU profiles found in profiles to merge'
    );
  });
});
