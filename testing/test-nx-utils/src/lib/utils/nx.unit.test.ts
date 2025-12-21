import { MEMFS_VOLUME } from '@push-based/test-utils';
import { describe, expect } from 'vitest';
import { executorContext } from './nx.js';

describe('executorContext', () => {
  it('should create context for given project name', () => {
    expect(executorContext('my-lib')).toStrictEqual({
      cwd: MEMFS_VOLUME,
      isVerbose: false,
      projectName: 'my-lib',
      projectsConfigurations: {
        projects: {
          'my-lib': {
            name: 'my-lib',
            root: 'libs/my-lib',
          },
        },
        version: 1,
      },
      root: '.',
      nxJsonConfiguration: {},
      projectGraph: {
        dependencies: {},
        nodes: {},
      },
    });
  });

  it('should create context for given project options', () => {
    expect(
      executorContext({ projectName: 'other-lib', cwd: '<CWD>' })
    ).toStrictEqual({
      cwd: '<CWD>',
      isVerbose: false,
      projectName: 'other-lib',
      projectsConfigurations: {
        projects: {
          'other-lib': {
            name: 'other-lib',
            root: 'libs/other-lib',
          },
        },
        version: 1,
      },
      root: '.',
      nxJsonConfiguration: {},
      projectGraph: {
        dependencies: {},
        nodes: {},
      },
    });
  });
});
