import { defineConfig } from 'vitest/config';
import { createSharedIntegrationVitestConfig } from '../vitest-setup/src/lib/configuration';

export default defineConfig(() => {
  const baseConfig = createSharedIntegrationVitestConfig({
    projectRoot: __dirname,
    workspaceRoot: '../..',
  });

  return {
    ...baseConfig,
    plugins: [],
  };
});
