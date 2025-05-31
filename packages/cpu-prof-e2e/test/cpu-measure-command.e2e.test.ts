import { describe, it, expect, beforeAll } from 'vitest';
import { executeProcess } from '../../cpu-prof/src/lib/utils/execute-process';
import { join } from 'path';
import { mkdir, rm, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
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

  it('should measure `node -e "script"` and log output', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-e-script-direct');
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: 'node',
      args: [
        cliPath,
        'cpu-measure',
        'node',
        '-e',
        '"console.log(1)"',
        '--cpu-prof-dir',
        outputDir,
      ],
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);
  });
});
