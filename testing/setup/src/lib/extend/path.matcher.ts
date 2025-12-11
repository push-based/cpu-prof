import { expect } from 'vitest';
import { join, resolve, isAbsolute, relative } from 'node:path';

export interface CustomPathMatchers {
  toBeAbsolutePath(): void;
  toBeRelativePath(): void;
  toHaveExtension(extension: string): void;
  toBeChildOf(parentPath: string): void;
}

export interface CustomAsymmetricPathMatchers {
  toBeAbsolutePath(): any;
  toBeRelativePath(): any;
  toHaveExtension(extension: string): any;
  toBeChildOf(parentPath: string): any;
}

expect.extend({
  toBeAbsolutePath(received: string) {
    const pass = isAbsolute(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be an absolute path`
          : `Expected "${received}" to be an absolute path`,
    };
  },

  toBeRelativePath(received: string) {
    const pass = !isAbsolute(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a relative path`
          : `Expected "${received}" to be a relative path`,
    };
  },

  toHaveExtension(received: string, extension: string) {
    const normalizedExtension = extension.startsWith('.') ? extension : `.${extension}`;
    const pass = received.endsWith(normalizedExtension);
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to have extension "${normalizedExtension}"`
          : `Expected "${received}" to have extension "${normalizedExtension}"`,
    };
  },

  toBeChildOf(received: string, parentPath: string) {
    const resolvedReceived = resolve(received);
    const resolvedParent = resolve(parentPath);
    const relativePath = relative(resolvedParent, resolvedReceived);
    const pass = !relativePath.startsWith('..') && !isAbsolute(relativePath);
    
    return {
      pass,
      message: () =>
        pass
          ? `Expected "${received}" not to be a child of "${parentPath}"`
          : `Expected "${received}" to be a child of "${parentPath}"`,
    };
  },
});