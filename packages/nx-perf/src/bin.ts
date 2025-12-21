import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { nxRunWithPerfLogging } from './utils.js';
import { TraceEvent, TraceFile } from '@push-based/prof-dev-kit';

const { values } = parseArgs({
  options: {
    args: {
      type: 'string',
    },
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

const {
  args = ['show', 'projects'].join(','),
  verbose,
  noPatch,
  outDir = '.nx-profiling',
  outFile = `nx-${args.split(',').join('-')}.${Date.now()}.profile.json`,
} = values;

// Run the function with arguments and write the collected timings to a JSON file.
nxRunWithPerfLogging(args.split(','), {
  verbose,
  noPatch,
  onData: (_perfProfileEvent: string) => {
    // console.log(perfProfileEvent);
  },
  onTraceEvent: (_event: TraceEvent) => {
    // Handle trace events if needed
  },
  beforeExit: (profile: TraceFile) => {
    // @TODO figure out why profile directly does not show the flames but profile.traceEvents does
    const profileStdout = JSON.stringify((profile as any).traceEvents, null, 2);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${outFile}`, profileStdout);
    if (verbose) {
      console.log(profileStdout);
    }
  },
});
