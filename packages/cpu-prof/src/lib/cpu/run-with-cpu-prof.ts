import { spawn } from 'node:child_process';
import { CpuProfileArguments } from './cpuprofile.types';
import * as ansis from 'ansis';

interface ProcessStdOutput {
  code: string | number | null;
}

class MinimalProcessError extends Error {
  code: string | number | null;

  constructor(message: string, code: string | number | null) {
    super(message);
    this.code = code;
    this.name = 'MinimalProcessError';
  }
}

function formatCommandLog(
  command: string,
  args: string[] = [],
  nodeOptions?: string
): string {
  const logElements: string[] = [];
  if (nodeOptions) {
    logElements.push(
      `${ansis.green('NODE_OPTIONS')}="${ansis.blueBright(nodeOptions)}"`
    );
  }
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

function logCommandExecutionDetails(
  command: string,
  args: string[] | undefined,
  nodeOptionsForLogging: string | undefined,
  logger: { log: (...args: string[]) => void }
): void {
  if (!logger?.log) {
    return;
  }
  const commandDisplayString = formatCommandLog(
    command,
    args,
    nodeOptionsForLogging
  );
  logger.log(commandDisplayString);
}

interface PreparedCommand {
  finalCommand: string;
  finalArgs: string[];
  nodeOptionsValue: string;
}

function prepareCommandForProfiling(
  initialCommand: string,
  initialArgs: string[],
  options: CpuProfileArguments
): PreparedCommand {
  const {
    dir: cpuProfDir,
    name: cpuProfName,
    interval: cpuProfInterval,
  } = options;

  // Only set profiling flags if at least one profiling option is provided
  const hasProfiling = cpuProfDir || cpuProfName || cpuProfInterval;
  const cpuProfFlags = [
    ...(hasProfiling ? ['--cpu-prof'] : []),
    ...(cpuProfDir ? [`--cpu-prof-dir=${cpuProfDir}`] : []),
    ...(cpuProfName ? [`--cpu-prof-name=${cpuProfName}`] : []),
    ...(cpuProfInterval ? [`--cpu-prof-interval=${cpuProfInterval}`] : []),
  ];
  const nodeOptionsValue = cpuProfFlags.join(' ');

  let finalCommand = initialCommand;
  let finalArgs = [...initialArgs];

  const isNodeExecutable =
    initialCommand.endsWith('node') || initialCommand.endsWith('node.exe');
  const isJsFile = initialCommand.endsWith('.js');

  if (isJsFile && !isNodeExecutable) {
    finalArgs = [initialCommand, ...initialArgs];
    finalCommand = 'node';
  } else if (!isNodeExecutable && !isJsFile && hasProfiling) {
    throw new Error(
      `Warning: CPU profiling flags are set via NODE_OPTIONS. ` +
        `Command '${initialCommand}' is not a Node.js executable or .js file, ` +
        `and may not be profiled as expected.`
    );
  }

  return {
    finalCommand,
    finalArgs,
    nodeOptionsValue,
  };
}

async function executeChildProcess(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv
): Promise<ProcessStdOutput> {
  return new Promise((resolve, reject) => {
    const spawnedProcess = spawn(command, args, {
      shell: false,
      windowsHide: true,
      env,
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    spawnedProcess.on('error', (err: NodeJS.ErrnoException) => {
      reject(new MinimalProcessError(err.message, err.code || null));
    });

    spawnedProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ code });
      } else {
        const message = `Command failed with exit code ${code}`;
        reject(new MinimalProcessError(message, code));
      }
    });
  });
}

export async function runWithCpuProf(
  initialCommand: string,
  initialArgs: string[],
  options: {
    dir?: string;
    interval?: number;
    name?: string;
  },
  logger: { log: (...args: string[]) => void } = console
): Promise<ProcessStdOutput> {
  const { finalCommand, finalArgs, nodeOptionsValue } =
    prepareCommandForProfiling(initialCommand, initialArgs, options);

  const actualEnvForSpawn = { ...process.env, NODE_OPTIONS: nodeOptionsValue };

  logCommandExecutionDetails(finalCommand, finalArgs, nodeOptionsValue, logger);

  try {
    const result = await executeChildProcess(
      finalCommand,
      finalArgs,
      actualEnvForSpawn
    );
    logger.log(`Profiles generated - ${options.dir}`);
    return result;
  } catch (error) {
    logger.log(`Failed to generate profiles - ${options.dir}`);
    throw error;
  }
}
