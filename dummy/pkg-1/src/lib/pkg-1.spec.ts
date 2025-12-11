import { pkg1 } from './pkg-1.js';

describe('pkg1', () => {
  it('should work', () => {
    expect(pkg1()).toBe('pkg-1');
  });
});
