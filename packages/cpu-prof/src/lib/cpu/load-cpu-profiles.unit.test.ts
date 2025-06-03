import { describe, expect, it } from 'vitest';
import { vol } from 'memfs';
import { loadCpuProfiles, type CpuProfileFilePath } from './load-cpu-profiles';

describe('loadCpuProfiles', () => {
  it('should load and parse CPU profiles from file paths', async () => {
    const testDir = 'testDir';
    const profile1Name = 'CPU.20250510.134625.1.0.001.cpuprofile';
    const profile2Name = 'CPU.20250510.134625.2.0.001.cpuprofile';
    const nonProfileName = 'data.txt';

    vol.fromJSON(
      {
        [profile1Name]: JSON.stringify({ mock: 1 }),
        [profile2Name]: JSON.stringify({ mock: 2 }),
        [nonProfileName]: 'some data',
      },
      testDir
    );

    const expectedProfile1Path =
      `${testDir}/${profile1Name}` as CpuProfileFilePath;
    const expectedProfile2Path =
      `${testDir}/${profile2Name}` as CpuProfileFilePath;

    await expect(loadCpuProfiles(testDir)).resolves.toStrictEqual([
      expect.objectContaining({
        cpuProfile: { mock: 1 },
        pid: 1,
        file: expectedProfile1Path,
      }),
      expect.objectContaining({
        cpuProfile: { mock: 2 },
        pid: 2,
        file: expectedProfile2Path,
      }),
    ]);
  });
});
