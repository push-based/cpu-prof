import { MEMFS_VOLUME } from '@push-based/test-utils';
import { vol } from 'memfs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ensureDirectoryExists, splitFilePath } from './file-system.js';

describe('ensureDirectoryExists', () => {
  it('should create a nested folder', async () => {
    vol.fromJSON({}, MEMFS_VOLUME);

    const dir = path.join(MEMFS_VOLUME, 'sub', 'dir');

    await ensureDirectoryExists(dir);
    await expect(
      stat(dir).then(stats => stats.isDirectory()),
    ).resolves.toBeTruthy();
  });
});

describe('splitFilePath', () => {
  it('should extract folders from file path', () => {
    expect(splitFilePath(path.join('src', 'app', 'app.component.ts'))).toEqual({
      folders: ['src', 'app'],
      file: 'app.component.ts',
    });
  });
});
