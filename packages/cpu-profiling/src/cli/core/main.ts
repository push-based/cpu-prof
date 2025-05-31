import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { commands } from './commands';

export async function main(): Promise<void> {
  const cli = yargs(hideBin(process.argv))
    .scriptName('pushbased-profiling')
    .usage(
      'Usage: $0 <command> [options]\n\nPushBased Profiling - Advanced CPU profiling and trace file utilities'
    )
    .demandCommand(0, 1, '', 'Too many commands specified')
    .recommendCommands()
    .strict()
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .wrap(100);

  // Register all commands
  commands.forEach((command) => {
    cli.command(command);
  });

  await cli.parse();
}

export default main;
