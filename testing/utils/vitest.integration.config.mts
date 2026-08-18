import { defineConfig } from 'vitest/config';
import { createSharedIntegrationVitestConfig } from '@push-based/testing-vitest-setup';

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
