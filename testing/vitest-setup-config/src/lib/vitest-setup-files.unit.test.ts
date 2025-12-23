import { describe, expect, it } from 'vitest';
import type { TestKind } from './vitest-config-factory.js';
import { getSetupFiles } from './vitest-setup-files.js';

describe('getSetupFiles', () => {
  describe('relative paths', () => {
    it.each<TestKind>(['unit', 'int', 'e2e'])(
      'should return paths for %s-test relative to config file location',
      (kind) => {
        const setupFiles = getSetupFiles(kind);
        expect(setupFiles).toSatisfy((files) =>
          files.every((path: string) => /^\.\.\/\.\.\//.test(path))
        );
      }
    );
  });

  describe('return type', () => {
    it('should return an array of strings', () => {
      const setupFiles = getSetupFiles('unit');

      expect(Array.isArray(setupFiles)).toBe(true);
      expect(setupFiles).toSatisfy((files) =>
        files.every((item: unknown) => typeof item === 'string')
      );
    });
  });
});
