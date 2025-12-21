import { vi } from 'vitest';

// Mock console methods to prevent test output pollution
vi.stubGlobal('console', {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  assert: vi.fn(),
  clear: vi.fn(),
  count: vi.fn(),
  countReset: vi.fn(),
  dir: vi.fn(),
  dirxml: vi.fn(),
  group: vi.fn(),
  groupCollapsed: vi.fn(),
  groupEnd: vi.fn(),
  table: vi.fn(),
  time: vi.fn(),
  timeEnd: vi.fn(),
  timeLog: vi.fn(),
  profile: vi.fn(),
  profileEnd: vi.fn(),
});
