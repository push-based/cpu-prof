import { type MockInstance, afterEach, beforeEach, vi } from 'vitest';

let consoleLogSpy: MockInstance | undefined;
let consoleInfoSpy: MockInstance | undefined;
let consoleWarnSpy: MockInstance | undefined;
let consoleErrorSpy: MockInstance | undefined;

beforeEach(() => {
  // In multi-progress-bars, console methods are overriden
  if (console.log != null) {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    (globalThis as any).consoleLogSpy = consoleLogSpy;
  }

  if (console.info != null) {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    (globalThis as any).consoleInfoSpy = consoleInfoSpy;
  }

  if (console.warn != null) {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as any).consoleWarnSpy = consoleWarnSpy;
  }

  if (console.error != null) {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (globalThis as any).consoleErrorSpy = consoleErrorSpy;
  }
});

afterEach(() => {
  consoleLogSpy?.mockRestore();
  consoleInfoSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();

  // Clean up global references
  delete (globalThis as any).consoleLogSpy;
  delete (globalThis as any).consoleInfoSpy;
  delete (globalThis as any).consoleWarnSpy;
  delete (globalThis as any).consoleErrorSpy;
});
