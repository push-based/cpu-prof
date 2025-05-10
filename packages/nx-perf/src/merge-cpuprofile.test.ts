import {afterAll, describe, expect, it} from 'vitest';
import {access, mkdir, readdir, readFile, rm} from 'fs/promises';
import {join} from 'path';
import {fileURLToPath} from 'url';
import {exec} from 'child_process';
import {promisify} from 'util';
import {mergeProfiles} from './merge-cpuprofile';

const execAsync = promisify(exec);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
// Go up from src to package root, then to project root
const PACKAGE_ROOT = join(__dirname, '..');
const PROJECT_ROOT = join(PACKAGE_ROOT, '../..');

const TMP_DIR = join(PROJECT_ROOT, 'tmp/nx-perf/merge');
const MOCKS_DIR = join(PACKAGE_ROOT, 'mocks');
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
    await rm(TMP_DIR, { recursive: true, force: true });
});

describe('setup-cpuprofile', () => {
    it('should create a empty CPU profiles', async () => {
        const testCaseDir = join(TMP_DIR, 'setup-empty-profile');
        
        // Execute the minimal process with specific sampling interval
        const { stdout, stderr } = await execWithCpuProf({
            scriptPath: EMPTY_CHILD_PROCESS,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 1000  // 1ms sampling interval for more consistent results
            }
        });

        // Verify process execution
        expect(stdout).toBe('');
        expect(stderr).toBe('');

        // Verify profile file creation
        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles).toHaveLength(1);

        // Read and parse the profile
        const profilePath = join(testCaseDir, cpuProfiles[0]);
        const profileContent = await readFile(profilePath, 'utf8');
        const profile = JSON.parse(profileContent);
        const fileSize = (await readFile(profilePath)).length / 1024; // Convert to KB

        // Calculate profile stats
        const duration = (profile.endTime - profile.startTime) / 1000; // Convert to ms
        const totalNodes = profile.nodes.length;
        const totalSamples = profile.samples.length;
        const avgSampleInterval = profile.timeDeltas.reduce((a: number, b: number) => a + b, 0) / profile.timeDeltas.length / 1000; // Convert to ms

        // Verify profile content
        expect(totalNodes).toBeLessThan(150);  // Node.js runtime generates ~137 nodes
        expect(totalSamples).toBeLessThan(150); // Node.js runtime generates ~120 samples
        expect(avgSampleInterval).toBeGreaterThan(0.5); // Should be roughly around our 1ms target
        expect(avgSampleInterval).toBeLessThan(2.0);    // Allow some variance
        expect(fileSize).toBeLessThan(25);     // Increased to account for runtime nodes
        expect(duration).toBeLessThan(30);
    });

    it('should create a minimal CPU profiles', async () => {
        const testCaseDir = join(TMP_DIR, 'setup-minimal-profile');
        
        // Execute the minimal process with same sampling interval as empty process
        const { stdout, stderr } = await execWithCpuProf({
            scriptPath: MINIMAL_CHILD_PROCESS,
            outputDir: testCaseDir,
            cpuProfOptions: {
                interval: 1000  // 1ms sampling interval for consistent comparison
            }
        });
        
        // Verify process execution
        expect(stdout).toMatch(/PID \d+; Starting heavy computations/);
        expect(stdout).toMatch(/PID \d+; Tick 1, Round 1 completed:/);
        expect(stdout).toMatch(/PID \d+; Tick 1, Round 2 completed:/);
        expect(stdout).toMatch(/PID \d+; Tick 1, Round 3 completed:/);
        expect(stdout).toMatch(/PID \d+; All ticks completed/);
        expect(stderr).not.toMatch(/Error|error/i);

        // Verify profile file creation
        const files = await readdir(testCaseDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles).toHaveLength(1);

        // Read and parse the profile
        const profilePath = join(testCaseDir, cpuProfiles[0]);
        const profileContent = await readFile(profilePath, 'utf8');
        const profile = JSON.parse(profileContent);
        const fileSize = (await readFile(profilePath)).length / 1024; // Convert to KB

        // Calculate profile stats
        const duration = (profile.endTime - profile.startTime) / 1000; // Convert to ms
        const totalNodes = profile.nodes.length;
        const totalSamples = profile.samples.length;
        const avgSampleInterval = profile.timeDeltas.reduce((a: number, b: number) => a + b, 0) / profile.timeDeltas.length / 1000; // Convert to ms
        
        // Verify profile content with appropriate thresholds for minimal process
        expect(totalNodes).toBeGreaterThan(150);    // More nodes due to actual computation code
        expect(totalNodes).toBeLessThan(400);       // But still within reasonable bounds
        expect(totalSamples).toBeGreaterThan(400);  // More samples due to longer execution
        expect(totalSamples).toBeLessThan(4000);    // But still within reasonable bounds
        expect(avgSampleInterval).toBeGreaterThan(0.5);  // Similar to empty process
        expect(avgSampleInterval).toBeLessThan(2.0);     // Allow same variance
        expect(fileSize).toBeGreaterThan(25);     // Larger due to more nodes and samples
        expect(fileSize).toBeLessThan(100);       // But still within reasonable bounds
        expect(duration).toBeGreaterThan(50);     // Longer duration due to actual work
        expect(duration).toBeLessThan(100);       // But should complete within 100ms

        // Additional checks specific to minimal process
        expect(profile.nodes.some((n: { callFrame: { functionName: string } }) => 
            n.callFrame.functionName === 'heavyWork'
        )).toBe(true);

        // Verify we have some CPU-intensive samples
        const nonZeroDeltas = profile.timeDeltas.filter((d: number) => d > 0);
        expect(nonZeroDeltas.length).toBeGreaterThan(totalSamples * 0.5); // At least 50% should be non-zero
        
        // Verify node structure
        profile.nodes.forEach((node: { id: number; callFrame: { functionName: string; url: string } }) => {
            expect(node).toHaveProperty('id');
            expect(node).toHaveProperty('callFrame');
            expect(node.callFrame).toHaveProperty('functionName');
            expect(node.callFrame).toHaveProperty('url');
            // Expect at least one node to be our heavyWork function
            if (node.callFrame.functionName === 'heavyWork') {
                expect(node.callFrame.url).toMatch(/minimal-child-process\.mjs$/);
            }
        });
    });
});

