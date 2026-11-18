// Node writes --cpu-prof profiles only when the process exits normally. A server is stopped with
// a signal, so turn SIGINT/SIGTERM into a normal exit. Loaded with --import by profile.mjs.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(0));
