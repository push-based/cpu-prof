import { beforeAll, describe, expect, it, vi, beforeEach } from 'vitest';
import { readFile, rm } from 'fs/promises';
import { join } from 'path';
import { mergeCpuProfileFiles } from './merge-cpuprofile-files';
import { vol } from 'memfs';

describe('mergeCpuProfileFiles', () => {
  it('should merge files in a folder', async () => {
    const profilesDir = 'profiles';
    const profilePath1 = `${profilesDir}/CPU.20250519.100000.10.0.001.cpuprofile`;
    const profilePath2 = `${profilesDir}/CPU.20250519.110000.11.0.002.cpuprofile`;
    vol.fromJSON({
      [profilePath1]: JSON.stringify({
        nodes: [
          {
            id: 1,
            callFrame: {
              functionName: '(root)',
              scriptId: '0',
              url: '',
              lineNumber: -1,
              columnNumber: -1,
            },
            hitCount: 0,
            children: [2],
          },
          {
            id: 2,
            callFrame: {
              functionName: 'test1',
              scriptId: '1',
              url: 'file:///test1.js',
              lineNumber: 1,
              columnNumber: 0,
            },
            hitCount: 1,
          },
        ],
        startTime: 1000000,
        endTime: 1000100,
        samples: [2],
        timeDeltas: [100],
      }),
      [profilePath2]: JSON.stringify({
        nodes: [
          {
            id: 1,
            callFrame: {
              functionName: '(root)',
              scriptId: '0',
              url: '',
              lineNumber: -1,
              columnNumber: -1,
            },
            hitCount: 0,
            children: [2],
          },
          {
            id: 2,
            callFrame: {
              functionName: 'test2',
              scriptId: '2',
              url: 'file:///test2.js',
              lineNumber: 1,
              columnNumber: 0,
            },
            hitCount: 1,
          },
        ],
        startTime: 1001000,
        endTime: 1002000,
        samples: [2],
        timeDeltas: [1000],
      }),
    });

    const outputFile = join(profilesDir, 'merged-profile.json');
    await mergeCpuProfileFiles(profilesDir, outputFile);

    const outputFileContent = await readFile(outputFile, 'utf8');
    const output = JSON.parse(outputFileContent);

    expect(output).toStrictEqual({
      traceEvents: expect.arrayContaining([
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 10,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'Profile',
          id: '0x1000',
          pid: 10,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          id: '0x1000',
          pid: 10,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 10,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StartProfiling',
          pid: 11,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'Profile',
          id: '0x1101',
          pid: 11,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'ProfileChunk',
          id: '0x1101',
          pid: 11,
          tid: 0,
        }),
        expect.objectContaining({
          name: 'CpuProfiler::StopProfiling',
          pid: 11,
          tid: 0,
        }),
      ]),
      metadata: expect.any(Object),
    });
  });
});
