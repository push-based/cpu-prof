import { describe, it, expect, beforeAll } from 'vitest';
import { executeProcess } from '../../../testing/utils/src/index.js';
import { join } from 'path';
import { mkdir, rm, readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { CLI_PATH } from '../mocks/constants';

describe('cpu-measure-command', () => {
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

  it('should not support node command and log appropriate message', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-not-supported');
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [CLI_PATH, 'cpu-measure', 'node', '--args="-v"', '--verbose'],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('🔧 CPU Profiling Mode:');
    expect(stdout).toContain('📦 Command: node');
    expect(stdout).toContain('Command node is not supported');
  });

  it('should measure a simple process and create CPU profile', async () => {
    const caseName = 'simple-process';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        '--version',
        '--dir',
        outputDir,
        '--name',
        'test-profile',
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Profiles generated');

    // Check that CPU profile files were created
    const files = await readdir(outputDir);
    const cpuProfileFiles = files.filter((file) =>
      file.endsWith('.cpuprofile')
    );
    expect(cpuProfileFiles.length).toBeGreaterThan(0);

    // Verify the profile contains valid JSON
    const profilePath = join(outputDir, cpuProfileFiles[0]);
    const profileContent = await readFile(profilePath, 'utf8');
    const profile = JSON.parse(profileContent);
    expect(profile).toHaveProperty('nodes');
    expect(profile).toHaveProperty('samples');
    expect(profile).toHaveProperty('timeDeltas');
  });

  it('should measure with custom interval option', async () => {
    const caseName = 'custom-interval';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        '--version',
        '--dir',
        outputDir,
        '--interval',
        '500',
        '--verbose',
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('⏱️  Interval: 500ms');
    expect(stdout).toContain('Profiles generated');

    // Verify profile was created
    const files = await readdir(outputDir);
    const cpuProfileFiles = files.filter((file) =>
      file.endsWith('.cpuprofile')
    );
    expect(cpuProfileFiles.length).toBeGreaterThan(0);
  });

  it('should measure with custom profile name', async () => {
    const caseName = 'custom-name';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const customName = 'my-custom-profile';

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        '--version',
        '--dir',
        outputDir,
        '--name',
        customName,
        '--verbose',
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain(`🏷️  Profile name: ${customName}`);
    expect(stdout).toContain('Profiles generated');

    // Check that profile with custom name was created
    const files = await readdir(outputDir);
    const customProfileFiles = files.filter(
      (file) => file.includes(customName) && file.endsWith('.cpuprofile')
    );
    expect(customProfileFiles.length).toBeGreaterThan(0);
  });

  it('should handle complex command with multiple arguments', async () => {
    const caseName = 'complex-command';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        'config get registry',
        '--dir',
        outputDir,
        '--interval',
        '100',
        '--verbose',
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('🔧 Arguments:');
    expect(stdout).toContain('config get registry');
    expect(stdout).toContain('Profiles generated');
  });

  it('should measure process with hello world arguments', async () => {
    const caseName = 'hello-world';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        'hello world',
        '--dir',
        outputDir,
        '--name',
        'hello-test',
        '--interval',
        '100',
        '--verbose',
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Profiles generated');

    // Check that profiles were created
    const files = await readdir(outputDir);
    const cpuProfileFiles = files.filter((file) =>
      file.endsWith('.cpuprofile')
    );
    expect(cpuProfileFiles.length).toBeGreaterThan(0);
  });
  it('should verify mock process output appears in logs', async () => {
    const caseName = 'verify-mock-output';
    const outputDir = join(tmpCpuMeasureCommandDir, caseName);
    await mkdir(outputDir, { recursive: true });

    const { stdout, stderr, code } = await executeProcess({
      command: '../../node_modules/.bin/ts-node',
      args: [
        CLI_PATH,
        'cpu-measure',
        mockProcessPath,
        '--args',
        '--version',
        '--dir',
        outputDir,
      ],
    });

    expect(code).toBe(0);
    expect(stderr).toBe('');
    expect(stdout).toContain('Profiles generated');

    // The mock process should have done its CPU work
    const files = await readdir(outputDir);
    const cpuProfileFiles = files.filter((file) =>
      file.endsWith('.cpuprofile')
    );
    expect(cpuProfileFiles.length).toBeGreaterThan(0);

    // Verify the profile contains meaningful data from our mock process
    const profilePath = join(outputDir, cpuProfileFiles[0]);
    const profileContent = await readFile(profilePath, 'utf8');
    const profile = JSON.parse(profileContent);

    // Should have captured the function calls from our mock process
    expect(profile.nodes.length).toBeGreaterThan(1);
    expect(profile.samples.length).toBeGreaterThan(0);
  });
});
