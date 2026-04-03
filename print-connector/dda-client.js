const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class DDAClient {
  constructor(config, logger) {
    this.baseUrl = config.dda.baseUrl;
    this.username = config.dda.username;
    this.password = config.dda.password;
    this.defaultFolderId = config.dda.defaultFolderId;
    this.locationId = config.dda.locationId;
    this.departmentId = config.dda.departmentId;
    this.uploadTimeout = config.dda.uploadTimeout || 120000;
    this.logger = logger;
    this.token = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      if (!this.username || !this.password) {
        throw new Error('DDA credentials not configured. Set username and password in config or environment.');
      }

      this.logger.info('Authenticating with DDA...');
      
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
        username: this.username,
        password: this.password
      }, {
        timeout: 30000
      });

      this.token = response.data.token;
      this.tokenExpiry = Date.now() + (response.data.expiresIn || 86400) * 1000 - 60000;
      
      this.logger.info('Successfully authenticated with DDA');
      return this.token;
    } catch (err) {
      this.logger.error('Authentication failed:', err.response?.data?.error || err.message);
      throw err;
    }
  }

  async ensureAuthenticated() {
    if (!this.token || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
    return this.token;
  }

  async uploadFile(filePath, options = {}) {
    try {
      await this.ensureAuthenticated();

      const fileName = options.fileName || path.basename(filePath);
      const folderId = options.folderId || this.defaultFolderId;
      const locationId = options.locationId || this.locationId;
      const departmentId = options.departmentId || this.departmentId;

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      this.logger.info(`Uploading file: ${fileName} (${fileSizeMB.toFixed(2)} MB)`);

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: this.getMimeType(fileName)
      });

      if (folderId) {
        form.append('folderId', folderId);
      }
      if (locationId) {
        form.append('locationId', locationId);
      }
      if (departmentId) {
        form.append('departmentId', departmentId);
      }

      const response = await axios.post(`${this.baseUrl}/api/files/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${this.token}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: this.uploadTimeout
      });

      this.logger.info(`File uploaded successfully: ${response.data.file?.name || fileName}`);
      return {
        success: true,
        fileId: response.data.file?.id,
        fileName: response.data.file?.name || fileName,
        response: response.data
      };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      this.logger.error(`Upload failed for ${path.basename(filePath)}:`, errorMsg);
      
      if (err.response?.status === 401) {
        this.token = null;
        this.tokenExpiry = null;
      }

      return {
        success: false,
        error: errorMsg,
        filePath
      };
    }
  }

  async getDefaultFolder() {
    if (this.defaultFolderId) {
      return { folderId: this.defaultFolderId };
    }

    if (!this.locationId || !this.departmentId) {
      this.logger.warn('No default folder or location/department configured');
      return { folderId: null };
    }

    try {
      await this.ensureAuthenticated();
      
      const response = await axios.get(`${this.baseUrl}/api/folders/unsorted`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      return { folderId: response.data.id };
    } catch (err) {
      this.logger.error('Could not get default folder:', err.message);
      return { folderId: null };
    }
  }

  async getLocations() {
    try {
      await this.ensureAuthenticated();
      
      const response = await axios.get(`${this.baseUrl}/api/locations`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      return response.data;
    } catch (err) {
      this.logger.error('Failed to get locations:', err.message);
      throw err;
    }
  }

  async getDepartments(locationId) {
    try {
      await this.ensureAuthenticated();
      
      const url = locationId 
        ? `${this.baseUrl}/api/departments?locationId=${locationId}`
        : `${this.baseUrl}/api/departments`;
      
      const response = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      return response.data;
    } catch (err) {
      this.logger.error('Failed to get departments:', err.message);
      throw err;
    }
  }

  async getFolders(locationId, departmentId) {
    try {
      await this.ensureAuthenticated();
      
      const params = new URLSearchParams();
      if (locationId) params.append('locationId', locationId);
      if (departmentId) params.append('departmentId', departmentId);
      
      const response = await axios.get(`${this.baseUrl}/api/folders?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      return response.data;
    } catch (err) {
      this.logger.error('Failed to get folders:', err.message);
      throw err;
    }
  }

  async checkConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      return response.status === 200;
    } catch (err) {
      try {
        await this.ensureAuthenticated();
        return true;
      } catch {
        return false;
      }
    }
  }

  getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.tif': 'image/tiff'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = DDAClient;