/**
 * Generate a trace filename with timestamp in the format: Trace-YYYYMMDDTHHMMSS.json
 */
export function generateTraceFilename(): string {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  return `Trace-${timestamp}.json`;
}
