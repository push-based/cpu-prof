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
  // Create all spies at the top of describe block
  const ensureDirectoryExistsSpy = vi.spyOn(fileUtils, 'ensureDirectoryExists');
  const isCpuProfileFileNameSpy = vi.spyOn(cpuUtils, 'isCpuProfileFileName');
  const loadCpuProfilesSpy = vi.spyOn(loadCpuProfilesModule, 'loadCpuProfiles');
  const cpuProfilesToTraceFileSpy = vi.spyOn(
    traceUtils,
    'cpuProfilesToTraceFile'
  );

  beforeEach(() => {
    // we have memfs and dont need it, so we just make it a no-op
    ensureDirectoryExistsSpy.mockImplementation(() => {});
  });

  it('should merge files in a folder', async () => {
    // Mock spy behaviors for this test
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
    // Mock to return true only for properly formatted CPU profile files
    isCpuProfileFileNameSpy.mockImplementation((fileName: string) => {
      return fileName.includes('CPU.20250519.120000.12.0.001.cpuprofile');
    });

    const profilesDir = 'profiles';
    vol.fromJSON({
      [`${profilesDir}/CPU.20250519.120000.12.0.001.cpuprofile`]: '{}',
      [`${profilesDir}/invalid.txt`]: 'some text file',
      [`${profilesDir}/another.json`]: JSON.stringify({ some: 'data' }),
      [`${profilesDir}/invalid.cpuprofile`]: JSON.stringify({ some: 'data' }), // This has .cpuprofile extension but wrong format
    });

    const outputFile = join(profilesDir, 'merged-profile.json');
    await mergeCpuProfileFiles(profilesDir, outputFile);

    // Verify that loadCpuProfiles was called with only the valid CPU profile file
    expect(loadCpuProfilesSpy).toHaveBeenCalledWith([
      expect.stringContaining('CPU.20250519.120000.12.0.001.cpuprofile'),
    ]);
    expect(loadCpuProfilesSpy).toHaveBeenCalledTimes(1);
  });

  it('should throw error when no valid CPU profiles are found', async () => {
    // Mock spy to return false for all files (no valid CPU profiles)
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
