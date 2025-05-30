import { describe, expect, it } from 'vitest';
import { cp, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { mergeCpuProfileFiles } from './merge-cpuprofile-files';
import { vol } from 'memfs';

const mocksMinimalDir = join(__dirname, '..', '..', '..', 'mocks', 'minimal');
const tmpProjectDir = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'tmp',
  ...(process.env['NX_TASK_TARGET_PROJECT']
    ? [process.env['NX_TASK_TARGET_PROJECT']]
    : [])
);
describe('mergeCpuProfileFiles integration', () => {
  it('should merge files in a real folder', async () => {
    await cp(mocksMinimalDir, tmpProjectDir, { recursive: true });

    const outputFile = join(tmpProjectDir, 'merged-profile.json');
    await mergeCpuProfileFiles(tmpProjectDir, outputFile);

    const outputFileContent = await readFile(outputFile, 'utf8');
    const output = JSON.parse(outputFileContent);

    expect(output).toMatchFileSnapshot(
      join(
        __dirname,
        '__snapshots__',
        'mergeCpuProfileFiles-merged-profile.json'
      )
    );
  });
});
