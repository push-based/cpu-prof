// yargs->runCommand->invokeTaskRunner -> defaultTaskRunner -> TaskOrchestrator -> runAllTasks -> getCache
// ->nxCloudTaskRunner

- NxCli:(p:1,t:0): nx affected -t build --skipNxCache

  - NxRun:(pkg-ts:build): tsc --build tsconfig.lib.json
  - NxRun:(pkg-rollup:build): rollup -c rollup.config.cjs
  - NxRun:(pkg-vite:build): vite -c vite.config.ts
  - NxRun(app-angular:build): ng build --configuration=production
  - - NgRun(p:3,t:1): esbuild --configuration=production
  - - NgRun(p:3,t:2): transformScssToCss --configuration=production
  - - NgRun(p:3,t:3): vitest --configuration=production

  - Nx Task(p:2,t:0): nx run pkg-1:build
  - Nx Task(p:2,t:0): tsc --build tsconfig.lib.json
  - Run Task(pkg-1:build): tsc --build tsconfig.lib.json
  -
  - Nx Task(p:3,t:0): nx run pkg-2:build
  - Nx Task(p:3,t:0): rollup -c rollup.config.cjs
  - Nx Task(pkg-2:build): rollup -c rollup.config.cjs

  - Nx Task(@org/angular-app-1:build): ng build --configuration=production

    - Ng Task(p:3,t:1): esbuild --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
    - Ng Task(p:3,t:2): transformScssToCss --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
    - Ng Task(p:3,t:3): vitest --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false

  - Nx Task(p:2,t:0): nx run @org/angular-app-1:build --config=packages/angular-app-1/angular.json
  - NgCli(p:3,t:0): ng build --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
    - Ng Task(p:3,t:1): esbuild --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
    - Ng Task(p:3,t:2): transformScssToCss --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
    - Ng Task(p:3,t:3): vitest --configuration=production --output-path=dist/angular-app-1 --source-map=false --optimization=true --vendor-chunk=false --named-chunks=false --build-optimizer=true --aot=true --progress=false
  - Nx Task(p:4,t:0): nx run @org/ts-lib-1:build --config=packages/ts-lib-1/tsconfig.build.json

// vite-plugin: buildStart ->
// typescript: -> createProgram

> nx run @dummy/pkg-1:build

> rollup -c rollup.config.cjs
