import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';
import { filterCliOptions } from './utils';

export async function handler(argv: MeasureArgs): Promise<void> {
  const { _: positionalArgs = [], ...options } = argv;
  const {
    $0,
    cpuProfDir,
    ['cpu-prof-dir']: cpuProfDir2,
    cpuProfInterval,
    ['cpu-prof-interval']: cpuProfInterval2,
    cpuProfName,
    ['cpu-prof-name']: cpuProfName2,
    commandToProfile,
    ['command-to-profile']: commandToProfile2,
    flagMain,
    ['flag-main']: flagMain2,
    ...commandOptions
  } = options;
  const nodeOptions = {
    ...(cpuProfDir ? { cpuProfDir } : {}),
    ...(cpuProfInterval ? { cpuProfInterval } : {}),
    ...(cpuProfName ? { cpuProfName } : {}),
    ...(flagMain ? { flagMain } : {}),
  };

  if (
    !commandToProfile ||
    !Array.isArray(commandToProfile) ||
    commandToProfile.length === 0
  ) {
    console.error(
      '❌ Error: No command or script provided to profile. Usage: cpu-measure <command_or_script.js> [args...]'
    );
    process.exit(1);
  }

  const [actualCommand, ...actualCommandArgs] = commandToProfile;

  // Filter commandOptions to prefer kebab-case and remove duplicate camelCase keys
  const filteredCommandOptions = filterCliOptions(commandOptions);

  try {
    await runWithCpuProf(
      actualCommand,
      {
        _: actualCommandArgs,
        ...filteredCommandOptions,
      },
      nodeOptions
    );
  } catch (error) {
    const e = error as Error;
    let errorMessage = e.message || 'Unknown error';

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
