import { beforeAll, describe, expect, it } from 'vitest';
import { executeProcess } from '../../cpu-prof/src/lib/execute-process';
import { join } from 'path';
import { mkdir, readdir, rm } from 'fs/promises';
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
        '--no-merge',
      ],
    });

    expect(code).toBe(0);
    expect(stdout).toContain(`Profiles generated - ${outputDir}`);

    await expect(readdir(outputDir)).resolves.toHaveLength(1);
  });

  it('should measure and merge profile into a single file by default', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-measure-and--merge');
    const scriptPath = join(mocksPath, 'create-many-preoces.js');
    await mkdir(outputDir, { recursive: true });

    const { stdout, code } = await executeProcess({
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
    });

    expect(code).toBe(0);
    expect(stdout).toContain(`Profiles generated - ${outputDir}`);

    const profiles = await readdir(outputDir);
    const cpuProfileFiles = profiles.filter((f) => f.endsWith('.cpuprofile'));
    const mergedFiles = profiles.filter((f) => f.includes('merged'));

    // Check that we have exactly 5 CPU profile files (1 main + 2 workers + 2 spawns)
    expect(cpuProfileFiles.length).toBe(5);

    // Check that we have exactly 1 merged file
    expect(mergedFiles.length).toBe(1);
    expect(mergedFiles[0]).toMatch(/merged.*\.json$/);

    // Match command line output
    const expectedCmdRegex = new RegExp(
      `NODE_OPTIONS="--cpu-prof --cpu-prof-dir=${outputDir.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      )}" node .*create-many-preoces\\.js --verbose`
    );
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    // Remove color codes before matching
    const firstLineWithoutColors = lines[0].replace(/\u001B\[\d+m/g, '');
    expect(firstLineWithoutColors).toMatch(expectedCmdRegex);

    // Check for expected process/thread output patterns anywhere in stdout (order independent)
    const stdoutWithoutColors = stdout.replace(/\u001B\[\d+m/g, '');

    // Check for exactly 1 main process
    const mainMatches = stdoutWithoutColors.match(/Main PID: \d+ TID: 0/g);
    expect(mainMatches).toHaveLength(1);

    // Check for exactly 2 worker threads
    const workerMatches = stdoutWithoutColors.match(
      /Worker PID: \d+ TID: [12]/g
    );
    expect(workerMatches).toHaveLength(2);

    // Check for exactly 2 spawn processes
    const spawnMatches = stdoutWithoutColors.match(/spawn PID: \d+ TID: 0/g);
    expect(spawnMatches).toHaveLength(2);
  });

  it('should measure and merge profile into a single file with --no-merge', async () => {
    const outputDir = join(tmpCpuMeasureCommandDir, 'node-e-script-no-merge');
    await mkdir(outputDir, { recursive: true });

    const { stdout, code } = await executeProcess({
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
    });

    expect(code).toBe(0);
    const stdoutWithoutColors = stdout.replace(/\u001B\[\d+m/g, '');
    expect(stdoutWithoutColors).toContain(
      `NODE_OPTIONS="--cpu-prof --cpu-prof-dir=${outputDir}" npm --verbose -v`
    );
    expect(stdout).toContain(`Profiles generated - ${outputDir}`);

    const profiles = await readdir(outputDir);
    const cpuProfileFiles = profiles.filter((f) => f.endsWith('.cpuprofile'));
    const mergedFiles = profiles.filter((f) => f.includes('merged'));

    // Check that we have exactly 1 CPU profile file (npm -v is simple command)
    expect(cpuProfileFiles.length).toBe(1);

    // Check that no merged file was created (--no-merge flag)
    expect(mergedFiles.length).toBe(0);
  });
});
