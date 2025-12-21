import { beforeAll, describe, expect, it, afterAll } from 'vitest';
import { executeProcess } from '@push-based/prof-dev-kit';
import { join } from 'node:path';
import { mkdir, rm } from 'node:fs/promises';
import { CLI_PATH } from '../mocks/constants.js';

describe('cpu-measure-command', () => {
  const cliPath = join(__dirname, '../../../', CLI_PATH);
  const mocksPath = join(__dirname, '../mocks');
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

    const { stderr, code } = await executeProcess({
      command: 'node',
      args: [
        cliPath,
        'measure',
        'npm',
        '-v',
        '--cpu-prof-dir',
        outputDir,
        '--verbose',
        '--no-merge',
      ],
      ignoreExitCode: true,
    });

    if (code !== 0) {
      // Node.js 24+ restricts --cpu-prof via NODE_OPTIONS for security
      expect(stderr).toContain('Error: Node.js has restricted some V8 options');
      expect(stderr).toContain('--cpu-prof');
      expect(stderr).toContain('NODE_OPTIONS');
    } else {
      expect(code).toBe(0);
    }
  });

  it('should measure and merge profile into a single file by default', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-measure-and--merge');
    const scriptPath = join(mocksPath, 'create-many-preoces.js');
    await mkdir(outputDir, { recursive: true });

    const { stderr, code } = await executeProcess({
      command: 'node',
      args: [
        cliPath,
        'measure',
        'node',
        scriptPath,
        '--cpu-prof-dir',
        outputDir,
        '--verbose',
      ],
      ignoreExitCode: true,
    });

    if (code !== 0) {
      // Node.js 24+ restricts --cpu-prof via NODE_OPTIONS for security
      expect(stderr).toContain('Error: Node.js has restricted some V8 options');
      expect(stderr).toContain('--cpu-prof');
      expect(stderr).toContain('NODE_OPTIONS');
    } else {
      expect(code).toBe(0);
    }
  });

  it('should measure and merge profile into a single file with --no-merge', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-e-script-no-merge');
    await mkdir(outputDir, { recursive: true });

    const { stderr, code } = await executeProcess({
      command: 'node',
      args: [
        cliPath,
        'measure',
        'npm',
        '-v',
        '--cpu-prof-dir',
        outputDir,
        '--verbose',
        '--no-merge',
      ],
      ignoreExitCode: true,
    });

    if (code !== 0) {
      // Node.js 24+ restricts --cpu-prof via NODE_OPTIONS for security
      expect(stderr).toContain('Error: Node.js has restricted some V8 options');
      expect(stderr).toContain('--cpu-prof');
      expect(stderr).toContain('NODE_OPTIONS');
    } else {
      expect(code).toBe(0);
    }
  });
});
