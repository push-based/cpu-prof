import { describe, it, expect } from 'vitest';
import { osAgnosticPath } from './os-agnostic-paths.js';

describe('osAgnosticPath', () => {
  it('should convert paths to forward slashes', () => {
    const result = osAgnosticPath('path\\to\\file');
    expect(result).toBe('path/to/file');
  });

  it('should handle already forward-slash paths', () => {
    const result = osAgnosticPath('path/to/file');
    expect(result).toBe('path/to/file');
  });
});
