import {
  type ChildProcess,
  type ChildProcessByStdio,
  type SpawnOptionsWithStdioTuple,
  type StdioPipe,
  spawn,
} from 'node:child_process';
import type { Readable, Writable } from 'node:stream';
import path from 'node:path';
import * as ansis from 'ansis';
/**
 * Represents the process result.
 * @category Types
 * @public
 * @property {string} stdout - The stdout of the process.
 * @property {string} stderr - The stderr of the process.
 * @property {number | null} code - The exit code of the process.
 */
export type ProcessResult = {
  stdout: string;
  stderr: string;
  code: number | null;
  date: string;
  duration: number;
};

/**
 * Error class for process errors.
 * Contains additional information about the process result.
 * @category Error
 * @public
 * @class
 * @extends Error
 * @example
 * const result = await executeProcess({})
 * .catch((error) => {
 *   if (error instanceof ProcessError) {
 *   console.error(error.code);
 *   console.error(error.stderr);
 *   console.error(error.stdout);
 *   }
 * });
 *
 */
export class ProcessError extends Error {
  code: number | null;
  stderr: string;
  stdout: string;

  constructor(result: ProcessResult) {
    super(result.stderr);
    this.code = result.code;
    this.stderr = result.stderr;
    this.stdout = result.stdout;
  }
}

/**
 * Process config object. Contains the command, args and observer.
 * @param cfg - process config object with command, args and observer (optional)
 * @category Types
 * @public
 * @property {string} command - The command to execute.
 * @property {string[]} args - The arguments for the command.
 * @property {ProcessObserver} observer - The observer for the process.
 *
 * @example
 *
 * // bash command
 * const cfg = {
 *   command: 'bash',
 *   args: ['-c', 'echo "hello world"']
 * };
 *
 * // node command
 * const cfg = {
 * command: 'node',
 * args: ['--version']
 * };
 *
 * // npx command
 * const cfg = {
 * command: 'npx',
 * args: ['--version']
 *
 */
export type ProcessConfig = Omit<
  SpawnOptionsWithStdioTuple<StdioPipe, StdioPipe, StdioPipe>,
  'stdio'
> & {
  command: string;
  args?: string[];
  observer?: ProcessObserver;
  ignoreExitCode?: boolean;
  env?: NodeJS.ProcessEnv;
};

/**
 * Process observer object. Contains the onStdout, error and complete function.
 * @category Types
 * @public
 * @property {function} onStdout - The onStdout function of the observer (optional).
 * @property {function} onError - The error function of the observer (optional).
 * @property {function} onComplete - The complete function of the observer (optional).
 *
 * @example
 * const observer = {
 *  onStdout: (stdout) => console.info(stdout)
 *  }
 */
export type ProcessObserver = {
  onStdout?: (stdout: string, sourceProcess?: ChildProcess) => void;
  onStderr?: (stderr: string, sourceProcess?: ChildProcess) => void;
  onError?: (error: ProcessError) => void;
  onComplete?: () => void;
};

/**
 * Calculates the duration between two timestamps.
 * If the `stop` parameter is not provided, it uses the current time.
 * * @category Utils
 * @param {number} start - The start timestamp in milliseconds.
 * @param {number} [stop] - The stop timestamp in milliseconds. If not provided, uses the current time.
 * @return {number} - The duration in milliseconds, rounded to the nearest integer.
 *
 */
export function calcDuration(start: number, stop?: number): number {
  return Math.round((stop ?? performance.now()) - start);
}

/**
 * Formats a command string with optional cwd prefix and ANSI colors.
 *
 * @param {string} command - The command to execute.
 * @param {string[]} args - Array of command arguments.
 * @param {string} [cwd] - Optional current working directory for the command.
 * @returns {string} - ANSI-colored formatted command string.
 */
export function formatCommandLog(
  command: string,
  args: string[] = [],
  cwd: string = process.cwd()
): string {
  const relativeDir = path.relative(process.cwd(), cwd);
  const logElements: string[] = [];

  // Add CWD if it's relevant
  if (relativeDir && relativeDir !== '.') {
    logElements.push(ansis.italic.gray(relativeDir));
  }

  // Add prompt, command, and arguments with distinct styling
  logElements.push(ansis.bold.yellow('$'));
  logElements.push(ansis.cyan(command));

  if (args.length > 0) {
    logElements.push(ansis.magenta(args[0])); // Primary argument/script
    if (args.length > 1) {
      logElements.push(ansis.gray(args.slice(1).join(' '))); // Subsequent arguments
    }
  }

  return logElements.join(' ');
}

