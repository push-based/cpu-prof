import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';

/**
 * Handle the cpu-measure command execution
 */
export async function handler(argv: MeasureArgs): Promise<void> {
  const { command_to_profile, verbose } = argv;

  // Arguments for the profiled command are in argv._ after yargs parsing.
  // Named positionals (like command_to_profile) are not included in _.
  const finalArgsForChild: string[] = argv._ ? argv._.map(String) : [];

  const dir = argv.dir!;
  const interval = argv.interval!;
  const name = argv.name;

  try {
    if (verbose) {
      console.log(`🔧 CPU Profiling Mode:`);
      console.log(`  📦 Profiling Command: ${command_to_profile}`);
      if (finalArgsForChild.length > 0) {
        console.log(`  🔧 Arguments: ${finalArgsForChild.join(' ')}`);
      }
      console.log(`  ⏱️  Interval: ${interval}ms`);
      console.log(`  📁 Output directory: ${dir}`);
      if (name) {
        console.log(`  🏷️  Profile name: ${name}`);
      }
    }

    await runWithCpuProf(command_to_profile, finalArgsForChild, {
      dir,
      interval,
      name,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;
    if (errorMessage && errorMessage.includes('not allowed in NODE_OPTIONS')) {
      console.error(
        '❌ Error: Node.js has restricted some V8 options (like --cpu-prof) from being set via NODE_OPTIONS.\n' +
          '   This is a security feature in recent Node.js versions.\n' +
          '   The V8 option "--cpu-prof" specifically was disallowed.\n' +
          '   If you have a Node.js version where this works (e.g., the user mentioned it works in Node 23), you can switch to it (e.g., `nvm use 23`).\n' +
          '   Alternatively, the profiling tool might need an update to pass these V8 options directly to the Node.js command if possible.'
      );
    } else {
      console.error('❌ Error in cpu-measure command handler:', errorMessage);
    }
    process.exit(1);
  }
}
