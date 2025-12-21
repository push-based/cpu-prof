import ansis from 'ansis';
import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  indentLines,
  transformLines,
  truncateMultilineText,
} from './formatting.js';

describe('formatDuration', () => {
  it.each([
    [-1, '-1 ms'],
    [0, '0 ms'],
    [23, '23 ms'],
    [891, '891 ms'],
    [499.85, '500 ms'],
    [1200, '1.2 s'],
    [56_789, '56.79 s'],
    [60_000, '60 s'],
  ])('should format duration of %s milliseconds as %s', (ms, displayValue) => {
    expect(formatDuration(ms)).toBe(displayValue);
  });
});

describe('transformMultilineText', () => {
  it('should replace additional lines with an ellipsis', () => {
    const error = `SchemaValidationError: Invalid CoreConfig in push-based.config.ts file
✖ Invalid input: expected array, received undefined
  → at plugins`;
    expect(truncateMultilineText(error)).toBe(
      'SchemaValidationError: Invalid CoreConfig in push-based.config.ts file […]',
    );
  });

  it('should leave one-liner texts unchanged', () => {
    expect(truncateMultilineText('Hello, world!')).toBe('Hello, world!');
  });

  it('should omit ellipsis if additional lines have no non-whitespace characters', () => {
    expect(truncateMultilineText('- item 1\n  \n\n')).toBe('- item 1');
  });
});

describe('transformLines', () => {
  it('should apply custom transformation to each line', () => {
    let count = 0;
    expect(
      transformLines(
        `export function greet(name = 'World') {\n  console.log('Hello, ' + name + '!');\n}\n`,
        line => {
          const prefix = `${++count} | `;
          return `${ansis.gray(prefix)}${line}`;
        },
      ),
    ).toBe(
      `
${ansis.gray('1 | ')}export function greet(name = 'World') {
${ansis.gray('2 | ')}  console.log('Hello, ' + name + '!');
${ansis.gray('3 | ')}}
${ansis.gray('4 | ')}`.trimStart(),
    );
  });

  it('should support CRLF line endings', () => {
    expect(
      transformLines(
        'ESLint v9.16.0\r\n\r\nAll files pass linting.\r\n',
        line => `> ${line}`,
      ),
    ).toBe(
      `
> ESLint v9.16.0
> 
> All files pass linting.
> `.trimStart(),
    );
  });
});

describe('indentLines', () => {
  it('should indent each line by given number of spaces', () => {
    expect(indentLines('ESLint v9.16.0\n\nAll files pass linting.\n', 2)).toBe(
      `
  ESLint v9.16.0
  
  All files pass linting.
  `.slice(1), // ignore first line break
    );
  });
});
