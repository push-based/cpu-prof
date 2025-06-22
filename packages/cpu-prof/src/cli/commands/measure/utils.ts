export function filterKebabCase(
  commandOptions: Record<string, unknown>
): Record<string, unknown> {
  const filteredCommandOptions: Record<string, unknown> = {};
  for (const key in commandOptions) {
    if (Object.prototype.hasOwnProperty.call(commandOptions, key)) {
      // Exclude all keys that contain dashes (kebab-case)
      if (key.includes('-')) {
        continue;
      }
      filteredCommandOptions[key] = commandOptions[key];
    }
  }
  return filteredCommandOptions;
}
