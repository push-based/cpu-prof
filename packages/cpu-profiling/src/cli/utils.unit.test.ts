import {
  coerceStringArray,
  coerceNumberArray,
  coerceStringArrayWithDefaults,
  findNewestTraceFile,
  generateOutputFilename,
} from './utils';

describe('CLI Utils', () => {
  describe('coerceStringArray', () => {
    it('should return undefined for false', () => {
      expect(coerceStringArray(false)).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(coerceStringArray(undefined as any)).toBeUndefined();
    });

    it('should split string by comma and trim', () => {
      expect(coerceStringArray('a,b,c')).toEqual(['a', 'b', 'c']);
      expect(coerceStringArray('a, b , c ')).toEqual(['a', 'b', 'c']);
    });

    it('should handle single string', () => {
      expect(coerceStringArray('single')).toEqual(['single']);
    });

    it('should handle array of strings', () => {
      expect(coerceStringArray(['a,b', 'c,d'])).toEqual(['a', 'b', 'c', 'd']);
    });

    it('should trim items in arrays', () => {
      expect(coerceStringArray(['a, b ', ' c,d '])).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    });
  });

  describe('coerceNumberArray', () => {
    it('should return undefined for false', () => {
      expect(coerceNumberArray(false, 'PID')).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      expect(coerceNumberArray(undefined as any, 'PID')).toBeUndefined();
    });

    it('should parse comma-separated string numbers', () => {
      expect(coerceNumberArray('1,2,3', 'PID')).toEqual([1, 2, 3]);
      expect(coerceNumberArray('100, 200 , 300 ', 'TID')).toEqual([
        100, 200, 300,
      ]);
    });

    it('should handle single number string', () => {
      expect(coerceNumberArray('42', 'PID')).toEqual([42]);
    });

    it('should handle array of number strings', () => {
      expect(coerceNumberArray(['1,2', '3,4'], 'PID')).toEqual([1, 2, 3, 4]);
    });

    it('should throw error for invalid PID', () => {
      expect(() => coerceNumberArray('invalid', 'PID')).toThrow(
        'Invalid PID: invalid. PIDs must be numbers.'
      );
    });

    it('should throw error for invalid TID', () => {
      expect(() => coerceNumberArray('1,invalid,3', 'TID')).toThrow(
        'Invalid TID: invalid. TIDs must be numbers.'
      );
    });

    it('should handle mixed valid and invalid numbers', () => {
      expect(() => coerceNumberArray(['1,2', 'invalid,4'], 'PID')).toThrow(
        'Invalid PID: invalid. PIDs must be numbers.'
      );
    });
  });

  describe('coerceStringArrayWithDefaults', () => {
    const defaults = ['default1', 'default2'];

    it('should return empty array for false', () => {
      expect(coerceStringArrayWithDefaults(false, defaults)).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(coerceStringArrayWithDefaults(undefined as any, defaults)).toEqual(
        []
      );
    });

    it('should merge string input with defaults', () => {
      const result = coerceStringArrayWithDefaults('user1,user2', defaults);
      expect(result).toEqual(['default1', 'default2', 'user1', 'user2']);
    });

    it('should merge array input with defaults', () => {
      const result = coerceStringArrayWithDefaults(
        ['user1,user2', 'user3'],
        defaults
      );
      expect(result).toEqual([
        'default1',
        'default2',
        'user1',
        'user2',
        'user3',
      ]);
    });

    it('should deduplicate values', () => {
      const result = coerceStringArrayWithDefaults('default1,user1', defaults);
      expect(result).toEqual(['default1', 'default2', 'user1']);
    });

    it('should return defaults when no defaults provided', () => {
      expect(coerceStringArrayWithDefaults('user1,user2')).toEqual([
        'user1',
        'user2',
      ]);
    });

    it('should handle empty defaults', () => {
      expect(coerceStringArrayWithDefaults('user1,user2', [])).toEqual([
        'user1',
        'user2',
      ]);
    });
  });

  describe('findNewestTraceFile', () => {
    // Note: These would be integration tests that require actual files
    // For unit tests, we'd need to mock fs operations
    it('should be defined', () => {
      expect(findNewestTraceFile).toBeDefined();
    });
  });

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
  });
});
