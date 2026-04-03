const { Service } = require('node-windows');
const path = require('path');

const svc = new Service({
  name: 'DDA Print Connector',
  script: path.join(__dirname, 'index.js')
});

svc.on('uninstall', function() {
  console.log('DDA Print Connector service uninstalled successfully.');
});

svc.on('error', function(err) {
  console.error('Service uninstallation failed:', err.message);
});

svc.on('stop', function() {
  console.log('Service stopped.');
});

console.log('Uninstalling DDA Print Connector service...');
svc.uninstall();