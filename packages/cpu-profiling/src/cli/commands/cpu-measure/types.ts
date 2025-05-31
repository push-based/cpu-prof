export interface MeasureArgs {
  // command_to_profile is the first positional argument
  // command_to_profile: string; // This is now part of '--'
  // Arguments for the command_to_profile
  // profiled_command_args?: (string | number)[]; // This is now part of '--'
  // other non-option arguments will be in _
  _?: (string | number)[]; // Yargs populates this with remaining non-option args

  // Arguments after --
  '--'?: (string | number)[];

  // Options for cpu-measure itself
  interval?: number;
  dir?: string;
  name?: string;
  verbose?: boolean;
}
