import {afterAll, beforeEach, describe, expect, it} from 'vitest';
import {mkdir, readdir, readFile, rm} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {exec} from 'child_process';
import {promisify} from 'util';
import {mergeCpuProfiles} from './merge-cpuprofile';
import {getCpuProfileName} from './utils';


const execAsync = promisify(exec);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Go up from src to package root, then to project root
const PACKAGE_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');
const SNAPSHOTS_DIR = join(__dirname, '__snapshots__');

interface TraceEvent {
    args: {
        col: number;
        line: number;
        url: string;
    };
    cat: string;
    dur: number;
    name: string;
    ph: string;
    pid: number;
    tid: number;
    ts: number;
}

const TMP_DIR = join(PROJECT_ROOT, 'tmp/nx-perf/merge');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');
const FIXTURES_DIR = join(MOCKS_DIR, 'fixtures');
const CHILD_PROCESS = join(MOCKS_DIR, 'child-process.mjs');
const MINIMAL_CHILD_PROCESS = join(MOCKS_DIR, 'minimal-child-process.mjs');
const EMPTY_CHILD_PROCESS = join(MOCKS_DIR, 'empty-child-process.mjs');

export interface CpuProfOptions {
    /** Enable the V8 CPU profiler */
    enabled?: boolean; // default: true

    /** Directory to write .cpuprofile files */
    dir?: string;

    /** Filename pattern (supports %P, %T, %D, %H) */
    name?: string;

    /** Sampling interval in microseconds (default: 1000) */
    interval?: number;
}

export interface ExecWithCpuProfConfig {
    scriptPath: string;
    outputDir: string;
    timeoutMs?: number;
    cpuProfOptions?: CpuProfOptions;
    sampleProfInterval?: string;
}

export async function execWithCpuProf(config: ExecWithCpuProfConfig): Promise<{ stdout: string; stderr: string }> {
    const {
        scriptPath,
        outputDir,
        timeoutMs = 5000,
        cpuProfOptions = {},
        sampleProfInterval
    } = config;

    const {
        enabled = true,
        interval = 1000,
        dir = outputDir,
        name
    } = cpuProfOptions;

    // Prepare output directory
    await rm(dir, {recursive: true, force: true});
    await mkdir(dir, {recursive: true});

    // Build profiling flags
    const profFlags: string[] = [];

    if (enabled) {
        profFlags.push('--cpu-prof');
        if (interval) profFlags.push(`--cpu-prof-interval=${interval}`);
        if (dir) profFlags.push(`--cpu-prof-dir="${dir}"`);
        if (name) profFlags.push(`--cpu-prof-name="${name}"`);
    }

    if (sampleProfInterval) {
        profFlags.push(`--sample-prof-interval=${sampleProfInterval}`);
    }

    const command = `node ${profFlags.join(' ')} "${scriptPath}"`;

    try {
        const result = await execAsync(command, {timeout: timeoutMs});
        return result;
    } catch (error: any) {
        throw new Error(`CPU profile execution failed: ${error.message || error}`);
    }
}

describe('setup-cpuprofile', () => {
    afterAll(async () => {
        //  await rm(TMP_DIR, { recursive: true, force: true });
    });

    it('should create a empty CPU profiles', async () => {
        const testCaseDir = join(TMP_DIR, 'setup-empty-profile');

        // Execute the minimal process with specific sampling interval
        const {stdout, stderr} = await execWithCpuProf({
            scriptPath: EMPTY_CHILD_PROCESS,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 100
            }
        });

        expect(stdout).toBe('');
        expect(stderr).toBe('');

        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles).toHaveLength(1);

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

    it('should merge a single minimal CPU profile into a trace file', async () => {
        const output = mergeCpuProfiles([{
            profile: minimalProfile,
            pid: 51430,
            isMain: true
        }]);

        // Write output for snapshot comparison
        const snapshotFile = join(__dirname, '__snapshots__', 'merge-single-profile.json');
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(snapshotFile);
    });

    it('should merge multiple minimal CPU profiles into a trace file with different PIDs', async () => {
        const output = mergeCpuProfiles([
            {
                profile: minimalProfile,
                pid: 51430,
                isMain: true
            },
            {
                profile: minimalProfile,
                pid: 51431,
                isMain: true
            }
        ]);

        // Write output for snapshot comparison
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merge-multiple-profiles.json'));
    });

    it('should merge multiple minimal CPU profiles into a trace file with same PIDs and different TIDs', async () => {
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
                isMain: true
            }
        ]);

        // Write output for snapshot comparison
        await mkdir(join(__dirname, '__snapshots__'), {recursive: true});
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(join(__dirname, '__snapshots__', 'merge-multiple-profiles-same-pid.json'));
    });
});
