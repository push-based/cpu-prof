import {fork} from "node:child_process";
import {fileURLToPath} from "node:url";

export async function nxRunWithPerfLogging(
  args,
  {
    verbose = false,
    noPatch = false,
    onData = () => {
    },
    onTraceEvent = () => {
    },
    onMetadata = () => {
    },
    beforeExit = () => {
    },
  } = {}
) {
  const patch = !noPatch;
  const nxUrl = await import.meta.resolve("nx");
  const nxPath = fileURLToPath(nxUrl);

  const profile = {
    metadata: {},
    traceEvents: [],
  }

  const forkArgs = [
    nxPath,
    args,
    {
      stdio: ["pipe", "pipe", "pipe", "ipc"],
      env: {
        ...process.env,
        NX_DAEMON: "false",
        NX_CACHE: "false",
        NX_PERF_LOGGING: "true",
        XX: args.join(" "),
      },
      // Preload the patch file so that it applies before NX is loaded.
      execArgv: patch ? ["--require", "./tools/perf_hooks.patch.js"] : [],
    },
  ];
  if (verbose) {
    console.log("Forking NX with args:", forkArgs);
  }

  const child = fork(...forkArgs);

  child.stdout?.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
      onData(line);
      const res = line.split(":JSON:");

      if (res.length === 2) {
        const [prop, jsonString] = res;
        const perfProfileEvent = JSON.parse(jsonString?.trim() || "{}");
        if (prop === "traceEvent") {
          onTraceEvent(perfProfileEvent);
          profile.traceEvents.push(perfProfileEvent);
        }
        if (prop === "metadata") {
          onMetadata(perfProfileEvent);
          profile.metadata = perfProfileEvent;
        }
      }
    }
  });

  child.on("close", () => {
    beforeExit(profile);
  });
}
