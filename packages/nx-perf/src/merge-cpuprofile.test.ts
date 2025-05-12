import {afterAll, describe, expect, it} from 'vitest';
import {mkdir, readdir, readFile,} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';

import {mergeCpuProfileFiles, mergeCpuProfiles} from './merge-cpuprofile';
import {ProfileInfo} from './convert-cpuprofile-to-trace';
import {execWithCpuProf, parseCpuProfileName} from './utils';


const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Go up from src to package root, then to project root
const PACKAGE_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');

const CPU_NG_SERVE_1 = join(__dirname, '../mocks/fixtures/ng-serve/CPU.20250511.154655.76037.0.001.cpuprofile');
const {tid: tid1 = 1, pid: pid1 = 0} = parseCpuProfileName(CPU_NG_SERVE_1);
const INFO_NG_SERVE_1: ProfileInfo = {
    profile: JSON.parse(
        (
            await readFile(CPU_NG_SERVE_1
            )
        ).toString()
    ),
    pid: pid1,
    tid: tid1,
    source: CPU_NG_SERVE_1,
    isMain: true,
}

const CPU_NG_SERVE_2 = join(__dirname, '../mocks/fixtures/ng-serve/CPU.20250511.154656.76037.1.002.cpuprofile');
const { tid: tid2 = 1, pid: pid2 = 0} = parseCpuProfileName(CPU_NG_SERVE_2);
const INFO_NG_SERVE_2: ProfileInfo = {
    profile: JSON.parse(
        (
            await readFile(CPU_NG_SERVE_2
            )
        ).toString()
    ),
    pid: pid2,
    tid: tid2,
    source: CPU_NG_SERVE_2,
    isMain: false,
}
const CPU_NG_SERVE_FOLDER = join(__dirname, '../mocks/fixtures/ng-serve');

const CPU_NG_SERVE_3 = join(__dirname, '../mocks/fixtures/ng-serve/CPU.20250511.154656.76037.2.003.cpuprofile');
const { tid: tid3 = 1, pid: pid3 = 0} = parseCpuProfileName(CPU_NG_SERVE_3);
const INFO_NG_SERVE_3: ProfileInfo = {
    profile: JSON.parse(
        (
            await readFile(CPU_NG_SERVE_3
            )
        ).toString()
    ),
    pid: pid3,
    tid: tid3,
    source: CPU_NG_SERVE_3,
    isMain: false,
}


const CPU_PROFILE_MINIMAL_FILE = join(__dirname, '../mocks/fixtures/minimal.cpuprofile');
const CPU_PROFILE_MINIMAL: ProfileInfo = {
    profile: JSON.parse(
        (
            await readFile(CPU_PROFILE_MINIMAL_FILE
            )
        ).toString()
    ),
    pid: 1235,
    tid: 5679,
    source: 'Sample CPU Profile',
    isMain: false,
}

const TMP_DIR = join(PROJECT_ROOT, 'tmp/nx-perf/merge');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');
const EMPTY_CHILD_PROCESS = join(MOCKS_DIR, 'empty-child-process.mjs');

describe('execWithCpuProf', () => {
    afterAll(async () => {
        //  await rm(TMP_DIR, { recursive: true, force: true });
    });

    it.each([
        // join(MOCKS_DIR, 'empty-child-process.mjs'),
        join(MOCKS_DIR, 'fork-children.mjs'),
        join(MOCKS_DIR, 'spawn-children.mjs'),
        join(MOCKS_DIR, 'worker-children.mjs'),
    ])('should create a CPU profiles', async (scriptPath) => {
        const testCaseDir = join(TMP_DIR, 'setup-empty-profile');

        // Execute the minimal process with specific sampling interval
        const {stdout, stderr} = await execWithCpuProf({
            scriptPath,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 100
            }
        });

        expect(stderr).toBe('');

        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles).toHaveLength(3);

        // Read profile to verify it's valid JSON
        const profilePath = join(testCaseDir, cpuProfiles[0]);
        const profileContent = await readFile(profilePath, 'utf8');
        JSON.parse(profileContent); // Will throw if invalid JSON
    });

});


describe('mergeProfiles function', () => {
    const minimalProfile = {
        nodes: [
            {
                id: 1,
                callFrame: {
                    functionName: "(root)",
                    scriptId: 0,
                    url: "",
                    lineNumber: 0,
                    columnNumber: 0
                },
                children: [2]
            },
            {
                id: 2,
                callFrame: {
                    functionName: "runMainESM",
                    scriptId: 1,
                    url: "node:internal/modules/run_main",
                    lineNumber: 92,
                    columnNumber: 19
                },
                children: [3]
            },
            {
                id: 3,
                callFrame: {
                    functionName: "main",
                    scriptId: 2,
                    url: "file:///path/to/app.mjs",
                    lineNumber: 10,
                    columnNumber: 0
                },
                children: [4, 5]
            },
            {
                id: 4,
                callFrame: {
                    functionName: "loadConfig",
                    scriptId: 2,
                    url: "file:///path/to/app.mjs",
                    lineNumber: 11,
                    columnNumber: 2
                }
            },
            {
                id: 5,
                callFrame: {
                    functionName: "startServer",
                    scriptId: 2,
                    url: "file:///path/to/app.mjs",
                    lineNumber: 12,
                    columnNumber: 2
                }
            }
        ],
        startTime: 828802956626,
        endTime: 828802966709,
        samples: [2, 3, 4, 5],
        timeDeltas: [0, 2000, 0, 2083]
    };

    it.skip('should merge a single minimal CPU profile into a trace file', async () => {
        const output = mergeCpuProfiles([CPU_PROFILE_MINIMAL]);

        // Write output for snapshot comparison
        const snapshotFile = join(__dirname, '__snapshots__', 'merge-single-profile.json');
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(snapshotFile);
    });

    it('should merge multiple minimal CPU profiles into a trace file with different PIDs', async () => {
        const output = mergeCpuProfiles([
            INFO_NG_SERVE_1,
            INFO_NG_SERVE_2,
            INFO_NG_SERVE_3
        ]);

        // Write output for snapshot comparison
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merge-multiple-profiles.json'));
    });

    it.skip('should merge multiple minimal CPU profiles into a trace file with same PIDs and different TIDs', async () => {
        const output = mergeCpuProfiles([
            {
                profile: minimalProfile,
                pid: 51430,
                tid: 1,
                isMain: true
            },
            {
                profile: minimalProfile,
                pid: 51430,
                tid: 2,
                isMain: false
            }
        ]);

        // Write output for snapshot comparison
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merge-multiple-profiles-same-pid.json'));
    });

});


describe('mergeCpuProfileFiles', () => {
    it('should merge files in a folder', async () => {
        const inputDir = join(__dirname, '../mocks/fixtures/ng-build');
        const outputDir = join(__dirname, '__snapshots__');
        const outputFile = join(outputDir, 'merged-files-trace.json');

        await mergeCpuProfileFiles(inputDir, outputFile);
        const outputFileContent = await readFile(outputFile, 'utf8');
        const output = JSON.parse(outputFileContent);
        expect(JSON.stringify(output, null, 2))
            .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merged-files-trace.json'));
    });
})