/**
 * Logs the details of a command execution, including the command, arguments,
 * CWD, and specific NODE_OPTIONS intended for display.
 */
function logCommandExecutionDetails(
  command: string,
  args: string[] | undefined,
  cwd: string | URL | undefined,
  nodeOptionsForLogging: string | undefined,
  logger: { log?: (...args: string[]) => void }
): void {
  if (!logger?.log) {
    return;
  }

  const logParts = [
    formatCommandLog(
      command,
      args,
      cwd instanceof URL ? cwd.pathname : cwd ?? process.cwd()
    ),
  ];

  if (nodeOptionsForLogging) {
    const nodeOptionsDisplayString = `${ansis.green(
      'NODE_OPTIONS'
    )}=${ansis.blueBright(String(nodeOptionsForLogging))}`;
    logParts.push(ansis.dim('with env: ') + nodeOptionsDisplayString);
  }
  // No other environment variables will be logged here, adhering to the previous request
  // to only log the constructed NODE_OPTIONS for profiling in this specific "with env:" part.

  logger.log(logParts.join(' '));
}

/**
 * Executes a process and returns a promise with the result as `ProcessResult`.
 *
 * @example
 *
 * // sync process execution
 * const result = await executeProcess({
 *  command: 'node',
 *  args: ['--version']
 * });
 *
 * console.info(result);
 *
 * // async process execution
 * const result = await executeProcess({
 *    command: 'node',
 *    args: ['download-data.js'],
 *    observer: {
 *      onStdout: updateProgress,
 *      error: handleError,
 *      complete: cleanLogs,
 *    }
 * });
 *
 * console.info(result);
 *
 * @param cfg - see {@link ProcessConfig}
 */
export function executeProcess(
  cfg: ProcessConfig,
  logger: { log?: (...args: string[]) => void } = {}
): Promise<ProcessResult> {
  const {
    command,
    args,
    observer,
    ignoreExitCode = false,
    env: rawEnv, // Renamed to avoid confusion, this includes __FOR_LOGGING_NODE_OPTIONS__
    ...options
  } = cfg;
  const { onStdout, onStderr, onError, onComplete } = observer ?? {};
  const date = new Date().toISOString();
  const start = performance.now();

  // Prepare the actual environment for the spawned process by removing our logging-only key
  const actualEnvForSpawn = { ...rawEnv };
  const nodeOptionsForLogging = actualEnvForSpawn.__FOR_LOGGING_NODE_OPTIONS__;
  delete actualEnvForSpawn.__FOR_LOGGING_NODE_OPTIONS__;

  // Log command execution details using the new helper function
  logCommandExecutionDetails(
    command,
    args,
    cfg.cwd,
    nodeOptionsForLogging as string | undefined,
    logger
  );

  return new Promise((resolve, reject) => {
    // shell:true tells Windows to use shell command for spawning a child process
    const spawnedProcess = spawn(command, args ?? [], {
      shell: false,
      windowsHide: true,
      env: { ...process.env, ...actualEnvForSpawn }, // Use the cleaned env for spawn
      ...options,
    }) as ChildProcessByStdio<Writable, Readable, Readable>;

    // eslint-disable-next-line functional/no-let
    let stdout = '';
    // eslint-disable-next-line functional/no-let
    let stderr = '';

    spawnedProcess.stdout.on('data', (data) => {
      stdout += String(data);
      onStdout?.(String(data), spawnedProcess);
    });

    spawnedProcess.stderr.on('data', (data) => {
      stderr += String(data);
      onStderr?.(String(data), spawnedProcess);
    });

    spawnedProcess.on('error', (err) => {
      stderr += err.toString();
    });

    spawnedProcess.on('close', (code) => {
      const timings = { date, duration: calcDuration(start) };
      if (code === 0 || ignoreExitCode) {
        onComplete?.();
        resolve({ code, stdout, stderr, ...timings });
      } else {
        const errorMsg = new ProcessError({ code, stdout, stderr, ...timings });
        onError?.(errorMsg);
        reject(errorMsg);
      }
    });
  });
}
