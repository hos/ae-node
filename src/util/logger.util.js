const winston = require('winston')

winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'magenta'
})

const consoleTransport = new (winston.transports.Console)({
  level: process.env.LOG_LEVEL,
  colorize: true,
  timestamp: false,
  silent: false,
  prettyPrint: true,
  stderrLevels: ['error'],
  handleExceptions: true
})

const logger = winston.createLogger({
  transports: [consoleTransport]
})

module.exports = logger
