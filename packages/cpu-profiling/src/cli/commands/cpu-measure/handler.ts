import type { MeasureArgs } from './types';
import { runWithCpuProf } from '../../../lib/cpu/run-with-cpu-prof';

/**
 * Handle the cpu-measure command execution
 */
export async function handler(argv: MeasureArgs): Promise<void> {
  const { command, args, interval, dir, name, verbose } = argv;
  try {
    // Parse args string into array
    const argsArray = args
      ? args.split(' ').filter((arg: string) => arg.trim())
      : [];

    if (verbose) {
      console.log(`🔧 CPU Profiling Mode:`);
      console.log(`  📦 Command: ${command}`);
      if (argsArray.length > 0) {
        console.log(`  🔧 Arguments: ${argsArray.join(' ')}`);
      }
      interval && console.log(`  ⏱️  Interval: ${interval}ms`);
      dir && console.log(`  📁 Output directory: ${dir}`);
      name && console.log(`  🏷️  Profile name: ${name}`);
    }

    await runWithCpuProf(command, argsArray, {
      ...(dir && { dir }),
      ...(name && { name }),
      ...(interval && { interval }),
    });
  } catch (error) {
    console.error(
      '❌ Error in cpu-measure command handler:',
      (error as Error).message
    );
    process.exit(1);
  }
}
