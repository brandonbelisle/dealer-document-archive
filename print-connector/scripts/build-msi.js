const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const projectRoot = __dirname;
const distDir = path.join(projectRoot, 'dist');
const msiDir = path.join(distDir, 'msi');

const version = require(path.join(projectRoot, 'package.json')).version;

console.log('========================================');
console.log('DDA Print Connector MSI Build Script');
console.log('========================================\n');

// Ensure dist directories exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(msiDir)) {
  fs.mkdirSync(msiDir, { recursive: true });
}

// Step 1: Build executable with pkg
console.log('[1/5] Building executable with pkg...');
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  console.error('ERROR: Failed to build executable');
  process.exit(1);
}

// Step 2: Check for WiX tools
console.log('\n[2/5] Checking for WiX Toolset...');
let wixPath = process.env.WIX || '';
let candle = wixPath ? path.join(wixPath, 'bin', 'candle.exe') : 'candle.exe';
let light = wixPath ? path.join(wixPath, 'bin', 'light.exe') : 'light.exe';

try {
  execSync(`"${candle}" -?`, { stdio: 'pipe' });
  console.log('WiX Toolset found.');
} catch (err) {
  console.error('\nERROR: WiX Toolset not found.');
  console.error('Please install WiX Toolset from https://wixtoolset.org/releases/');
  console.error('Either add WiX bin folder to PATH or set WIX environment variable.');
  process.exit(1);
}

// Step 3: Compile WiX source
console.log('\n[3/5] Compiling WiX source...');
const wixobjPath = path.join(msiDir, 'product.wixobj');
try {
  execSync(`"${candle}" -ext WixUtilExtension -out "${wixobjPath}" "${path.join(projectRoot, 'installer', 'product.wxs')}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('ERROR: WiX compilation failed');
  process.exit(1);
}

// Step 4: Link MSI
console.log('\n[4/5] Linking MSI...');
const msiPath = path.join(msiDir, `DDAPrintConnector-${version}.msi`);
try {
  execSync(`"${light}" -ext WixUtilExtension -out "${msiPath}" "${wixobjPath}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('ERROR: MSI linking failed');
  process.exit(1);
}

// Step 5: Copy config template
console.log('\n[5/5] Creating config template...');
const configTemplatePath = path.join(msiDir, 'config-template.json');
const configTemplate = {
  dda: {
    baseUrl: 'http://your-dda-server:3000',
    username: 'your-username',
    password: 'your-password',
    defaultFolderId: null,
    locationId: null,
    departmentId: null,
    uploadTimeout: 120000
  },
  watcher: {
    watchPath: 'C:\\DDA_Print_Output',
    processedPath: 'C:\\DDA_Print_Output\\processed',
    failedPath: 'C:\\DDA_Print_Output\\failed',
    fileExtensions: ['.pdf', '.png', '.jpg', '.jpeg'],
    stabilityThreshold: 2000,
    pollInterval: 1000
  },
  logging: {
    level: 'info',
    file: 'logs/dda-connector.log',
    console: true
  },
  notifications: {
    enabled: true,
    showSuccess: true,
    showError: true
  }
};
fs.writeFileSync(configTemplatePath, JSON.stringify(configTemplate, null, 2));

console.log('\n========================================');
console.log('Build complete!');
console.log('========================================');
console.log(`MSI: ${msiPath}`);
console.log(`Config template: ${configTemplatePath}`);
console.log('\nTo install:');
console.log('1. Run the MSI as Administrator');
console.log('2. Configure the connector in "C:\\Program Files\\DDA Print Connector\\config\\local.json"');
console.log('3. Start the service: sc start DDAPrintConnector');
console.log('\nOr use the config template to set up before installing.\n');