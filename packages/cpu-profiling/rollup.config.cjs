const { withNx } = require('@nx/rollup/with-nx');

module.exports = withNx(
  {
    main: './src/index.ts',
    additionalEntryPoints: ['./src/bin/cpu-prof.ts'],
    outputPath: './dist',
    tsConfig: './tsconfig.lib.json',
    compiler: 'swc',
    assets: [
      {
        input: './packages/cpu-profiling',
        glob: './package.json',
        output: '.',
      },
      { input: './packages/cpu-profiling', glob: './README.md', output: '.' },
    ],
    // output: { sourcemap: true }, // Example, if needed
  }
  // Removed the second argument to withNx, as it was causing issues with output formats.
  // withNx will handle ESM and CJS outputs automatically.
);
