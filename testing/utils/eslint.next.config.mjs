import tseslint from 'typescript-eslint';
import baseConfig from '../../eslint.config.mjs';

export default tseslint.config(...baseConfig, {
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
