import { describe, expect, it } from 'vitest';
import { objectToCliArgs, toPascalCaseSchemaName } from './transform.js';

describe('objectToCliArgs', () => {
  it('should handle the "_" argument as script', () => {
    const params = { _: 'bin.js' };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['bin.js']);
  });

  it('should handle the "_" argument with multiple values', () => {
    const params = { _: ['bin.js', '--help'] };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['bin.js', '--help']);
  });

  it('should handle shorthands arguments', () => {
    const params = {
      e: `test`,
    };
    const result = objectToCliArgs(params);
    expect(result).toEqual([`-e="${params.e}"`]);
  });

  it('should handle string arguments', () => {
    const params = { name: 'Juanita' };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['--name="Juanita"']);
  });

  it('should handle number arguments', () => {
    const params = { parallel: 5 };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['--parallel=5']);
  });

  it('should handle boolean arguments', () => {
    const params = { verbose: true };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['--verbose']);
  });

  it('should handle negated boolean arguments', () => {
    const params = { verbose: false };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['--no-verbose']);
  });

  it('should handle array of string arguments', () => {
    const params = { format: ['json', 'md'] };
    const result = objectToCliArgs(params);
    expect(result).toEqual(['--format="json"', '--format="md"']);
  });

  it('should handle nested objects', () => {
    const params = { persist: { format: ['json', 'md'], verbose: false } };
    const result = objectToCliArgs(params);
    expect(result).toEqual([
      '--persist.format="json"',
      '--persist.format="md"',
      '--no-persist.verbose',
    ]);
  });

  it('should handle objects with undefined or null', () => {
    const params = { format: undefined };
    const result = objectToCliArgs(params);
    expect(result).toStrictEqual([]);
  });

  it('should throw error for unsupported type', () => {
    const params = { unsupported: Symbol('test') as any };
    expect(() => objectToCliArgs(params)).toThrow('Unsupported type');
  });
});

describe('toPascalCaseSchemaName', () => {
  it('should convert default export to DefaultSchema', () => {
    expect(toPascalCaseSchemaName('default')).toBe('DefaultSchema');
  });

  it('should convert camelCase export names to PascalCase with Schema suffix', () => {
    expect(toPascalCaseSchemaName('basicExecutorOptions')).toBe(
      'BasicExecutorOptionsSchema',
    );
    expect(toPascalCaseSchemaName('myOptions')).toBe('MyOptionsSchema');
    expect(toPascalCaseSchemaName('userConfig')).toBe('UserConfigSchema');
  });

  it('should convert kebab-case export names to PascalCase with Schema suffix', () => {
    expect(toPascalCaseSchemaName('my-config')).toBe('MyConfigSchema');
    expect(toPascalCaseSchemaName('user-settings')).toBe('UserSettingsSchema');
    expect(toPascalCaseSchemaName('basic-executor-options')).toBe(
      'BasicExecutorOptionsSchema',
    );
  });

  it('should convert snake_case export names to PascalCase with Schema suffix', () => {
    expect(toPascalCaseSchemaName('user_settings')).toBe('UserSettingsSchema');
    expect(toPascalCaseSchemaName('my_config')).toBe('MyConfigSchema');
    expect(toPascalCaseSchemaName('basic_executor_options')).toBe(
      'BasicExecutorOptionsSchema',
    );
  });

  it('should not duplicate Schema suffix if already present', () => {
    expect(toPascalCaseSchemaName('testSchema')).toBe('TestSchema');
    expect(toPascalCaseSchemaName('MyExecutorSchema')).toBe('MyExecutorSchema');
    expect(toPascalCaseSchemaName('basicSchema')).toBe('BasicSchema');
  });

  it('should handle mixed case and special characters', () => {
    expect(toPascalCaseSchemaName('My-Special_Config')).toBe(
      'MySpecialConfigSchema',
    );
    expect(toPascalCaseSchemaName('testConfigOptions')).toBe(
      'TestConfigOptionsSchema',
    );
  });

  it('should handle single words', () => {
    expect(toPascalCaseSchemaName('config')).toBe('ConfigSchema');
    expect(toPascalCaseSchemaName('options')).toBe('OptionsSchema');
  });
});
