const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');

class FileWatcher {
  constructor(config, ddaClient, logger, notifier) {
    this.watchPath = config.watcher.watchPath;
    this.processedPath = config.watcher.processedPath;
    this.failedPath = config.watcher.failedPath;
    this.fileExtensions = config.watcher.fileExtensions || ['.pdf'];
    this.stabilityThreshold = config.watcher.stabilityThreshold || 2000;
    this.pollInterval = config.watcher.pollInterval || 1000;
    this.ddaClient = ddaClient;
    this.logger = logger;
    this.notifier = notifier;
    this.watcher = null;
    this.pendingUploads = new Map();
    this.isProcessing = false;
    this.queue = [];
  }

  start() {
    this.ensureDirectories();

    this.watcher = chokidar.watch(this.watchPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: this.stabilityThreshold,
        pollInterval: this.pollInterval
      },
      usePolling: true,
      depth: 0
    });

    this.watcher
      .on('add', (filePath) => this.onFileAdded(filePath))
      .on('change', (filePath) => this.onFileChanged(filePath))
      .on('error', (err) => this.logger.error('Watcher error:', err));

    this.logger.info(`Watching for files in: ${this.watchPath}`);
    
    this.processExistingFiles();
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.logger.info('File watcher stopped');
    }
  }

  ensureDirectories() {
    [this.watchPath, this.processedPath, this.failedPath].forEach(dir => {
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.info(`Created directory: ${dir}`);
      }
    });
  }

  async processExistingFiles() {
    try {
      const files = fs.readdirSync(this.watchPath);
      for (const file of files) {
        const filePath = path.join(this.watchPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && this.isValidFile(filePath)) {
          this.queue.push(filePath);
        }
      }
      this.processQueue();
    } catch (err) {
      this.logger.error('Error processing existing files:', err);
    }
  }

  isValidFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.fileExtensions.includes(ext);
  }

  onFileAdded(filePath) {
    if (!this.isValidFile(filePath)) {
      return;
    }

    if (filePath.includes(path.basename(this.processedPath)) || 
        filePath.includes(path.basename(this.failedPath))) {
      return;
    }

    this.logger.info(`New file detected: ${path.basename(filePath)}`);
    this.queue.push(filePath);
    this.processQueue();
  }

  onFileChanged(filePath) {
    if (this.pendingUploads.has(filePath)) {
      this.logger.debug(`File changed during upload: ${path.basename(filePath)}`);
    }
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const filePath = this.queue.shift();
      await this.uploadFile(filePath);
    }

    this.isProcessing = false;
  }

  async uploadFile(filePath) {
    if (!fs.existsSync(filePath)) {
      this.logger.warn(`File no longer exists: ${filePath}`);
      return;
    }

    this.pendingUploads.set(filePath, true);
    const startTime = Date.now();

    try {
      const result = await this.ddaClient.uploadFile(filePath);

      if (result.success) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        this.logger.info(`Upload completed in ${duration}s: ${result.fileName}`);
        
        this.moveToProcessed(filePath, result.fileId);
        
        if (this.notifier && this.notifier.showSuccess) {
          this.notifier.notify({
            title: 'DDA Upload Successful',
            message: `${result.fileName} uploaded successfully`,
            sound: false
          });
        }
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      this.logger.error(`Failed to upload ${path.basename(filePath)}:`, err.message);
      
      this.moveToFailed(filePath, err.message);
      
      if (this.notifier && this.notifier.showError) {
        this.notifier.notify({
          title: 'DDA Upload Failed',
          message: `Failed to upload ${path.basename(filePath)}: ${err.message}`,
          sound: true
        });
      }
    } finally {
      this.pendingUploads.delete(filePath);
    }
  }

  moveToProcessed(filePath, fileId) {
    try {
      const baseName = path.basename(filePath);
      const nameWithoutExt = path.parse(baseName).name;
      const ext = path.extname(baseName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const newName = `${nameWithoutExt}_${timestamp}${ext}`;
      
      const destPath = path.join(this.processedPath, newName);
      
      fs.renameSync(filePath, destPath);
      this.logger.info(`Moved to processed: ${newName}`);
      
      const metadataPath = destPath + '.meta.json';
      fs.writeFileSync(metadataPath, JSON.stringify({
        originalName: baseName,
        fileId: fileId,
        processedAt: new Date().toISOString()
      }, null, 2));
    } catch (err) {
      this.logger.error(`Failed to move file to processed: ${err.message}`);
    }
  }

  moveToFailed(filePath, error) {
    try {
      const baseName = path.basename(filePath);
      const nameWithoutExt = path.parse(baseName).name;
      const ext = path.extname(baseName);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const newName = `${nameWithoutExt}_${timestamp}${ext}`;
      
      const destPath = path.join(this.failedPath, newName);
      
      fs.renameSync(filePath, destPath);
      this.logger.info(`Moved to failed: ${newName}`);
      
      const metadataPath = destPath + '.error.json';
      fs.writeFileSync(metadataPath, JSON.stringify({
        originalName: baseName,
        error: error,
        failedAt: new Date().toISOString()
      }, null, 2));
    } catch (err) {
      this.logger.error(`Failed to move file to failed: ${err.message}`);
    }
  }
}

module.exports = FileWatcher;