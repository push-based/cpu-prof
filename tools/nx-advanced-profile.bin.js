import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
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
  outDir = '.nx-profiling',
  outFile = `nx-${args.join('-')}.${Date.now()}.profile.json`,
} = values;

// Run the function with arguments and write the collected timings to a JSON file.
nxRunWithPerfLogging(args, {
  verbose,
  noPatch,
  beforeExit: (timings) => {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${outFile}`, JSON.stringify(timings, null, 2));
  },
});

export async function nxRunWithPerfLogging(
  args,
  {
    verbose = false,
    noPatch = false,
    onData = () => {},
    onTimingEvent = () => {},
    beforeExit = () => {},
  } = {}
) {
  const patch = !noPatch;
  const nxUrl = await import.meta.resolve('nx');
  const nxPath = fileURLToPath(nxUrl);

  const timings = [];

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
      if (res.length > 1) {
        const json = res.at(-1);
        const timingEvent = JSON.parse(json?.trim() || '{}');
        onTimingEvent(timingEvent);
        timings.push(timingEvent);
      }
    }
  });

  child.on('close', () => {
    beforeExit(timings);
  });
}
