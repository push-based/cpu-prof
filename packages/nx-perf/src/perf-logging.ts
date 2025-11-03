import {
  PerformanceObserver,
  type PerformanceObserverEntryList,
} from 'node:perf_hooks';
import { PerfFileLogger } from './perf-file-logger';

// Re-export PerfFileLogger for backward compatibility
export { PerfFileLogger } from './perf-file-logger';

declare global {
  // eslint-disable-next-line no-var
  var nxPerfLogger: PerfFileLogger | undefined;
}

if (process.env.NX_PERF_LOGGING === 'true') {
  const logger = new PerfFileLogger();

  const obs = new PerformanceObserver((list: PerformanceObserverEntryList) => {
    for (const entry of list.getEntries()) {
      logger.logEntry(entry, 'completed');
    }
  });
  obs.observe({ entryTypes: ['measure'] });
  globalThis.nxPerfLogger = logger;
}

export {};
