// start-production.js
// Builds the frontend and starts the backend server.
// Run from project root: node start-production.js
// Or via npm: npm start
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const BACKEND_DIR = path.join(ROOT, 'backend');
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');

// ── Step 1: Build frontend ───────────────────────────────
console.log('\n  Building frontend...\n');
try {
  execSync('npm run build', {
    cwd: FRONTEND_DIR,
    stdio: 'inherit',
  });
} catch (err) {
  console.error('\n  ✗ Frontend build failed. Make sure you ran "npm run install:all" first.\n');
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('\n  ✗ Build completed but no dist/index.html found.\n');
  process.exit(1);
}

console.log('\n  ✓ Frontend built successfully\n');

// ── Step 2: Start backend server ─────────────────────────
console.log('  Starting server...\n');
const server = spawn('node', ['server.js'], {
  cwd: BACKEND_DIR,
  stdio: 'inherit',
  env: { ...process.env },
});

server.on('error', (err) => {
  console.error('  ✗ Failed to start server:', err.message);
  process.exit(1);
});

server.on('exit', (code) => {
  process.exit(code || 0);
});

// Forward signals to child process
process.on('SIGTERM', () => server.kill('SIGTERM'));
process.on('SIGINT', () => server.kill('SIGINT'));
