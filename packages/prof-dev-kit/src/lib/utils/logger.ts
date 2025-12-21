/* eslint-disable max-lines, no-console, @typescript-eslint/class-methods-use-this */
import ansis, { type AnsiColors } from 'ansis';
import os from 'node:os';
import ora, { type Ora } from 'ora';
import { formatCommandStatus } from './command.js';
import { dateToUnixTimestamp } from './dates.js';
import { isEnvVarEnabled } from './env.js';
import { stringifyError } from './errors.js';
import { formatDuration, indentLines, transformLines } from './formatting.js';
import { settlePromise } from './promises.js';

type GroupColor = Extract<AnsiColors, 'cyan' | 'magenta'>;
type CiPlatform = 'GitHub Actions' | 'GitLab CI/CD';

export type LogOptions = {
  noLineBreak?: boolean;
  noIndent?: boolean;
};

export type DebugLogOptions = LogOptions & {
  force?: boolean;
};

const HEX_RADIX = 16;
const SIGINT_CODE = 2;
const SIGNALS_CODE_OFFSET_UNIX = 128;
const SIGINT_EXIT_CODE_UNIX = SIGNALS_CODE_OFFSET_UNIX + SIGINT_CODE;
const SIGINT_EXIT_CODE_WINDOWS = SIGINT_CODE;

/* eslint-disable max-lines-per-function */
export class Logger {
  #isVerbose = isEnvVarEnabled('ZNX_VERBOSE');
  #isCI = isEnvVarEnabled('CI');
  #ciPlatform: CiPlatform | undefined = isEnvVarEnabled('GITHUB_ACTIONS')
    ? 'GitHub Actions'
    : isEnvVarEnabled('GITLAB_CI')
      ? 'GitLab CI/CD'
      : undefined;
  #groupColor: GroupColor | undefined;

  #groupsCount = 0;
  #activeSpinner: Ora | undefined;
  #activeSpinnerLogs: string[] = [];
  #endsWithBlankLine = false;

