import { describe, expect, it } from 'vitest';
import { vol } from 'memfs';
import { loadCpuProfiles, type CpuProfileFilePath } from './load-cpu-profiles';

describe('loadCpuProfiles', () => {
  it('should load and parse CPU profiles from file paths', async () => {
    // Arrange
    const filePaths: CpuProfileFilePath[] = [
      'test/CPU.20250510.134625.1.0.001.cpuprofile' as CpuProfileFilePath,
      'test/CPU.20250510.134625.2.0.001.cpuprofile' as CpuProfileFilePath,
    ];

    vol.fromJSON(
      {
        'CPU.20250510.134625.1.0.001.cpuprofile': JSON.stringify({
          mock: 1,
        }),
        'CPU.20250510.134625.2.0.001.cpuprofile': JSON.stringify({
          mock: 2,
        }),
      },
      'test'
    );

    await expect(loadCpuProfiles(filePaths)).resolves.toStrictEqual([
      expect.objectContaining({
        cpuProfile: { mock: 1 },
        pid: 1,
      }),
      expect.objectContaining({
        cpuProfile: { mock: 2 },
        pid: 2,
      }),
    ]);
  });
});
