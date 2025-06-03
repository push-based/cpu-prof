import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { readFile, cp, rm } from 'fs/promises';
import { join } from 'path';
import { mergeCpuProfileFiles } from './merge-cpuprofile-files';

describe('mergeCpuProfileFiles integration', () => {
  const mocksPath = join(__dirname, '../../mocks/fixtures');
  const mocksMinimalPath = join(mocksPath, 'minimal');
  const tmpDir = join(__dirname, '../../tmp/merge-cpuprofile-files-test');
  const tmpTestFileDir = join(tmpDir, 'merge-cpuprofile-files-test');
  const outputFile = join(tmpTestFileDir, 'merged-profile.json');

  beforeAll(async () => {
    // Clean up and create test directories
    await rm(tmpDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test directories
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('should merge files in a real folder', async () => {
    const caseDir = join(tmpTestFileDir, 'merge-files');

    // Copy actual CPU profile files to test directory
    await cp(
      join(mocksMinimalPath, 'pyramide.cpuprofile.json'),
      join(caseDir, 'CPU.20250101.120000.1234.1.001.cpuprofile'),
      { recursive: true }
    );

    await cp(
      join(mocksMinimalPath, 'valley.cpuprofile.json'),
      join(caseDir, 'CPU.20250101.120001.1234.2.001.cpuprofile'),
      { recursive: true }
    );

    // Actually call the function to merge the files
    await mergeCpuProfileFiles(caseDir, outputFile);

    // Verify the output file was created and has expected structure
    const outputFileContent = await readFile(outputFile, 'utf8');
    const output = JSON.parse(outputFileContent);

    await expect({
      ...output,
      metadata: {
        ...output.metadata,
        startTime: 'mocked-timestamp',
      },
    }).toMatchFileSnapshot(
      join(
        __dirname,
        '__snapshots__',
        'merge-cpu-profile-files-merged-profile.json'
      )
    );
  });
});
