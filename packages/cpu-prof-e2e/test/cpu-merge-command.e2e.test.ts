import { describe, it, expect, beforeAll } from 'vitest';
import { executeProcess } from '../../cpu-prof/src/lib/execute-process';
import { join } from 'path';
import { cp, mkdir, rm, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { CLI_PATH } from '../mocks/constants';

describe('cpu-merge-command', () => {
  const cliPath = join(__dirname, '../../../', CLI_PATH);
  const mocksPath = join(__dirname, '../mocks');
  const mocksMinimalPath = join(mocksPath, 'minimal');
  const tmpCpuMergeCommandDir = join(
    __dirname,
    '../../../tmp/cpu-merge-command'
  );

  beforeAll(async () => {
    await rm(tmpCpuMergeCommandDir, { recursive: true, force: true });
    await mkdir(tmpCpuMergeCommandDir, { recursive: true });
  });

  it('should run without error and log results to terminal', async () => {
    const inputDir = join(tmpCpuMergeCommandDir, 'terminal-logs');
    await cp(
      join(mocksMinimalPath, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );

    const { stdout, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'merge', inputDir],
    });

    expect(stdout).toContain('✅ CPU profiles merged successfully!');
    expect(stdout).toContain('📊 Generated 9 trace events');
    expect(stdout).toContain('📄 Output file:');
    expect(stdout).toContain('merged-profile.json');
    expect(code).toBe(0);
  });

  it('should merge profiles in a folder and create a trace file merging all cpu profiles', async () => {
    const caseName = 'default-options';
    const inputDir = join(tmpCpuMergeCommandDir, caseName);

    await mkdir(inputDir, { recursive: true });
    await cp(
      join(mocksMinimalPath, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );
    await cp(
      join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );

    const { stdout, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'merge', inputDir],
    });

    expect(stdout).toContain('📊 Generated 15 trace events');
    expect(code).toBe(0);

    const outputFileContent = (
      await readFile(join(inputDir, 'merged-profile.json'))
    ).toString();

    const outputJson = JSON.parse(outputFileContent);
    outputJson.metadata.startTime = 'mocked-timestamp';
    await expect(JSON.stringify(outputJson, null, 2)).toMatchFileSnapshot(
      join(__dirname, '__snapshots__', `command-cpu-merged.${caseName}.json`)
    );
  });

  it('should merge profiles in a folder with --outputDir option', async () => {
    const caseName = 'output-dir-options';
    const inputDir = join(tmpCpuMergeCommandDir, caseName);
    const outputDir = join(inputDir, 'output');

    await mkdir(inputDir, { recursive: true });
    await cp(
      join(mocksMinimalPath, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile')
    );
    await cp(
      join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );

    const { stdout, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'merge', inputDir, '--outputDir', outputDir],
    });

    expect(code).toBe(0);
    expect(stdout).toContain('📊 Generated 15 trace events');

    expect(existsSync(join(outputDir, 'merged-profile.json'))).toBe(true);
  });

  it('should merge profiles in a folder with --startTracingInBrowser option', async () => {
    const caseName = 'start-tracing-in-browser-options';
    const inputDir = join(tmpCpuMergeCommandDir, caseName);

    await mkdir(inputDir, { recursive: true });
    await cp(
      join(mocksMinimalPath, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile')
    );
    await cp(
      join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );

    const { stdout, code } = await executeProcess({
      command: 'node',
      args: [cliPath, 'merge', inputDir, '--startTracingInBrowser'],
    });

    expect(code).toBe(0);
    expect(stdout).toContain('📊 Generated 15 trace events');
    const outputFileContent = (
      await readFile(join(inputDir, 'merged-profile.json'))
    ).toString();

    expect(JSON.parse(outputFileContent)).toStrictEqual({
      metadata: expect.any(Object),
      traceEvents: expect.arrayContaining([
        expect.objectContaining({
          name: 'TracingStartedInBrowser',
          args: expect.any(Object),
        }),
      ]),
    });
  });
});
