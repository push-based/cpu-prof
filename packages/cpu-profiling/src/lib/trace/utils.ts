import { TraceEvent } from '../traceprofile.types';

export function sortTraceEvents(rawEvents: TraceEvent[]): TraceEvent[] {
  const metaOnly = rawEvents.filter((e) => e.ph === 'M');
  const eventsOnly = rawEvents.filter((e) => e.ph !== 'M');
  metaOnly.sort((a, b) => a.ts - b.ts);
  eventsOnly.sort((a, b) => a.ts - b.ts);
  return [...metaOnly, ...eventsOnly];
}
