export const UNICODE_ELLIPSIS = '…';

function roundDecimals(value: number, maxDecimals: number) {
  const multiplier = Math.pow(10, maxDecimals);
  return Math.round(value * multiplier) / multiplier;
}

export function formatDuration(ms: number, maxDecimals: number = 2): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${roundDecimals(ms / 1000, maxDecimals)} s`;
}

export function truncateMultilineText(
  text: string,
  options?: { ellipsis?: string },
): string {
  const { ellipsis = `[${UNICODE_ELLIPSIS}]` } = options ?? {};

  const crlfIndex = text.indexOf('\r\n');
  const lfIndex = text.indexOf('\n');
  const index = crlfIndex === -1 ? lfIndex : crlfIndex;

  if (index < 0) {
    return text;
  }

  const firstLine = text.slice(0, index);
  if (text.slice(index).trim().length === 0) {
    return firstLine;
  }
  return `${firstLine} ${ellipsis}`;
}

export function transformLines(
  text: string,
  fn: (line: string) => string,
): string {
  return text.split(/\r?\n/).map(fn).join('\n');
}

export function indentLines(text: string, identation: number): string {
  return transformLines(text, line => `${' '.repeat(identation)}${line}`);
}
