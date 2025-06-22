// This file might still contain other types if they were not moved.
// The following types were moved to packages/cpu-prof/src/lib/eslint-stats/types.ts:
// RuleTiming, Rules, Pass, Times, Stats, LintMessage, UsedDeprecatedRule, LintResult, LintResults, AggregatedRuleTimes, TimingEnvValue
// If no other types are in this file, it could potentially be deleted or repurposed.

/**
 * Represents the timing information for a single ESLint rule or a parsing/fixing step.
 */
export interface RuleTiming {
  /** The total time spent, in milliseconds. */
  total: number;
}

/**
 * A map of ESLint rule names to their respective timing information.
 * Keys are rule names (e.g., "no-unused-vars"), and values are `RuleTiming` objects.
 */
export interface Rules {
  [ruleName: string]: RuleTiming;
}

/**
 * Represents timing information for a single pass of ESLint over a file.
 * This can include time spent parsing, executing rules, and applying fixes.
 */
export interface Pass {
  /** Timing information for the parsing phase. */
  parse?: RuleTiming;
  /** Timing information for individual rules. */
  rules: Rules;
  /** Timing information for the fixing phase. */
  fix?: RuleTiming;
  /** Total time for this pass, including parsing, rules, and fixes. */
  total?: number;
}

/**
 * Contains an array of timing information for all passes ESLint made over a file.
 */
export interface Times {
  /** An array of `Pass` objects, one for each pass ESLint made. */
  passes: Pass[];
}

/**
 * Contains detailed performance statistics for linting a single file.
 */
export interface Stats {
  /** Timing information for parsing, rule execution, and fixing, organized by passes. */
  times: Times;
  /** The number of times ESLint applied at least one fix after linting. */
  fixPasses?: number;
}

/**
 * Represents a single linting message (error or warning) from ESLint.
 */
export interface LintMessage {
  /** The ID of the rule that generated the message, or null if it's a core parser error. */
  ruleId: string | null;
  /** The severity of the message (e.g., 1 for warning, 2 for error). */
  severity: number;
  /** The actual message text. */
  message: string;
  /** The 1-based line number where the issue occurred. */
  line: number;
  /** The 1-based column number where the issue occurred. */
  column: number;
  /** The type of the AST node that caused the message, or null. */
  nodeType: string | null;
  /** A machine-readable ID for the message. */
  messageId?: string;
  /** The 1-based line number where the issue ends. */
  endLine?: number;
  /** The 1-based column number where the issue ends. */
  endColumn?: number;
  /** Information about the fix, if available and applicable. */
  fix?: {
    /** The range in the source code to be replaced. */
    range: [number, number];
    /** The text to replace the specified range with. */
    text: string;
  };
}

/**
 * Information about a deprecated ESLint rule that was used during linting.
 */
export interface UsedDeprecatedRule {
  /** The ID of the deprecated rule. */
  ruleId: string;
  /** An array of rule IDs that replace the deprecated rule. */
  replacedBy: string[];
  /** Additional information about the deprecation. */
  info?: Record<string, any>;
}

/**
 * Represents the complete ESLint result for a single file.
 */
export interface LintResult {
  /** The absolute path to the linted file. */
  filePath: string;
  /** An array of `LintMessage` objects representing errors and warnings. */
  messages: LintMessage[];
  /** An array of `LintMessage` objects that were suppressed by comments. */
  suppressedMessages: LintMessage[];
  /** The total number of errors for this file. */
  errorCount: number;
  /** The total number of fatal errors (parser errors) for this file. */
  fatalErrorCount: number;
  /** The total number of warnings for this file. */
  warningCount: number;
  /** The number of errors that can be automatically fixed. */
  fixableErrorCount: number;
  /** The number of warnings that can be automatically fixed. */
  fixableWarningCount: number;
  /** Performance statistics for linting this file. */
  stats: Stats;
  /** An array of deprecated rules that were used. */
  usedDeprecatedRules?: UsedDeprecatedRule[];
  /** The source code of the file, if available. */
  source?: string;
}

/**
 * Represents an array of `LintResult` objects, typically the top-level structure
 * of an ESLint JSON output when linting multiple files.
 */
export type LintResults = LintResult[];

/**
 * Represents the aggregated rule timing data.
 * Keys are rule names (strings), and values are their total execution time (numbers in milliseconds).
 */
export interface AggregatedRuleTimes {
  [ruleName: string]: number;
}

/**
 * Describes the possible values for the TIMING environment variable.
 * - `undefined`: Timing is disabled or uses a default.
 * - `'all'`: All items should be shown/processed.
 * - `string`: A numeric string (e.g., "10", "20") indicating a specific count.
 */
export type TimingEnvValue = 'all' | string | undefined;
