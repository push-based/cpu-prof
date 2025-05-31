import { executeProcess } from '../../../mocks/execute-process';

/**
 * Run a command with cpu-prof and log the result
 *
 * @param command - The command to run e.g. `node`
 * @param args - The command and arguments to run e.g. `['packages/cpu-profiling/dist/cpu-prof.esm.js', 'cpu-merge', './packages/cpu-profiling-e2e/mocks/ng-serve-cpu']`
 * @param options - The options to pass to the command
 * @returns The result of the command
 * @example
 * ```ts
 * runWithCpuProf('node', ['script.js'], {
 *   dir: './packages/cpu-profiling-e2e/mocks/ng-serve-cpu',
 *   name: 'ng-serve-cpu',
 *   interval: 1000,
 * })
 * ```
 */
export async function runWithCpuProf(
  command: string,
  args: string[],
  options: {
    dir: string;
    interval: number;
    name?: string;
  },
  logger: { log: (...args: string[]) => void } = console
): Promise<void> {
  const { dir, name, interval } = options;

  const cpuProfArgs = [
    '--cpu-prof',
    ...(dir ? [`--cpu-prof-dir=${dir}`] : []),
    ...(name ? [`--cpu-prof-name=${name}`] : []),
    ...(interval ? [`--cpu-prof-interval=${interval}`] : []),
  ];

  const { stderr, code, duration } = await executeProcess({
    command: command,
    args: args,
    cwd: dir,
    env: { NODE_OPTIONS: cpuProfArgs.join(' ') },
  });

  if (code === 0) {
    logger.log(`Profiles generated in ${duration}ms - ${dir}`);
  } else {
    logger.log(`Failed to generate profiles in ${duration}ms - ${dir}`);
    logger.log(stderr);
  }
}
