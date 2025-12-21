import { coerceBooleanValue, isEnvVarEnabled } from './env.js';

describe('isEnvVarEnabled', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('should consider missing variable disabled', () => {
    vi.stubEnv('ZNX_VERBOSE', undefined!);
    expect(isEnvVarEnabled('ZNX_VERBOSE')).toBeFalse();
  });

  it('should consider "true" enabled', () => {
    vi.stubEnv('ZNX_VERBOSE', 'true');
    expect(isEnvVarEnabled('ZNX_VERBOSE')).toBeTrue();
  });

  it('should consider "false" disabled', () => {
    vi.stubEnv('ZNX_VERBOSE', 'false');
    expect(isEnvVarEnabled('ZNX_VERBOSE')).toBeFalse();
  });

  it('should consider "1" enabled', () => {
    vi.stubEnv('ZNX_VERBOSE', '1');
    expect(isEnvVarEnabled('ZNX_VERBOSE')).toBeTrue();
  });

  it('should consider "0" disabled', () => {
    vi.stubEnv('ZNX_VERBOSE', '0');
    expect(isEnvVarEnabled('ZNX_VERBOSE')).toBeFalse();
  });
});

describe('coerceBooleanValue', () => {
  it.each([
    [true, true],
    [false, false],
    ['true', true],
    ['false', false],
    ['True', true],
    ['False', false],
    ['TRUE', true],
    ['FALSE', false],
    ['on', true],
    ['off', false],
    ['yes', true],
    ['no', false],
    ['1', true],
    ['0', false],
    ['42', true],
    ['unknown', undefined],
    [null, undefined],
    [undefined, undefined],
  ])('should coerce value %j to %j', (input, expected) => {
    expect(coerceBooleanValue(input)).toBe(expected);
  });
});
