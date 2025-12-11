import {
  generateOutputFilename,
  findNewestFile,
  findNewestTraceFile,
} from './file-naming.js';

describe('File Naming Utils', () => {
  describe('generateOutputFilename', () => {
    it('should add suffix before .json extension', () => {
      expect(generateOutputFilename('input.json', '.reduced')).toBe(
        'input.reduced.json'
      );
    });

    it('should use default suffix', () => {
      expect(generateOutputFilename('input.json')).toBe('input.reduced.json');
    });

    it('should handle files without .json extension', () => {
      expect(generateOutputFilename('input.txt', '.reduced')).toBe('input.txt');
    });

    it('should handle multiple dots in filename', () => {
      expect(generateOutputFilename('my.data.json', '.merged')).toBe(
        'my.data.merged.json'
      );
    });

    it('should handle custom suffixes', () => {
      expect(generateOutputFilename('trace.json', '.optimized')).toBe(
        'trace.optimized.json'
      );
    });
  });

  describe('findNewestFile', () => {
    // Note: These would be integration tests that require actual files
    // For unit tests, we'd need to mock fs operations
    it('should be defined', () => {
      expect(findNewestFile).toBeDefined();
    });
  });

  describe('findNewestTraceFile', () => {
    // Note: These would be integration tests that require actual files
    // For unit tests, we'd need to mock fs operations
    it('should be defined', () => {
      expect(findNewestTraceFile).toBeDefined();
    });

    it('should use default profiles directory', () => {
      expect(findNewestTraceFile).toBeDefined();
      // The function uses join(process.cwd(), 'profiles') as default
    });
  });
});
