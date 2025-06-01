export function filterCliOptions(
  commandOptions: Record<string, any>
): Record<string, any> {
  const filteredCommandOptions: Record<string, any> = {};
  for (const key in commandOptions) {
    if (Object.prototype.hasOwnProperty.call(commandOptions, key)) {
      // If the key is camelCase and its kebab-case version also exists, skip the camelCase version.
      // This prevents duplicate arguments like --foo-bar and --fooBar when yargs provides both.
      const kebabKey = key.replace(
        /[A-Z]/g,
        (letter) => `-${letter.toLowerCase()}`
      );
      if (key !== kebabKey && commandOptions[kebabKey] !== undefined) {
        continue;
      }
      filteredCommandOptions[key] = commandOptions[key];
    }
  }
  return filteredCommandOptions;
}
