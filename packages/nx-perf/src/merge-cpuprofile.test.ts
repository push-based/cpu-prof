import {afterAll, describe, expect, it} from 'vitest';
import {access, mkdir, readdir, readFile, rm, writeFile} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {exec} from 'child_process';
import {promisify} from 'util';
import {mergeCpuProfiles, mergeProfileFiles} from './merge-cpuprofile';

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
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

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
        const result = await execAsync(command, { timeout: timeoutMs });
        return result;
    } catch (error: any) {
        throw new Error(`CPU profile execution failed: ${error.message || error}`);
    }
}

// Clean up TMP_DIR after all tests
afterAll(async () => {
  //  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('setup-cpuprofile', () => {
    it('should create a empty CPU profiles', async () => {
        const testCaseDir = join(TMP_DIR, 'setup-empty-profile');
        
        // Execute the minimal process with specific sampling interval
        const { stdout, stderr } = await execWithCpuProf({
            scriptPath: EMPTY_CHILD_PROCESS,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 100
            }
        });

        // Verify process execution
        expect(stdout).toBe('');
        expect(stderr).toBe('');

        // Verify profile file creation
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
    it('should merge a single minimal CPU profile into a trace file', async () => {
        const minimalProfile = JSON.parse(await readFile(join(FIXTURES_DIR, 'minimal.cpuprofile'), 'utf8'));
        
        // Merge the profile directly using the core function
        const output = mergeCpuProfiles([{
            profile: minimalProfile,
            pid: 51430,
            isMain: true
        }]);

        // Write output for snapshot comparison
        const snapshotFile = join(__dirname, '__snapshots__', 'merge-single-profile.json');
        await mkdir(join(__dirname, '__snapshots__'), { recursive: true });
        await writeFile(snapshotFile, JSON.stringify(output, null, 2));
        await expect(JSON.stringify(output, null, 2)).toMatchFileSnapshot(snapshotFile);
    });
});
