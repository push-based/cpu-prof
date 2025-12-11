/**
 * Helper function to coerce string array arguments from CLI input
 */
export function coerceStringArray(
  arg: string[] | string | boolean
): string[] | undefined {
  if (arg === false || arg === undefined) {
    return undefined;
  }
  if (typeof arg === 'string') {
    return arg.split(',').map((item: string) => item.trim());
  }
  if (Array.isArray(arg)) {
    return arg.flatMap((item: string) =>
      item.split(',').map((s: string) => s.trim())
    );
  }
  return undefined;
}

/**
 * Helper function to coerce number array arguments from CLI input
 */
export function coerceNumberArray(
  arg: string[] | string | boolean,
  type: 'PID' | 'TID'
): number[] | undefined {
  if (arg === false || arg === undefined) {
    return undefined;
  }
  const values =
    typeof arg === 'string'
      ? arg.split(',')
      : Array.isArray(arg)
        ? arg.flatMap((item: string) => item.split(','))
        : [];
  return values.map((id: string) => {
    const numId = Number.parseInt(id.trim(), 10);
    if (isNaN(numId)) {
      throw new TypeError(`Invalid ${type}: ${id}. ${type}s must be numbers.`);
    }
    return numId;
  });
}

/**
 * Helper function to coerce string array arguments with default values
 */
export function coerceStringArrayWithDefaults(
  arg: string[] | string | boolean,
  defaults: string[] = []
): string[] {
  // Handle yargs negation (--no-exclude-*)
  if (arg === false || arg === undefined) {
    return [];
  }

  if (typeof arg === 'string') {
    const userValues = arg.split(',').map((item: string) => item.trim());
    return [...new Set([...defaults, ...userValues])];
  }
  if (Array.isArray(arg)) {
    const userValues = arg.flatMap((item: string) =>
      item.split(',').map((s: string) => s.trim())
    );
    return [...new Set([...defaults, ...userValues])];
  }
  return defaults;
}
