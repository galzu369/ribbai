import winston from 'winston';

// Create logger instance for Business Intelligence module
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, service = 'ribbai-ops', environment = 'local', ...meta }) => {
      const metaStr = Object.keys(meta).length ? `, ${JSON.stringify(meta)}` : '';
      return JSON.stringify({
        timestamp,
        level,
        message,
        service,
        environment,
        ...meta
      });
    })
  ),
  defaultMeta: { 
    service: 'ribbai-ops',
    environment: process.env.NODE_ENV || 'local',
    module: 'business-intelligence'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

export default logger;