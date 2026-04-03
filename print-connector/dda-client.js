const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

function extractRO(filename) {
  if (!filename) return null;
  
  // RO is a 10-character string starting with R10 (R10 + 7 digits)
  const match = filename.match(/\b(R10\d{7})\b/i);
  if (match) return match[1].toUpperCase();
  
  return null;
}

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
    this.folders = [];
    this.locations = [];
    this.departments = [];
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

  async loadFolderStructure() {
    try {
      await this.ensureAuthenticated();
      
      const [locationsRes, departmentsRes, foldersRes] = await Promise.all([
        axios.get(`${this.baseUrl}/api/locations`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        }),
        axios.get(`${this.baseUrl}/api/departments`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        }),
        axios.get(`${this.baseUrl}/api/folders`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        })
      ]);

      this.locations = locationsRes.data || [];
      this.departments = departmentsRes.data || [];
      this.folders = foldersRes.data || [];
      
      this.logger.info(`Loaded ${this.folders.length} folders, ${this.locations.length} locations, ${this.departments.length} departments`);
      
      return { folders: this.folders, locations: this.locations, departments: this.departments };
    } catch (err) {
      this.logger.error('Failed to load folder structure:', err.message);
      throw err;
    }
  }

findFolderByRO(roNumber) {
    if (!roNumber || !this.folders || this.folders.length === 0) {
      return null;
    }

    const roUpper = roNumber.toUpperCase();
    
    // Exact match
    const exact = this.folders.find(f => 
      f.name === roNumber || 
      f.name.toUpperCase() === roUpper
    );
    if (exact) return { folder: exact, confidence: 'exact' };
    
    // Contains match
    const contains = this.folders.find(f => 
      f.name.toUpperCase().includes(roUpper)
    );
    if (contains) return { folder: contains, confidence: 'partial' };
    
    // Try matching without the "R10" prefix (just the 7 digits)
    const numPart = roNumber.slice(3); // Remove "R10" to get the 7-digit number
    const numMatch = this.folders.find(f => 
      f.name === numPart || 
      f.name.includes(numPart)
    );
    if (numMatch) return { folder: numMatch, confidence: 'partial' };
    
    return null;
  }

    const roUpper = roNumber.toUpperCase();
    
    // Exact match
    const exact = this.folders.find(f => 
      f.name === roNumber || 
      f.name.toUpperCase() === roUpper
    );
    if (exact) return { folder: exact, confidence: 'exact' };
    
    // Contains match
    const contains = this.folders.find(f => 
      f.name.toUpperCase().includes(roUpper)
    );
    if (contains) return { folder: contains, confidence: 'partial' };
    
    // Handle R followed by 9 digits - try without the R
    if (/^R\d{9}$/.test(roNumber)) {
      const numPart = roNumber.slice(1);
      const numMatch = this.folders.find(f => 
        f.name === numPart || 
        f.name.includes(numPart)
      );
      if (numMatch) return { folder: numMatch, confidence: 'partial' };
    }
    
    // Handle R10 followed by 7 digits
    if (/^R10\d{7}$/.test(roNumber)) {
      const numMatch = this.folders.find(f => 
        f.name === roNumber || 
        f.name.includes(roNumber)
      );
      if (numMatch) return { folder: numMatch, confidence: 'partial' };
      
      const numPart = roNumber.slice(3);
      const numOnlyMatch = this.folders.find(f => 
        f.name === numPart || 
        f.name.includes(numPart)
      );
      if (numOnlyMatch) return { folder: numOnlyMatch, confidence: 'partial' };
    }
    
    return null;
  }

  async uploadFile(filePath, extractedText, options = {}) {
    try {
      await this.ensureAuthenticated();

      const fileName = options.fileName || path.basename(filePath);
      
      // Determine folder: try provided folderId, then RO matching from filename, then unsorted
      let folderId = options.folderId || this.defaultFolderId;
      let matchInfo = null;
      
      if (!folderId) {
        const roNumber = extractRO(fileName);
        if (roNumber) {
          this.logger.info(`Found RO number: ${roNumber} in filename ${fileName}`);
          
          // Ensure we have folder structure loaded
          if (this.folders.length === 0) {
            await this.loadFolderStructure();
          }
          
          matchInfo = this.findFolderByRO(roNumber);
          
          if (matchInfo) {
            folderId = matchInfo.folder.id;
            this.logger.info(`Matched to folder: ${matchInfo.folder.name} (${matchInfo.confidence} match)`);
          } else {
            this.logger.info(`No matching folder found for RO ${roNumber}, uploading to Unsorted`);
          }
        }
      }

      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      this.logger.info(`Uploading file: ${fileName} (${fileSizeMB.toFixed(2)} MB)${folderId ? ` to folder ${folderId}` : ' to Unsorted'}`);

      const form = new FormData();
      form.append('file', fs.createReadStream(filePath), {
        filename: fileName,
        contentType: this.getMimeType(fileName)
      });

      if (folderId) {
        form.append('folderId', folderId);
      }
      
      if (extractedText) {
        form.append('extractedText', extractedText);
      }
      
      if (options.pageCount) {
        form.append('pageCount', String(options.pageCount));
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
        folderId: response.data.folder_id || folderId,
        matchedFolder: matchInfo?.folder?.name || null,
        matchConfidence: matchInfo?.confidence || null,
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
module.exports.extractRO = extractRO;