import { describe, it, expect, beforeAll } from 'vitest';
import { executeProcess } from '../../prof-dev-kit/src/lib/execute-process.ts';
import path from 'node:path';
import { cp, mkdir, rm, readFile, readdir } from 'node:fs/promises';
import { CLI_PATH } from '../mocks/constants.js';

describe('cpu-merge-command', () => {
  const cliPath = path.join(__dirname, '../../../', CLI_PATH);
  const mocksPath = path.join(__dirname, '../mocks');
  const mocksMinimalPath = path.join(mocksPath, 'minimal');
  const tmpCpuMergeCommandDir = path.join(
    __dirname,
    '../../../tmp/cpu-merge-command'
  );

  beforeAll(async () => {
    await rm(tmpCpuMergeCommandDir, { recursive: true, force: true });
    await mkdir(tmpCpuMergeCommandDir, { recursive: true });
  });

  it('should run without error and log results to terminal', async () => {
    const inputDir = path.join(tmpCpuMergeCommandDir, 'terminal-logs');
    await cp(
      path.join(
        mocksMinimalPath,
        'pyramide.20250519.110180.10003.0.001.cpuprofile'
      ),
      path.join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
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
    expect(stdout).toMatch(/Trace-\d{8}T\d{6}\.json/);
    expect(code).toBe(0);
  });

  it('should merge profiles in a folder and create a trace file merging all cpu profiles', async () => {
    const caseName = 'default-options';
    const inputDir = path.join(tmpCpuMergeCommandDir, caseName);

    await mkdir(inputDir, { recursive: true });
    await cp(
      path.join(
        mocksMinimalPath,
        'pyramide.20250519.110180.10003.0.001.cpuprofile'
      ),
      path.join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile'),
      {
        recursive: true,
      }
    );
    await cp(
      path.join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      path.join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
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

    // Find the generated Trace file
    const files = await readdir(inputDir);
    const traceFile = files.find(
      (f) => f.startsWith('Trace-') && f.endsWith('.json')
    );
    expect(traceFile).toBeDefined();

    const outputFileContent = (
      await readFile(path.join(inputDir, traceFile!))
    ).toString();

    const outputJson = JSON.parse(outputFileContent);
    outputJson.metadata.startTime = 'mocked-timestamp';
    await expect(JSON.stringify(outputJson, null, 2)).toMatchFileSnapshot(
      path.join(
        __dirname,
        '__snapshots__',
        `command-cpu-merged.${caseName}.json`
      )
    );
  });

  it('should merge profiles in a folder with --outputDir option', async () => {
    const caseName = 'output-dir-options';
    const inputDir = path.join(tmpCpuMergeCommandDir, caseName);
    const outputDir = path.join(inputDir, 'output');

    await mkdir(inputDir, { recursive: true });
    await cp(
      path.join(
        mocksMinimalPath,
        'pyramide.20250519.110180.10003.0.001.cpuprofile'
      ),
      path.join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile')
    );
    await cp(
      path.join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      path.join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
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

    // Check that a Trace file was created in the output directory
    const files = await readdir(outputDir);
    const traceFile = files.find(
      (f) => f.startsWith('Trace-') && f.endsWith('.json')
    );
    expect(traceFile).toBeDefined();
  });

  it('should merge profiles in a folder with --startTracingInBrowser option', async () => {
    const caseName = 'start-tracing-in-browser-options';
    const inputDir = path.join(tmpCpuMergeCommandDir, caseName);

    await mkdir(inputDir, { recursive: true });
    await cp(
      path.join(
        mocksMinimalPath,
        'pyramide.20250519.110180.10003.0.001.cpuprofile'
      ),
      path.join(inputDir, 'pyramide.20250519.110180.10003.0.001.cpuprofile')
    );
    await cp(
      path.join(
        mocksMinimalPath,
        'flat-line.20250519.050090.10002.0.001.cpuprofile'
      ),
      path.join(inputDir, 'flat-line.20250519.050090.10002.0.001.cpuprofile'),
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

    // Find the generated Trace file
    const files = await readdir(inputDir);
    const traceFile = files.find(
      (f) => f.startsWith('Trace-') && f.endsWith('.json')
    );
    expect(traceFile).toBeDefined();

    const outputFileContent = (
      await readFile(path.join(inputDir, traceFile!))
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
