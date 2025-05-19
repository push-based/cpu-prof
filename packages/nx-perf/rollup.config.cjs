const { withNx } = require('@nx/rollup/with-nx');

module.exports = withNx(
  {
    main: './src/index.ts',
    additionalEntryPoints: ['./src/bin.ts', './src/postinstall.ts'],
    outputPath: './dist',
    tsConfig: './tsconfig.lib.json',
    compiler: 'swc',
    format: ['esm', 'cjs'],
    assets: [
      { input: './packages/nx-perf', glob: './package.json', output: '.' },
      { input: './packages/nx-perf', glob: './README.md', output: '.' },
      { input: './packages/nx-perf', glob: './docs/*', output: './docs' },
    ],
  },
  {
    // Provide additional rollup configuration here. See: https://rollupjs.org/configuration-options
    // e.g.
    // output: { sourcemap: true },
  }
);
