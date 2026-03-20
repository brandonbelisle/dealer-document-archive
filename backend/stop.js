// stop.js
// Gracefully stops the running server by reading the PID file.
// Usage: node stop.js  OR  npm stop
const fs = require('fs');
const path = require('path');

const PID_FILE = path.resolve(__dirname, 'server.pid');

if (!fs.existsSync(PID_FILE)) {
  console.log('No server.pid found — server may not be running.');
  process.exit(0);
}

const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'), 10);

if (isNaN(pid)) {
  console.log('Invalid PID file. Cleaning up.');
  fs.unlinkSync(PID_FILE);
  process.exit(0);
}

try {
  process.kill(pid, 'SIGTERM');
  console.log(`✓ Server stopped (PID ${pid})`);
} catch (err) {
  if (err.code === 'ESRCH') {
    console.log(`Process ${pid} not found — server was not running.`);
  } else {
    console.error('Failed to stop server:', err.message);
  }
}

// Clean up PID file
try { fs.unlinkSync(PID_FILE); } catch {}
