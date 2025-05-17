import {readFile, writeFile} from 'node:fs/promises';
import {basename} from 'node:path';
import {parseCpuProfileName, sortTraceEvents} from './utils';
import {
    convertCpuProfileToTraceFile,
    CpuProfile,
    ProfileInfo,
    TraceOutput,
    TraceEvent
} from './convert-cpuprofile-to-trace';
import {readdir} from "fs/promises";
import {join} from "path";

export async function mergeCpuProfileFiles(sourceDir: string, outputFile: string): Promise<void> {
    const files: string[] = (await readdir(sourceDir)).map(file => join(sourceDir, file));
    // Step 1: Parse all files into ProfileInfo objects
    const profiles: ProfileInfo[] = await Promise.all(
        files.map(async file => {
            const content = await readFile(file, 'utf8');
            const profile = JSON.parse(content) as CpuProfile;
            return {profile, ...parseCpuProfileName(basename(file))} as ProfileInfo;
        })
    );

    // Sort profiles by  profile.profile.startTime
    profiles.sort((a, b) => {
        const startTimeA = a.profile.startTime ?? 0;
        const startTimeB = b.profile.startTime ?? 0;
        return (startTimeA - startTimeB);
    });

    // Step 2: Merge all profiles into a single trace output
    const output = mergeCpuProfiles(profiles);
    await writeFile(outputFile, JSON.stringify(output, null, 2));
}

export function mergeCpuProfiles(profiles: ProfileInfo[]): TraceOutput {
    // Convert each profile to TraceOutput
    const traces: TraceOutput[] = profiles.map(convertCpuProfileToTraceFile)

    // Detect the main profile (always use the first profile)
    const mainProfileInfo = profiles[0];
    if (!mainProfileInfo) {
        throw new Error("No main profile found");
    }

    // Find the minimum timestamp from all trace events (excluding undefined)
    const allEvents = traces.flatMap(trace => trace.traceEvents);

    // Find the earliest timestamp for zeroing
    const minTs = allEvents.reduce((min, ev) =>
        typeof ev.ts === 'number' && ev.ts < min ? ev.ts : min, Number.POSITIVE_INFINITY
    );
    const startTs = isFinite(minTs) ? minTs : 0;

    // thread_name meta event for main thread
    const threadNameEvent: TraceEvent = {
        ph: 'M',
        cat: '__metadata',
        name: 'thread_name',
        pid: mainProfileInfo.pid,
        tid: mainProfileInfo.tid,
        ts: 0,
        args: { name: mainProfileInfo.tid }
    };

    // Remove any existing thread_name for this pid/tid to avoid duplicates
    const filteredEvents = allEvents.filter(e =>
        !(e.ph === 'M' && e.name === 'thread_name' && e.pid === mainProfileInfo.pid && e.tid === mainProfileInfo.tid)
    );

    // Use sortTraceEvents to order meta events at the top
    const sortedEvents = sortTraceEvents([
       // tracingStartedEvent,
        threadNameEvent,
        ...allEvents
    ]).map((t) => ({ ...t, pid: 0 }));

    return {
        traceEvents: sortedEvents,
        displayTimeUnit: 'ms',
        metadata: {
            startTime: mainProfileInfo.date?.toISOString(),
            hardwareConcurrency: 12,
            modifications: {
                entriesModifications: {
                    hiddenEntries: [],
                    expandableEntries: []
                },
                initialBreadcrumb: {
                    window: {
                        min: 0,
                        max: 0
                    }
                }
            }
        }
    };
}
