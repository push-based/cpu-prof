import { afterEach, beforeEach, vi, afterAll } from 'vitest';

/**
 * General-purpose test reset and cleanup utilities.
 * Provides a clean slate for each test by clearing mocks,
 * restoring implementations, and unstubbing environment variables.
 *
 * Note: This is designed to work alongside module-level mocks (like fs/memfs)
 * and only clears/restores spy-based mocks, not vi.mock() module mocks.
 */

// Clear mock usage data and reset state before each test
beforeEach(() => {
  // Clear all mock usage data (call history, etc. mock implementations still exist)
  // This preserves module-level mocks but clears spy usage data
  vi.clearAllMocks();

  // Unstub all environment variables
  vi.unstubAllEnvs();
});

// Restore spy mocks after each test (but preserve module mocks)
afterEach(() => {
  // Only restore spy mocks, not module mocks created with vi.mock()
  // This preserves fs/memfs mocks while cleaning up test-specific spies
  vi.clearAllMocks();
});

// Complete cleanup after all tests
afterAll(() => {
  // Reset environment stubs completely
  vi.unstubAllEnvs();
});
