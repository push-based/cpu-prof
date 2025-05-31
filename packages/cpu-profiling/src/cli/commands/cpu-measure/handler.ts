import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';

/**
 * Handle the cpu-measure command execution for Node.js scripts
 */
export async function handler(argv: MeasureArgs): Promise<void> {
  const { dir, interval, name } = argv;

  const argsAfterDoubleDash = argv['--'] as string[] | undefined;
  if (!argsAfterDoubleDash || argsAfterDoubleDash.length === 0) {
    console.error(
      '❌ Error: No command or script provided after --. Usage: cpu-measure -- <command_or_script.js> [args...]'
    );
    process.exit(1);
  }

  // The first item after '--' is the command/script to be profiled.
  const command_to_profile = argsAfterDoubleDash[0];
  // The rest are its arguments.
  const finalArgsForChild: string[] = argsAfterDoubleDash.slice(1).map(String);

  try {
    await runWithCpuProf(command_to_profile, finalArgsForChild, {
      dir: dir!, // dir has a default from builder
      interval: interval!, // interval has a default from builder
      name,
    });
    // runWithCpuProf is expected to log its own success/failure or profiling details
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage && errorMessage.includes('not allowed in NODE_OPTIONS')) {
      console.error(
        '❌ Error: Node.js has restricted some V8 options (like --cpu-prof) from being set via NODE_OPTIONS.\n' +
          '   This is a security feature in recent Node.js versions.\n' +
          '   The V8 option "--cpu-prof" specifically was disallowed.\n' +
          '   If you have a Node.js version where this works, you can switch to it (e.g., `nvm use <version>`).\n' +
          '   Alternatively, the profiling tool might need an update to pass these V8 options directly to the Node.js command if possible.'
      );
    } else {
      console.error(
        `❌ Error during CPU profiling: ${errorMessage || 'Unknown error'}`
      );
    }
    process.exit(1);
  }
}
