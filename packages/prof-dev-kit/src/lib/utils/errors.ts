import { ZodError, z } from 'zod/v4';
import { UNICODE_ELLIPSIS, truncateMultilineText } from './formatting.js';

export function stringifyError(
  error: unknown,
  format?: { oneline: boolean }
): string {
  const truncate = (text: string) =>
    format?.oneline ? truncateMultilineText(text) : text;

  if (error instanceof ZodError) {
    const formattedError = z.prettifyError(error);
    if (formattedError.includes('\n')) {
      if (format?.oneline) {
        return `${(error as any).name} [${UNICODE_ELLIPSIS}]`;
      }
      return `${(error as any).name}:\n${formattedError}\n`;
    }
    return `${(error as any).name}: ${formattedError}`;
  }

  if (error instanceof Error) {
    if (error.name === 'Error' || error.message.startsWith(error.name)) {
      return truncate(error.message);
    }
    return truncate(`${error.name}: ${error.message}`);
  }
  if (typeof error === 'string') {
    return truncate(error);
  }
  return JSON.stringify(error);
}
