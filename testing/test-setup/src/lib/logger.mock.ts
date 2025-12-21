import ansis from 'ansis';
import cliSpinners from 'cli-spinners';
import { vi } from 'vitest';

// Mock the prof-dev-kit logger
vi.mock('@push-based/prof-dev-kit', async () => {
  const actual = await vi.importActual<any>('@push-based/prof-dev-kit');
  return {
    ...actual,
    logger: {
      ...actual.logger,
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      newline: vi.fn(),
      task: vi
        .fn()
        .mockImplementation((title: string, worker: () => Promise<any>) =>
          worker()
        ),
      command: vi
        .fn()
        .mockImplementation((bin: string, worker: () => Promise<any>) =>
          worker()
        ),
      group: vi
        .fn()
        .mockImplementation((title: string, worker: () => Promise<any>) =>
          worker()
        ),
    },
  };
});

// customize ora options for test environment
vi.mock('ora', async () => {
  const oraDefault = (await vi.importActual<any>('ora')).default;

  const mockOra = (options: string | import('ora').Options | undefined) => {
    const spinner = oraDefault({
      // skip cli-cursor package
      hideCursor: false,
      // skip is-interactive package
      isEnabled: process.env['CI'] !== 'true',
      // skip is-unicode-supported package
      spinner: cliSpinners.dots,
      // preserve other options
      ...(typeof options === 'string' ? { text: options } : options),
    });
    // skip log-symbols package
    vi.spyOn(spinner, 'succeed').mockImplementation((text?: any) =>
      spinner.stopAndPersist({ text, symbol: ansis.green('✔') })
    );
    vi.spyOn(spinner, 'fail').mockImplementation((text?: any) =>
      spinner.stopAndPersist({ text, symbol: ansis.red('✖') })
    );
    return spinner;
  };

  return {
    default: mockOra,
  };
});
