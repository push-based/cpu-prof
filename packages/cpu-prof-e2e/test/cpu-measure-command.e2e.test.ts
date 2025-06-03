import { describe, it, expect, beforeAll } from 'vitest';
import { executeProcess } from '../../cpu-prof/src/lib/execute-process';
import { join } from 'path';
import { mkdir, rm, readdir, readFile } from 'fs/promises';
import { removeColorCodes } from '@push-based/testing-utils';
import { CLI_PATH } from '../mocks/constants';

describe('cpu-measure-command', () => {
  const cliPath = join(__dirname, '../../../', CLI_PATH);
  const mocksPath = join(__dirname, '../mocks');
  const mockProcessPath = join(mocksPath, 'single.process.js');
  const tmpCpuMeasureCommandDir = join(
    __dirname,
    '../../../tmp/cpu-measure-command'
  );

  beforeAll(async () => {
    await rm(tmpCpuMeasureCommandDir, { recursive: true, force: true });
    await mkdir(tmpCpuMeasureCommandDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpCpuMeasureCommandDir, { recursive: true, force: true });
  });

  it('should measure `node -e "script"` and log output', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-e-script-direct');
    await mkdir(outputDir, { recursive: true });

    // nx run cpu-prof:measure "node -e 'console.log(42)'"
    const { stdout, stderr, code } = await executeProcess({
      command: 'node',
      args: [
        cliPath,
        'measure',
        'npm',
        '-v',
        '--cpu-prof-dir',
        outputDir,
        '--verbose',
      ],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(removeColorCodes(stdout)).toContain(
      `NODE_OPTIONS="--cpu-prof --cpu-prof-dir='${outputDir}'" npm -v --verbose`
    );
    expect(stdout).toContain(`Profiles generated - ${outputDir}`);

    await expect(readdir(outputDir)).resolves.toHaveLength(1);
  });
});
