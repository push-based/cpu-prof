export interface MeasureArgs {
  // command_to_profile is the first positional argument
  command_to_profile: string;
  // other non-option arguments will be in _
  _?: (string | number)[]; // Yargs populates this with remaining non-option args

  // Options for cpu-measure itself
  interval?: number;
  dir?: string;
  name?: string;
  verbose?: boolean;
}
