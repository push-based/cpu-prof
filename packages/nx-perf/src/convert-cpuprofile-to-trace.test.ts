import {describe, expect, it} from "vitest";
import {convertCpuProfileToTraceFile} from "./convert-cpuprofile-to-trace";
import {mkdir, readFile} from "fs/promises";
import {join} from "path";


describe('convertCpuProfileToTraceEvents', () => {
  it('should convert a CPU profile to trace file format', async () => {
    const result = convertCpuProfileToTraceFile({
      profile: JSON.parse(
          (
              await readFile(
                  join(__dirname, '../mocks/fixtures/ng-serve/CPU.20250511.154655.76037.0.001.cpuprofile')
              )
          ).toString()
      ),
      pid: 1234,
      tid: 5678,
      source: 'Sample CPU Profile',
      isMain: true,
    });

    await mkdir(join(__dirname, '__snapshots__'), { recursive: true });
    await expect(JSON.stringify(result, null, 2))
        .toMatchFileSnapshot(join(__dirname, '__snapshots__', 'convert-cpu-profile.trace.json'));

  });

});
