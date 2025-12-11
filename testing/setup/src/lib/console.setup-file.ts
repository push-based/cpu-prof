import { type MockInstance, afterEach, beforeEach, vi } from 'vitest';

let consoleLogSpy: MockInstance | undefined;
let consoleInfoSpy: MockInstance | undefined;
let consoleWarnSpy: MockInstance | undefined;
let consoleErrorSpy: MockInstance | undefined;
/* eslint-disable @typescript-eslint/no-explicit-any */
const _globalThis = globalThis as any;
beforeEach(() => {
  // In multi-progress-bars, console methods are overriden
  if (console.log != null) {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn);
    _globalThis.consoleLogSpy = consoleLogSpy;
  }

  if (console.info != null) {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(vi.fn);
    _globalThis.consoleInfoSpy = consoleInfoSpy;
  }

  if (console.warn != null) {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn);
    _globalThis.consoleWarnSpy = consoleWarnSpy;
  }

  if (console.error != null) {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn);
    _globalThis.consoleErrorSpy = consoleErrorSpy;
  }
});

afterEach(() => {
  consoleLogSpy?.mockRestore();
  consoleInfoSpy?.mockRestore();
  consoleWarnSpy?.mockRestore();
  consoleErrorSpy?.mockRestore();

  // Cleanup global references
  delete _globalThis.consoleLogSpy;
  delete _globalThis.consoleInfoSpy;
  delete _globalThis.consoleWarnSpy;
  delete _globalThis.consoleErrorSpy;
});