describe('mergeProfiles function', () => {
    it('should merge a single minimal CPU profile into a single trace file', async () => {
        const testCaseDir = join(TMP_DIR, 'merge-single-profile');
        const inputDir = join(testCaseDir, 'input');
        const outputDir = join(testCaseDir, 'output');
        const outputFile = join(outputDir, 'merged-trace.json');
        
        // Run with CPU profiling
        const { stdout, stderr } = await execWithCpuProf({
            scriptPath: CHILD_PROCESS,
            outputDir: inputDir
        });

        // Verify process output
        expect(stdout.trim()).toMatch(/PID \d+; Starting heavy computations/);
        expect(stdout.trim()).toMatch(/PID \d+; Tick 3, Round 3 completed:/);
        expect(stdout.trim()).toMatch(/PID \d+; All ticks completed/);
        
        // Verify no errors (ignoring experimental warning)
        expect(stderr).not.toMatch(/Error|error/i);

        // Check that exactly one CPU profile was created
        const files = await readdir(inputDir);
        const cpuProfiles = files.filter(f => f.startsWith('CPU.') && f.endsWith('.cpuprofile'));
        expect(cpuProfiles.length).toBe(1);

        // Merge the profile
        await mergeProfiles(inputDir, outputDir, outputFile);

        // Verify the merged output
        const mergedContent = JSON.parse(await readFile(outputFile, 'utf8'));
        expect(mergedContent).toHaveProperty('traceEvents');
        expect(mergedContent).toHaveProperty('displayTimeUnit', 'ms');
        expect(mergedContent.traceEvents).toBeInstanceOf(Array);
        expect(mergedContent.traceEvents.length).toBeGreaterThan(0);

        // Verify trace event structure
        const event = mergedContent.traceEvents[0];
        expect(event).toHaveProperty('ph');
        expect(event).toHaveProperty('name');
        expect(event).toHaveProperty('pid');
        expect(event).toHaveProperty('tid');
        expect(event).toHaveProperty('ts');
        expect(event).toHaveProperty('cat');
        expect(event).toHaveProperty('args');

        // Verify thread metadata is present
        const metadataEvent = mergedContent.traceEvents.find((e: { ph: string; name: string }) => 
            e.ph === 'M' && e.name === 'thread_name'
        );
        expect(metadataEvent).toBeDefined();
        expect(metadataEvent?.args.name).toBe('Main Thread (.001)');
    });
});