  #groupSymbols = {
    start: '❯',
    middle: '│',
    end: '└',
  };

  #sigintListener = () => {
    if (this.#activeSpinner != null) {
      const text = `${this.#activeSpinner.text} ${ansis.red.bold('[SIGINT]')}`;
      if (this.#groupColor) {
        this.#activeSpinner.stopAndPersist({
          text,
          symbol: this.#colorize(this.#groupSymbols.end, this.#groupColor),
        });
        this.#groupColor = undefined;
      } else {
        this.#activeSpinner.fail(text);
      }
      this.#activeSpinner = undefined;
    }
    this.newline();
    this.error(ansis.bold('Cancelled by SIGINT'));
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(
      os.platform() === 'win32'
        ? SIGINT_EXIT_CODE_WINDOWS
        : SIGINT_EXIT_CODE_UNIX,
    );
  };

  error(message: string, options?: LogOptions): void {
    this.#log(message, 'red', options);
  }

  warn(message: string, options?: LogOptions): void {
    this.#log(message, 'yellow', options);
  }

  info(message: string, options?: LogOptions): void {
    this.#log(message, undefined, options);
  }

  debug(message: string, options?: DebugLogOptions): void {
    if (this.#isVerbose || options?.force) {
      this.#log(message, 'gray', options);
    }
  }

  newline(): void {
    this.#log('');
  }

  isVerbose(): boolean {
    return this.#isVerbose;
  }

  setVerbose(isVerbose: boolean): void {
    process.env['ZNX_VERBOSE'] = `${isVerbose}`;
    this.#isVerbose = isVerbose;
  }

  async task(title: string, worker: () => Promise<string>): Promise<void> {
    await this.#spinner(worker, {
      pending: title,
      success: value => value,
      failure: error => `${title} → ${ansis.red(String(error))}`,
    });
  }

  command<T>(
    bin: string,
    worker: () => Promise<T>,
    options?: {
      cwd?: string;
    },
  ): Promise<T> {
    return this.#spinner(worker, {
      pending: formatCommandStatus(bin, options, 'pending'),
      success: () => formatCommandStatus(bin, options, 'success'),
      failure: () => formatCommandStatus(bin, options, 'failure'),
    });
  }

  async group<T = undefined>(
    title: string,
    worker: () => Promise<string | { message: string; result: T }>,
  ): Promise<T> {
    if (this.#groupColor) {
      throw new Error(
        'Internal Logger error - nested groups are not supported',
      );
    }
    if (this.#activeSpinner) {
      throw new Error(
        'Internal Logger error - creating group in active spinner is not supported',
      );
    }

    if (!this.#endsWithBlankLine) {
      this.newline();
    }

    this.#groupColor = this.#groupsCount % 2 === 0 ? 'cyan' : 'magenta';
    this.#groupsCount++;

    const groupMarkers = this.#createGroupMarkers();

    console.log(groupMarkers.start(title));

    const start = performance.now();
    const result = await settlePromise(worker());
    const end = performance.now();

    if (result.status === 'fulfilled') {
      const message =
        typeof result.value === 'string' ? result.value : result.value.message;
      console.log(
        [
          this.#colorize(this.#groupSymbols.end, this.#groupColor),
          this.#colorize(message, 'green'),
          this.#formatDurationSuffix({ start, end }),
        ].join(' '),
      );
    } else {
      console.log(
        [
          this.#colorize(this.#groupSymbols.end, this.#groupColor),
          this.#colorize(
            `${stringifyError(result.reason, { oneline: true })}`,
            'red',
          ),
        ].join(' '),
      );
    }

    const endMarker = groupMarkers.end();
    if (endMarker) {
      console.log(endMarker);
    }
    this.#groupColor = undefined;
    this.newline();

    if (result.status === 'rejected') {
      throw result.reason;
    }

    if (typeof result.value === 'object') {
      return result.value.result;
    }
    return undefined as T;
  }

  #createGroupMarkers(): {
    start: (title: string) => string;
    end: () => string;
  } {
    switch (this.#ciPlatform) {
      case 'GitHub Actions':
        return {
          start: title =>
            `::group::${this.#formatGroupTitle(title, { prefix: false })}`,
          end: () => '::endgroup::',
        };
      case 'GitLab CI/CD':
        const ansiEscCode = '\u001B[0K';
        const id = Math.random().toString(HEX_RADIX).slice(2);
        const sectionId = `code_pushup_logs_group_${id}`;
        return {
          start: title => {
            const sectionHeader = this.#formatGroupTitle(title, {
              prefix: true,
            });
            const options = this.#isVerbose ? '' : '[collapsed=true]';
            return `${ansiEscCode}section_start:${dateToUnixTimestamp(new Date())}:${sectionId}${options}\r${ansiEscCode}${sectionHeader}`;
          },
          end: () =>
            `${ansiEscCode}section_end:${dateToUnixTimestamp(new Date())}:${sectionId}\r${ansiEscCode}`,
        };
      case undefined:
        return {
          start: title => this.#formatGroupTitle(title, { prefix: true }),
          end: () => '',
        };
    }
  }

  #formatGroupTitle(title: string, symbols: { prefix: boolean }): string {
    const text = symbols.prefix
      ? `${this.#groupSymbols.start} ${title}`
      : title;
    return ansis.bold(this.#colorize(text, this.#groupColor));
  }

  async #spinner<T>(
    worker: () => Promise<T>,
    messages: {
      pending: string;
      success: (value: T) => string;
      failure: (error: unknown) => string;
    },
  ): Promise<T> {
    if (this.#activeSpinner) {
      throw new Error(
        'Internal Logger error - concurrent spinners are not supported',
      );
    }

    process.removeListener('SIGINT', this.#sigintListener);
    process.addListener('SIGINT', this.#sigintListener);

    if (this.#groupColor) {
      this.#activeSpinner = ora({
        text: messages.pending,
        spinner: 'line',
        color: this.#groupColor,
        stream: process.stdout,
      });
      if (this.#isCI) {
        console.log(this.#format(messages.pending, undefined));
      } else {
        this.#activeSpinner.start();
      }
    } else {
      this.#activeSpinner = ora({
        text: messages.pending,
        stream: process.stdout,
      });
      this.#activeSpinner.start();
    }

    this.#endsWithBlankLine = false;

    const start = performance.now();
    const result = await settlePromise(worker());
    const end = performance.now();

    const text =
      result.status === 'fulfilled'
        ? [
            messages.success(result.value),
            this.#formatDurationSuffix({ start, end }),
          ].join(' ')
        : messages.failure(stringifyError(result.reason, { oneline: true }));

    if (this.#activeSpinner) {
      if (this.#groupColor) {
        this.#activeSpinner.stopAndPersist({
          text,
          symbol: this.#colorize(this.#groupSymbols.middle, this.#groupColor),
        });
      } else {
        if (result.status === 'fulfilled') {
          this.#activeSpinner.succeed(text);
        } else {
          this.#activeSpinner.fail(text);
        }
      }
      this.#endsWithBlankLine = false;
    }

    this.#activeSpinner = undefined;
    this.#activeSpinnerLogs.forEach(message => {
      this.#log(indentLines(message, 2));
    });
    this.#activeSpinnerLogs = [];
    process.removeListener('SIGINT', this.#sigintListener);

    if (result.status === 'rejected') {
      throw result.reason;
    }

    return result.value;
  }

  #log(message: string, color?: AnsiColors, options?: LogOptions): void {
    const print: (text: string) => void = options?.noLineBreak
      ? text => process.stdout.write(text)
      : console.log;

    if (this.#activeSpinner) {
      if (this.#activeSpinner.isSpinning) {
        this.#activeSpinnerLogs.push(this.#format(message, color));
      } else {
        const indented =
          options?.noIndent || !message ? message : indentLines(message, 2);
        print(this.#format(indented, color));
      }
    } else {
      print(this.#format(message, color));
    }
    this.#endsWithBlankLine =
      (!message || message.endsWith('\n')) && !options?.noIndent;
  }

  #format(message: string, color: AnsiColors | undefined): string {
    if (!this.#groupColor || this.#activeSpinner?.isSpinning) {
      return this.#colorize(message, color);
    }
    return transformLines(
      message,
      line =>
        `${this.#colorize('│', this.#groupColor)} ${this.#colorize(line, color)}`,
    );
  }

  #colorize(text: string, color: AnsiColors | undefined): string {
    if (!color) {
      return text;
    }
    return ansis[color](text);
  }

  #formatDurationSuffix({
    start,
    end,
  }: {
    start: number;
    end: number;
  }): string {
    const duration = formatDuration(end - start);
    return ansis.gray(`(${duration})`);
  }
}
/* eslint-enable max-lines-per-function */

export const logger = new Logger();
