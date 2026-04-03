const { Service } = require('node-windows');
const path = require('path');

const config = require('./config').loadConfig();

const svc = new Service({
  name: 'DDA Print Connector',
  description: 'Watches a folder for PDF files and uploads them to Dealer Document Archive',
  script: path.join(__dirname, 'index.js'),
  nodeOptions: [],
  env: [
    { name: 'WINSER_SERVICE', value: 'true' }
  ],
  wait: 2,
  grow: 0.5
});

svc.on('install', function() {
  console.log('DDA Print Connector service installed successfully.');
  console.log('Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('DDA Print Connector service started.');
  console.log(`Watching folder: ${config.watcher.watchPath}`);
});

svc.on('alreadyinstalled', function() {
  console.log('DDA Print Connector service is already installed.');
  console.log('To reinstall, first run: node uninstall-service.js');
});

svc.on('error', function(err) {
  console.error('Service installation failed:', err.message);
});

console.log('Installing DDA Print Connector as Windows service...');
console.log(`Watch folder: ${config.watcher.watchPath}`);
console.log(`DDA server: ${config.dda.baseUrl}`);

svc.install();