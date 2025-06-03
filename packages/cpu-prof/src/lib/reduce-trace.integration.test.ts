import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Mock fs module at the top level
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

import { reduceTraceFile } from './reduce-trace';
import * as fs from 'fs';

describe('reduceTraceFile (integration)', () => {
  const __dirname = fileURLToPath(new URL('.', import.meta.url));
  const tmpDir = join(__dirname, '../../../tmp/reduce-trace-test');
  const mockInputFile = join(tmpDir, 'input.json');
  const mockOutputFile = join(tmpDir, 'output.json');

  beforeAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    await mkdir(tmpDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should read input file, process trace data, and write output file', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        traceEvents: [
          { name: 'Regular' },
          { name: 'ResourceSendRequest', cat: 'netlog' },
        ],
      })
    );

    const result = reduceTraceFile(mockInputFile, mockOutputFile, {
      filterNetwork: true,
    });

    expect(fs.readFileSync).toHaveBeenCalledWith(mockInputFile, 'utf8');
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockOutputFile,
      expect.stringContaining('Regular'),
      'utf8'
    );
    expect(result.inputFile).toBe(mockInputFile);
    expect(result.outputFile).toBe(mockOutputFile);
    expect(result.originalEventCount).toBe(2);
    expect(result.filteredEventCount).toBe(1);
  });

  it('should use default filter options when none provided', () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        traceEvents: [{ name: 'Regular' }],
      })
    );

    const result = reduceTraceFile(mockInputFile, mockOutputFile);

    expect(result.originalEventCount).toBe(1);
    expect(result.filteredEventCount).toBe(1);
  });
});
