# DDA Print Connector

Windows print connector that monitors a folder for PDF files and automatically uploads them to Dealer Document Archive (DDA).

## Quick Start

### Build the MSI (One-Time Setup)

1. **Run as Administrator:**
   ```
   scripts\install-build-env.bat
   ```
   This installs Node.js, WiX Toolset, and all dependencies.

2. **Restart your terminal** (to refresh PATH)

3. **Build the MSI:**
   ```
   scripts\build.bat
   ```

4. **Install:** Copy `dist\msi\DDAPrintConnector-1.0.0.msi` to target machine, right-click → Install

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

---

## Overview

This connector enables "Print to DDA" functionality:

1. Configure any PDF printer to save files to a watched folder
2. The connector automatically detects new files
3. **RO numbers are extracted from filenames** (10-char string starting with R10)
4. Files with matching RO numbers upload to the correct folder; others go to Unsorted
5. Successfully uploaded files are moved to `processed/`
6. Failed uploads are moved to `failed/`

## RO Number Matching

The connector automatically extracts RO numbers from filenames and matches them to folders:

- **RO Format:** 10-character string starting with "R10" (e.g., R101234567)
- **Extraction:** RO number is taken from the filename, not PDF content

**Matching logic:**
1. Exact match: Folder name equals RO number (`R101234567`)
2. Partial match: Folder name contains RO number
3. Numeric match: Folder name equals just the 7-digit number (`101234567`)
4. No match: File goes to Unsorted

**Example:** File `R101234567_invoice.pdf` uploads to folder `R101234567` or `101234567`

---

## Installation

### Build Requirements

- **Windows 10/11** or **Windows Server 2016+**
- **Administrator access** (for installation)
- **Internet connection** (for downloading dependencies)

### Building the MSI

**Option 1: One-Click Setup (Recommended)**

```batch
REM Run as Administrator
scripts\install-build-env.bat

REM Restart terminal, then:
scripts\build.bat
```

**Option 2: Manual Setup**

1. Install [Node.js 18+](https://nodejs.org/)
2. Install [WiX Toolset v3](https://wixtoolset.org/releases/)
3. Add WiX to PATH: `C:\Program Files (x86)\WiX Toolset v3.14\bin`
4. Run:
   ```batch
   cd print-connector
   npm install --include=dev
   npm run build
   scripts\build-msi.ps1
   ```

### Installing the MSI

1. Copy `dist\msi\DDAPrintConnector-{version}.msi` to the target computer
2. Right-click → **Install** (run as Administrator)
3. Configure the connector (see Configuration below)
4. Start the service:
   ```powershell
   sc start DDAPrintConnector
   ```

---

## Configuration

### Configuration File

Create `C:\Program Files\DDA Print Connector\config\local.json`:

```json
{
  "dda": {
    "baseUrl": "https://your-dda-server.com",
    "username": "your-username",
    "password": "your-password",
    "defaultFolderId": null,
    "locationId": null,
    "departmentId": null,
    "uploadTimeout": 120000
  },
  "watcher": {
    "watchPath": "C:\\DDA_Print_Output",
    "processedPath": "C:\\DDA_Print_Output\\processed",
    "failedPath": "C:\\DDA_Print_Output\\failed",
    "fileExtensions": [".pdf", ".png", ".jpg", ".jpeg"],
    "stabilityThreshold": 2000,
    "pollInterval": 1000
  },
  "logging": {
    "level": "info",
    "file": "logs/dda-connector.log",
    "console": true
  },
  "notifications": {
    "enabled": true,
    "showSuccess": true,
    "showError": true
  }
}
```

### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| `dda.baseUrl` | DDA server URL | Required |
| `dda.username` | DDA login username | Required |
| `dda.password` | DDA login password | Required |
| `dda.defaultFolderId` | Target folder UUID (overrides auto-matching) | null |
| `watcher.watchPath` | Folder to watch | `C:\DDA_Print_Output` |
| `watcher.fileExtensions` | Allowed file types | `.pdf`, `.png`, `.jpg` |
| `logging.level` | Log verbosity: `error`, `warn`, `info`, `debug` | `info` |

---

## Setting Up the PDF Printer

### Option 1: PDFCreator (Recommended)

1. Install [PDFCreator](https://www.pdfforge.org/pdfcreator) (free)
2. Go to **Profiles → Create Profile** → Name it "DDA Upload"
3. Configure:
   - **Filename:** `{DateTime}_{FileName}`
   - **Target directory:** `C:\DDA_Print_Output`
   - **Disable:** Show quick action window, Input box
4. Set as default printer or select when printing

### Option 2: Bullzip PDF Printer

1. Install [Bullzip PDF Printer](https://www.bullzip.com/)
2. Configure output folder: `C:\DDA_Print_Output`
3. Enable auto-naming with timestamps

---

## Service Management

```powershell
# Check service status
sc query DDAPrintConnector

# Start service
sc start DDAPrintConnector

# Stop service
sc stop DDAPrintConnector

# View logs
Get-Content "C:\Program Files\DDA Print Connector\logs\dda-connector.log" -Tail 50 -Wait

# Restart service
sc stop DDAPrintConnector; sc start DDAPrintConnector
```

---

## File Structure

```
C:\DDA_Print_Output\
├── R101234567_invoice.pdf   ← New files appear here
├── processed\               ← Successfully uploaded
│   └── R101234567_invoice_2024-01-15T10-30-00.pdf
│   └── R101234567_invoice_2024-01-15T10-30-00.pdf.meta.json
└── failed\                  ← Failed uploads
    └── problem_file.pdf
    └── problem_file.pdf.error.json
```

---

## Troubleshooting

### Build Issues

| Problem | Solution |
|---------|----------|
| `candle.exe not found` | Run `scripts\install-build-env.bat` as Admin, restart terminal |
| `pkg not found` | Run `npm install --include=dev` |
| `npm ERR!` | Delete `node_modules`, run `npm install` again |

### Runtime Issues

| Problem | Solution |
|---------|----------|
| Service won't start | Check config file exists and is valid JSON |
| Cannot connect to DDA | Verify `baseUrl` in config, check firewall |
| Authentication failed | Verify username/password in config |
| Files not uploading | Check watch folder exists, check DDA permissions |
| RO not matching | Verify folder names match RO numbers |

### Logs

```powershell
# View logs in real-time
Get-Content "C:\Program Files\DDA Print Connector\logs\dda-connector.log" -Wait

# View last 100 lines
Get-Content "C:\Program Files\DDA Print Connector\logs\dda-connector.log" -Tail 100
```

---

## Project Structure

```
print-connector/
├── config.js              # Configuration loader
├── config/default.json    # Default settings
├── dda-client.js          # DDA API client + RO matching
├── watcher.js             # File watcher service
├── index.js               # Main entry (service-ready)
├── install-service.js     # node-windows installer
├── package.json           # Dependencies + build config
├── README.md              # This file
├── QUICKSTART.md          # Quick start guide
├── installer/
│   ├── product.wxs        # WiX MSI configuration
│   └── config-template.json
└── scripts/
    ├── install-build-env.ps1  # Install all dependencies
    ├── install-build-env.bat  # Batch wrapper
    ├── build-msi.ps1          # Build MSI
    └── build.bat              # Build MSI (batch)
```

---

## Security Notes

- Credentials stored in `config/local.json` – protect this file
- Use a DDA account with minimal permissions (`uploadFiles` only)
- Consider using environment variables for production deployments
- Watch folder should have appropriate ACLs

---

## License

MIT