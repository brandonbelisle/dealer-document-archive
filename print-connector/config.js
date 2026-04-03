const path = require('path');
const fs = require('fs');

const configDir = path.join(__dirname, 'config');
const localConfigPath = path.join(configDir, 'local.json');

function loadConfig() {
  let config = {};
  
  try {
    const defaultConfig = JSON.parse(fs.readFileSync(path.join(configDir, 'default.json'), 'utf8'));
    config = { ...defaultConfig };
  } catch (err) {
    console.error('Warning: Could not load default config:', err.message);
  }
  
  try {
    if (fs.existsSync(localConfigPath)) {
      const localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
      config = deepMerge(config, localConfig);
    }
  } catch (err) {
    console.error('Warning: Could not load local config:', err.message);
  }
  
  config.env = {
    DDA_BASE_URL: process.env.DDA_BASE_URL,
    DDA_USERNAME: process.env.DDA_USERNAME,
    DDA_PASSWORD: process.env.DDA_PASSWORD,
    DDA_DEFAULT_FOLDER_ID: process.env.DDA_DEFAULT_FOLDER_ID,
    DDA_LOCATION_ID: process.env.DDA_LOCATION_ID,
    DDA_DEPARTMENT_ID: process.env.DDA_DEPARTMENT_ID,
    WATCH_PATH: process.env.WATCH_PATH,
    LOG_LEVEL: process.env.LOG_LEVEL
  };
  
  if (config.env.DDA_BASE_URL) config.dda.baseUrl = config.env.DDA_BASE_URL;
  if (config.env.DDA_USERNAME) config.dda.username = config.env.DDA_USERNAME;
  if (config.env.DDA_PASSWORD) config.dda.password = config.env.DDA_PASSWORD;
  if (config.env.DDA_DEFAULT_FOLDER_ID) config.dda.defaultFolderId = config.env.DDA_DEFAULT_FOLDER_ID;
  if (config.env.DDA_LOCATION_ID) config.dda.locationId = config.env.DDA_LOCATION_ID;
  if (config.env.DDA_DEPARTMENT_ID) config.dda.departmentId = config.env.DDA_DEPARTMENT_ID;
  if (config.env.WATCH_PATH) config.watcher.watchPath = config.env.WATCH_PATH;
  if (config.env.LOG_LEVEL) config.logging.level = config.env.LOG_LEVEL;
  
  return config;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function saveLocalConfig(updates) {
  let localConfig = {};
  try {
    if (fs.existsSync(localConfigPath)) {
      localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
    }
  } catch (err) {
    // ignore
  }
  
  const merged = deepMerge(localConfig, updates);
  fs.writeFileSync(localConfigPath, JSON.stringify(merged, null, 2));
}

function ensureDirectories() {
  const config = loadConfig();
  const dirs = [
    config.watcher.watchPath,
    config.watcher.processedPath,
    config.watcher.failedPath,
    path.dirname(path.join(__dirname, config.logging.file))
  ];
  
  for (const dir of dirs) {
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

module.exports = {
  loadConfig,
  saveLocalConfig,
  ensureDirectories
};