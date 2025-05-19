import {beforeAll, describe, expect, it} from 'vitest';
import {readFile, rm,} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {mergeCpuProfileFiles} from './merge-cpuprofile-files';
import {mkdir} from "node:fs/promises";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CPU_NG_SERVE_FOLDER = join(__dirname, '../mocks/fixtures/ng-serve-cpu');
// const CPU_NG_BUILD_FOLDER = join(__dirname, '../mocks/fixtures/ng-build-cpu');

describe('mergeCpuProfileFiles', () => {
    const outputDir = join(__dirname, '../../../tmp/merge/');

    beforeAll(async () => {
        await rm(outputDir, {recursive: true, force: true});
    })

    it('should merge files in a folder', async () => {
        const outputFile = join(outputDir, 'merged-files-trace.json');

        await mkdir(outputDir);
        await mergeCpuProfileFiles(CPU_NG_SERVE_FOLDER, outputFile);

        const outputFileContent = await readFile(outputFile, 'utf8');
        const output = JSON.parse(outputFileContent);

        expect(JSON.stringify({
            ...output,
            metadata: {
                ...output.metadata,
                startTime: 'mocked-start-time',
            }
        }, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merged-files-trace.json'));
    });
})
