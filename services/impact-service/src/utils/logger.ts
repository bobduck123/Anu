import pino from 'pino';
import config from '../config';

const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname'
          }
        }
      : undefined
});

export default logger;
