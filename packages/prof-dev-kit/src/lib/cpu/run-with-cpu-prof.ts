import * as ansis from 'ansis';
import {
  executeProcess,
  type ProcessResult,
} from '../utils/execute-process.js';
import * as process from 'node:process';
import { getCpuProfileName, parseCpuProfileName } from './utils.js';
import { encodeCmd } from '../utils/encode-command-data.js';
import { loadCpuProfiles } from './load-cpu-profiles.js';
import { getSmallestPidTidProfileInfo } from './profile-selection.js';
import { basename, join } from 'node:path';
import { rename } from 'node:fs/promises';
import { objectToCliArgs, type ArgumentValue } from '../utils/transform.js';

function formatCommandLog(
  command: string,
  args: string[] = [],
  nodeOptions?: string
): string {
  const logElements: string[] = [];
  if (nodeOptions) {
    logElements.push(
      `${ansis.green('NODE_OPTIONS')}="${ansis.blueBright(
        nodeOptions.replaceAll('"', '')
      )}"`
    );
  }
  logElements.push(ansis.cyan(command));
  if (args.length > 0) {
    logElements.push(ansis.white(args.join(' ')));
  }
  return logElements.join(' ');
}

export async function runWithCpuProf(
  command: string,
  args: Record<string, ArgumentValue>,
  options: {
    cpuProfDir?: string;
    cpuProfInterval?: number;
    cpuProfName?: string;
    flagMain?: boolean;
  },
  logger: { log: (...args: string[]) => void } = console,
  env: Record<string, string | undefined> = process.env
): Promise<Pick<ProcessResult, 'code'>> {
  const {
    cpuProfDir = join(process.cwd(), 'profiles'),
    cpuProfInterval,
    cpuProfName,
    flagMain,
  } = options;
  const nodeOptionsAsRecord = {
    'cpu-prof': true,
    ...(cpuProfDir ? { 'cpu-prof-dir': cpuProfDir } : {}),
    ...(cpuProfInterval ? { 'cpu-prof-interval': cpuProfInterval } : {}),
    ...(cpuProfName ? { 'cpu-prof-name': cpuProfName } : {}),
  };
  const nodeOptionsString = objectToCliArgs(nodeOptionsAsRecord).join(' ');
  const argsArray = objectToCliArgs(args);

  logger.log(formatCommandLog(command, argsArray, nodeOptionsString));

  try {
    // Construct the environment variables for executeProcess
    const envWithNodeOptions = {
      ...env,
      NODE_OPTIONS: nodeOptionsString,
    };
    const result = await executeProcess({
      command,
      args: argsArray,
      env: envWithNodeOptions,
      observer: {
        onStdout: (stdout) => {
          logger.log(stdout);
        },
        onStderr: (stderr) => {
          logger.log(stderr);
        },
      },
    });

    logger.log(`Profiles generated - ${cpuProfDir}`);

    if (flagMain) {
      const profiles = await loadCpuProfiles(cpuProfDir);
      const mainProfile = getSmallestPidTidProfileInfo(profiles);
      if (mainProfile) {
        const { pid, tid, seq, date } = parseCpuProfileName(
          basename(mainProfile.file)
        );
        const profName = getCpuProfileName({
          prefix: `MAIN-CPU--${encodeCmd(command, argsArray)}`,
          pid,
          tid,
          seq,
          date,
        });

        await rename(mainProfile.file, join(cpuProfDir, profName));

        logger.log(`Main profile inc base64 encoded command: ${profName}`);
      }
    }

    return { code: result.code };
  } catch (error) {
    logger.log(`Failed to generate profiles - ${cpuProfDir}`);
    throw error;
  }
}
