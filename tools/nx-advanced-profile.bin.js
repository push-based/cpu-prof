import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {writeFileSync, mkdirSync} from 'node:fs';
import {parseArgs} from 'node:util';

const {values} = parseArgs({
    options: {
        verbose: {
            type: 'boolean',
            short: 'v',
        },
        noPatch: {
            type: 'boolean',
            short: 'p',
        },
        outDir: {
            type: 'string',
            short: 'd',
        },
        outFile: {
            type: 'string',
            short: 'f',
        },
    },
});

const args = ['show', 'projects'];
const {
    verbose,
    noPatch,
    outDir = '.nx-profiling',
    outFile = `nx-${args.join('-')}.${Date.now()}.profile.json`,
} = values;

// Run the function with arguments and write the collected timings to a JSON file.
nxRunWithPerfLogging(args, {
    verbose,
    noPatch,
    onTraceEvent: (perfProfileEvent) => {
        // console.log('perfProfileEvent', perfProfileEvent);
    },
    beforeExit: (profile) => {
        const profileStdout = JSON.stringify(profile, null, 2);
        mkdirSync(outDir, {recursive: true});
        writeFileSync(`${outDir}/${outFile}`, profileStdout);
        if (verbose) {
            console.log(profileStdout);
        }
    },
});

export async function nxRunWithPerfLogging(
    args,
    {
        verbose = false,
        noPatch = false,
        onData = () => {
        },
        onTraceEvent = () => {},
        onMetadata = () => {},
        beforeExit = () => {},
    } = {}
) {
    const patch = !noPatch;
    const nxUrl = await import.meta.resolve('nx');
    const nxPath = fileURLToPath(nxUrl);

    const profile = {
        metadata: {
            source: "DevTools",
            startTime: Date.toString(),
            hardwareConcurrency: 12,
            dataOrigin: "TraceEvents",
            modifications: {
                entriesModifications: {
                    hiddenEntries: [],
                    expandableEntries: []
                },
                initialBreadcrumb: {
                    window: {
                        min: 269106047711,
                        max: 269107913714,
                        range: 1866003
                    },
                    child: null
                },
                annotations: {
                    entryLabels: [],
                    labelledTimeRanges: [],
                    linksBetweenEntries: []
                }
            }
        },
        traceEvents: []
    };

    const forkArgs = [
        nxPath,
        args,
        {
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {
                ...process.env,
                NX_DAEMON: 'false',
                NX_CACHE: 'false',
                NX_PERF_LOGGING: 'true',
            },
            // Preload the patch file so that it applies before NX is loaded.
            execArgv: patch ? ['--require', './tools/perf_hooks.patch.js'] : [],
        },
    ];
    if (verbose) {
        console.log('Forking NX with args:', forkArgs);
    }

    const child = fork(...forkArgs);

    child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            onData(line);
            const res = line.split(':JSON:');

            if (res.length === 2) {
                const [prop, jsonString] = res;
                const perfProfileEvent = JSON.parse(jsonString?.trim() || '{}');
                if (prop === 'traceEvent') {
                    onTraceEvent(perfProfileEvent);
                    profile.traceEvents.push(perfProfileEvent);
                }
                if (prop === 'metadata') {
                    onMetadata(perfProfileEvent);
                    profile.metadata = perfProfileEvent;
                }
            }
        }
    });

    child.on('close', () => {
        beforeExit(profile);
    });
}
