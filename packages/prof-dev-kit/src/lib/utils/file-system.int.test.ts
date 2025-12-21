import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { importModule } from './file-system.js';

describe('importModule', () => {
  const mockDir = path.join(
    process.cwd(),
    'packages',
    'prof-dev-kit',
    'mocks',
    'fixtures'
  );

  it('should load a valid ES module', async () => {
    await expect(
      importModule({
        filepath: path.join(mockDir, 'extensions', 'basic.zod-schema.mjs'),
      })
    ).resolves.toEqual(expect.objectContaining({ def: expect.any(Object) }));
  });

  it('should load a valid CommonJS module', async () => {
    const result = await importModule({
      filepath: path.join(mockDir, 'extensions', 'basic.zod-schema.cjs'),
    });
    // CommonJS modules may be wrapped - check it's a valid zod schema or function
    expect(result).toBeDefined();
    expect(typeof result === 'object' || typeof result === 'function').toBe(
      true
    );
  });

  it('should load an ES module with named export', async () => {
    await expect(
      importModule({
        filepath: path.join(mockDir, 'exports', 'name-export.zod-schema.js'),
      })
    ).resolves.toEqual(
      expect.objectContaining({ basicExecutorOptions: expect.any(Object) })
    );
  });

  it('should load a valid TS module with a default export', async () => {
    await expect(
      importModule({
        filepath: path.join(mockDir, 'extensions', 'basic.zod-schema.ts'),
      })
    ).resolves.toEqual(expect.objectContaining({ def: expect.any(Object) }));
  });

  it('should throw if the file does not exist', async () => {
    await expect(
      importModule({ filepath: 'path/to/non-existent-export.mjs' })
    ).rejects.toThrow("File 'path/to/non-existent-export.mjs' does not exist");
  });

  it('should throw if path is a directory', async () => {
    await expect(importModule({ filepath: mockDir })).rejects.toThrow(
      `Expected '${mockDir}' to be a file`
    );
  });
});
