const PREFIX = "[KITA_BROWSER]";

const logger = {
  info: (message: string) => {
    console.log(`%c${PREFIX} ${message}`, "color: DodgerBlue");
  },
  debug: (message: string) => {
    console.info(`%c${PREFIX} ${message}`, "color: MediumSeaGreen");
  },
  warn: (message: string) => {
    console.warn(`%c${PREFIX} ${message}`, "color: Orange");
  },
  error: (message: string) => {
    console.error(`%c${PREFIX} ${message}`, "color: Tomato");
  },
};

export default logger;
