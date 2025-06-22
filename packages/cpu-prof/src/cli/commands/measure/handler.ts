import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';
import { filterKebabCase } from './utils';
import { handleCpuProfileMerge } from '../merge/handler';
import { join } from 'node:path';

export async function handler(argv: MeasureArgs): Promise<void> {
  const { _: positionalArgs = [], ...options } = filterKebabCase(argv);
  const {
    $0,
    verbose,
    merge,
    smosh = true,
    startTracingInBrowser = true,
    cpuProfDir = join(process.cwd(), 'profiles'),
    cpuProfInterval,
    cpuProfName,
    commandToProfile,
    flagMain,
    ...commandOptions
  } = options;

  // Determine the actual command to profile
  const cmdToRun = // Case 1: Explicit 'measure' command is used with positional arguments
    // Example: `cpu-prof measure node script.js`
    // Here, `commandToProfile` will be `['node', 'script.js']`.
    (
      commandToProfile && commandToProfile.length > 0
        ? commandToProfile
        : // Case 2: Default command ('*') is used (i.e., 'measure' is not explicitly typed).
          // Example: `cpu-prof node script.js`
          // Here, `positionalArgs` (argv._) will be `['node', 'script.js']`.
          positionalArgs
    ) as string[];

  const nodeOptions = {
    cpuProfDir,
    ...(cpuProfInterval ? { cpuProfInterval } : {}),
    ...(cpuProfName ? { cpuProfName } : {}),
    ...(flagMain ? { flagMain } : {}),
  };

  if (!cmdToRun || !Array.isArray(cmdToRun) || cmdToRun.length === 0) {
    console.error(
      '❌ Error: No command or script provided to profile. Usage: measure <command_or_script.js> [args...]'
    );
    process.exit(1);
  }

  const [actualCommand, ...actualCommandArgs] = cmdToRun;

  // Filter commandOptions to prefer kebab-case and remove duplicate camelCase keys
  const filteredCommandOptions = filterKebabCase(commandOptions);

  try {
    await runWithCpuProf(
      actualCommand,
      {
        _: actualCommandArgs,
        ...(verbose ? { verbose } : {}),
        ...filteredCommandOptions,
      },
      nodeOptions
    );

    if (merge == true) {
      await handleCpuProfileMerge({
        inputDir: cpuProfDir,
        outputDir: cpuProfDir,
        verbose,
        smosh,
        startTracingInBrowser,
      });
    }
  } catch (error) {
    const e = error as Error;
    const errorMessage = e.message || 'Unknown error';

    if (errorMessage && errorMessage.includes('not allowed in NODE_OPTIONS')) {
      console.error(
        '❌ Error: Node.js has restricted some V8 options (like --cpu-prof) from being set via NODE_OPTIONS.\n' +
          '   This is a security feature in recent Node.js versions.\n' +
          '   The V8 option "--cpu-prof" specifically was disallowed.\n' +
          '   It works in Node.js version > 22, you can switch to it (e.g., `nvm use <version>`).\n'
      );
    } else if (errorMessage.includes('Command failed with exit code')) {
      // Generic failure from executeChildProcess, could append more details if available
      console.error(`❌ Error during CPU profiling: ${errorMessage}.`);
    } else {
      // Other types of errors (e.g., issues within runWithCpuProf before spawning)
      console.error(`❌ Error during CPU profiling setup: ${errorMessage}`);
    }
    process.exit(1);
  }
}
