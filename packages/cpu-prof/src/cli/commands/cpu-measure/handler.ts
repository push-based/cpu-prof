import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';

export async function handler(argv: MeasureArgs): Promise<void> {
  const {
    ['cpu-prof-dir']: cpuProfDir,
    ['cpu-prof-interval']: cpuProfInterval,
    ['cpu-prof-name']: cpuProfName,
  } = argv;

  let commandArgsForProfiling = (
    argv._ && argv._.length > 0 ? argv._.slice(1) : []
  ) as string[];

  if (
    commandArgsForProfiling.length > 0 &&
    commandArgsForProfiling[0] === 'cpu-measure'
  ) {
    commandArgsForProfiling = commandArgsForProfiling.slice(1);
  }

  const commandArgsInput = commandArgsForProfiling;

  if (!commandArgsInput || commandArgsInput.length === 0) {
    console.error(
      '❌ Error: No command or script provided to profile. Usage: cpu-measure [options] <command_or_script.js> [args...]'
    );
    process.exit(1);
  }

  const command_to_profile = commandArgsInput[0];
  const finalArgsForChild: string[] = commandArgsInput.slice(1);

  try {
    await runWithCpuProf(command_to_profile, finalArgsForChild, {
      dir: cpuProfDir!,
      interval: cpuProfInterval!,
      name: cpuProfName,
    });
  } catch (error) {
    const e = error as Error;
    const errorMessage = e.message || 'Unknown error';

    if (errorMessage && errorMessage.includes('not allowed in NODE_OPTIONS')) {
      console.error(
        '❌ Error: Node.js has restricted some V8 options (like --cpu-prof) from being set via NODE_OPTIONS.\n' +
          '   This is a security feature in recent Node.js versions.\n' +
          '   The V8 option "--cpu-prof" specifically was disallowed.\n' +
          '   If you have a Node.js version where this works, you can switch to it (e.g., `nvm use <version>`).\n' +
          '   Alternatively, the profiling tool might need an update to pass these V8 options directly to the Node.js command if possible.'
      );
    } else {
      console.error(`❌ Error during CPU profiling: ${errorMessage}`);
    }
    process.exit(1);
  }
}
