import {mkdirSync, writeFileSync} from "node:fs";
import {parseArgs} from "node:util";
import {nxRunWithPerfLogging} from "./nx-advanced-profile.js";

const {values} = parseArgs({
  options: {
    args: {
      type: "string"
    },
    verbose: {
      type: "boolean",
      short: "v",
    },
    noPatch: {
      type: "boolean",
      short: "p",
    },
    outDir: {
      type: "string",
      short: "d",
    },
    outFile: {
      type: "string",
      short: "f",
    },
  },
});

const {
  args = ["show", "projects"].join(','),
  verbose,
  noPatch,
  outDir = ".nx-profiling",
  outFile = `nx-${args.split(',').join("-")}.${Date.now()}.profile.json`,
} = values;

// Run the function with arguments and write the collected timings to a JSON file.
nxRunWithPerfLogging(args.split(','), {
  verbose,
  noPatch,
  onData: (perfProfileEvent) => {
    // console.log(perfProfileEvent);
  },
  beforeExit: (profile) => {
    // @TODO figure out why profile directly does not show the flames but profile.traceEvents does
    const profileStdout = JSON.stringify(profile.traceEvents, null, 2);
    mkdirSync(outDir, {recursive: true});
    writeFileSync(`${outDir}/${outFile}`, profileStdout);
    if (verbose) {
      console.log(profileStdout);
    }
  },
});
