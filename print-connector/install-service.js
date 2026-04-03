const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'DDA Print Connector',
  description: 'Monitors a folder for PDF files and uploads them to Dealer Document Archive with RO number matching',
  script: path.join(__dirname, 'index.js'),
  env: [
    { name: 'NODE_ENV', value: 'production' }
  ],
  wait: 2,
  grow: 0.5,
  allowServiceLogon: true
};

// Listen for the "install" event
svc.on('install', function() {
  console.log('DDA Print Connector service installed successfully.');
  svc.start();
});

svc.on('alreadyinstalled', function() {
  console.log('DDA Print Connector service is already installed.');
  console.log('To reinstall, first run: node uninstall-service.js');
});

svc.on('error', function(err) {
  console.error('Service installation error:', err.message);
});

svc.on('start', function() {
  console.log('DDA Print Connector service started.');
});

// Install the service
console.log('Installing DDA Print Connector as Windows service...');
svc.install();