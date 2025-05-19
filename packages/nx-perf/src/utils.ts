import { fork, ForkOptions } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { NxPerfOptions, Profile } from './types';

export async function nxRunWithPerfLogging(
  args: string[],
  {
    verbose = false,
    noPatch = false,
    onData = () => {},
    onTraceEvent = () => {},
    onMetadata = () => {},
    beforeExit = () => {},
  }: NxPerfOptions = {}
): Promise<void> {
  const patch = !noPatch;
  // Handle potential undefined from import.meta.resolve
  const nxUrl = (await import.meta.resolve?.('nx')) ?? 'nx';
  const nxPath = fileURLToPath(nxUrl);

  const profile: Profile = {
    metadata: {},
    traceEvents: [],
  };

  const forkOptions: ForkOptions = {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      ...(process.env as Record<string, string>),
      NX_DAEMON: 'false',
      NX_CACHE: 'false',
      NX_PERF_LOGGING: 'true',
    },
    execArgv: patch ? ['--require', './tools/perf_hooks.patch.js'] : [],
  };

  if (verbose) {
    console.log('Forking NX with args:', { nxPath, args, forkOptions });
  }

  const child = fork(nxPath, args, forkOptions);

  child.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      onData(line);
      const res = line.split(':JSON:');

      if (res.length === 2) {
        const [prop, jsonString] = res;
        const perfProfileEvent = JSON.parse(jsonString?.trim() || '{}');
        if (prop === 'traceEvent') {
          onTraceEvent(perfProfileEvent);
          profile.traceEvents.push(perfProfileEvent);
        }
        if (prop === 'metadata') {
          onMetadata(perfProfileEvent);
          profile.metadata = perfProfileEvent;
        }
      }
    }
  });

  child.on('close', () => {
    beforeExit(profile);
  });
}
