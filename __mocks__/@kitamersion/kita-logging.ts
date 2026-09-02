// The real package persists log history to IndexedDB as a fire-and-forget side
// effect of every logger call, which outlives individual test files and throws
// unhandled rejections once their environment tears down. Tests don't need real
// log persistence, so this replaces it with inert no-ops.
export const logger = {
  info: async () => {},
  debug: async () => {},
  warn: async () => {},
  error: async () => {},
};

export default logger;
