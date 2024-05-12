const PREFIX = "[KITA_BROWSER]";

const logger = {
  info: (message: string) => {
    console.log(`${PREFIX} ${message}`);
  },
  debug: (message: string) => {
    console.info(`${PREFIX} ${message}`);
  },
  warn: (message: string) => {
    console.warn(`${PREFIX} ${message}`);
  },
  error: (message: string) => {
    console.error(`${PREFIX} ${message}`);
  },
};

export default logger;
