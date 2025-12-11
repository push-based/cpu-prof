import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mergeCpuProfileFiles } from './merge-cpuprofile-files.js';
import { vol } from 'memfs';
import * as fileUtils from './file-utils.js';
import * as cpuUtils from './cpu/utils.js';
import * as loadCpuProfilesModule from './cpu/load-cpu-profiles.js';
import * as traceUtils from './trace/utils.js';

describe('mergeCpuProfileFiles', () => {
  const ensureDirectoryExistsSpy = vi.spyOn(fileUtils, 'ensureDirectoryExists');
  const isCpuProfileFileNameSpy = vi.spyOn(cpuUtils, 'isCpuProfileFileName');
  const loadCpuProfilesSpy = vi.spyOn(loadCpuProfilesModule, 'loadCpuProfiles');
  const cpuProfilesToTraceFileSpy = vi.spyOn(
    traceUtils,
    'cpuProfilesToTraceFile'
  );

  beforeEach(() => {
    ensureDirectoryExistsSpy.mockImplementation(vi.fn());
  });

  it('should merge files in a folder', async () => {
    isCpuProfileFileNameSpy.mockReturnValue(true);

    const profilesDir = 'profiles';
    const profilePath1 = `${profilesDir}/CPU.20250519.100000.10.0.001.cpuprofile`;

    vol.fromJSON({
      [profilePath1]: '{"mock": "profile1"}',
    });

    cpuProfilesToTraceFileSpy.mockReturnValue({ mock: 'profile1' });
    const outputFile = join(profilesDir, 'merged-profile.json');
    await mergeCpuProfileFiles(profilesDir, outputFile);

    const outputFileContent = await readFile(outputFile, 'utf8');

    expect(outputFileContent).toBe(
      JSON.stringify({ mock: 'profile1' }, null, 2)
    );
  });

  it('should skip files when isCpuProfileFileName returns false', async () => {
    isCpuProfileFileNameSpy.mockImplementation((fileName: string) =>
      fileName.includes('CPU.20250519.120000.12.0.001.cpuprofile')
    );

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

    await expect(
      mergeCpuProfileFiles(profilesDir, outputFile)
    ).rejects.toThrowError('No valid CPU profiles found in profiles to merge');
  });
});
