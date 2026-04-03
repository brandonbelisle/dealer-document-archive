const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { loadConfig, ensureDirectories } = require('./config');
const DDAClient = require('./dda-client');
const FileWatcher = require('./watcher');

const APP_NAME = 'DDA Print Connector';
const isService = process.argv.includes('--service') || 
                   process.argv.includes('--install') || 
                   process.env.WINSER_SERVICE === 'true';

function createLogger(config) {
  const logPath = path.join(__dirname, config.logging.file || 'logs/dda-connector.log');
  const logDir = path.dirname(logPath);
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const transports = [
    new winston.transports.File({
      filename: logPath,
      maxsize: 10485760,
      maxFiles: 5,
      tailable: true
    })
  ];

  if (config.logging.console !== false && !isService) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    );
  }

  return winston.createLogger({
    level: config.logging.level || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports
  });
}

function createNotifier(config) {
  if (!config.notifications?.enabled) {
    return null;
  }

  try {
    const notifier = require('node-notifier');
    return {
      notify: (options) => {
        notifier.notify({
          title: options.title || APP_NAME,
          message: options.message,
          sound: options.sound !== false,
          wait: false
        });
      },
      showSuccess: config.notifications.showSuccess !== false,
      showError: config.notifications.showError !== false
    };
  } catch (err) {
    return null;
  }
}

async function validateConfig(config, logger) {
  const errors = [];

  if (!config.dda.baseUrl) {
    errors.push('DDA base URL is required');
  }

  if (!config.dda.username) {
    errors.push('DDA username is required');
  }

  if (!config.dda.password) {
    errors.push('DDA password is required');
  }

  if (!config.watcher.watchPath) {
    errors.push('Watch path is required');
  }

  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(`Configuration error: ${error}`);
    }
    return false;
  }

  return true;
}

class Connector {
  constructor() {
    this.config = null;
    this.logger = null;
    this.notifier = null;
    this.ddaClient = null;
    this.watcher = null;
    this.isRunning = false;
    this.isShuttingDown = false;
  }

  async start() {
    if (this.isRunning) {
      return;
    }

    try {
      if (!isService) {
        console.log(`Starting ${APP_NAME}...`);
      }
      
      this.config = loadConfig();
      ensureDirectories();
      
      this.logger = createLogger(this.config);
      this.notifier = createNotifier(this.config);
      
      this.logger.info('Configuration loaded');
      this.logger.info(`Base URL: ${this.config.dda.baseUrl}`);
      this.logger.info(`Watch path: ${this.config.watcher.watchPath}`);
      
      if (!await validateConfig(this.config, this.logger)) {
        this.logger.error('Invalid configuration. Please check config/local.json');
        this.logger.error('');
        this.logger.error('Required settings:');
        this.logger.error('  dda.baseUrl: DDA server URL');
        this.logger.error('  dda.username: DDA login username');
        this.logger.error('  dda.password: DDA login password');
        this.logger.error('  watcher.watchPath: Folder to watch for PDFs');
        process.exit(1);
      }

      this.ddaClient = new DDAClient(this.config, this.logger);
      
      this.logger.info('Testing DDA connection...');
      const connected = await this.ddaClient.checkConnection();
      if (!connected) {
        this.logger.error('Cannot connect to DDA server');
        process.exit(1);
      }
      this.logger.info('Successfully connected to DDA');

      this.logger.info('Authenticating with DDA...');
      await this.ddaClient.authenticate();
      
      this.logger.info('Loading folder structure for RO matching...');
      await this.ddaClient.loadFolderStructure();
      
      this.watcher = new FileWatcher(this.config, this.ddaClient, this.logger, this.notifier);
      this.watcher.start();
      
      this.isRunning = true;
      this.logger.info(`${APP_NAME} started successfully`);
      
      // Handle shutdown signals
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (err) {
      const logger = this.logger || console;
      logger.error('Failed to start connector:', err);
      process.exit(1);
    }
  }

  async shutdown() {
    if (this.isShuttingDown || !this.isRunning) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down...');
    this.isRunning = false;

    if (this.watcher) {
      this.watcher.stop();
    }

    this.logger.info(`${APP_NAME} stopped`);
    
    // Exit cleanly
    setTimeout(() => process.exit(0), 1000);
  }
}

// Main entry point
if (require.main === module) {
  const connector = new Connector();
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    const logger = connector.logger || console;
    logger.error('Uncaught exception:', err);
    connector.shutdown();
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    const logger = connector.logger || console;
    logger.error('Unhandled rejection:', reason);
  });
  
  connector.start();
}

module.exports = Connector;