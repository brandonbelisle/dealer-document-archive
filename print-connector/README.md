# DDA Print Connector

Windows print connector that monitors a folder for PDF files and automatically uploads them to Dealer Document Archive (DDA).

## Overview

This connector enables "Print to DDA" functionality:

1. Configure "Microsoft Print to PDF" or any PDF printer to save files to a watched folder
2. The connector automatically detects new files
3. **PDFs are scanned for RO (Repair Order) numbers** and matched to existing folders
4. Files with matching RO numbers upload to the correct folder; others go to Unsorted
5. Successfully uploaded files are moved to a `processed` folder
6. Failed uploads are moved to a `failed` folder for retry

## RO Number Matching

The connector automatically extracts RO numbers from filenames and matches them to folders:

- **RO Format:** 10-character string starting with "R10" (e.g., R101234567)
- **Extraction:** RO number is extracted from the filename, not the PDF content
  
- **Matching logic:**
  1. Exact match: Folder name equals RO number (R101234567)
  2. Partial match: Folder name contains RO number
  3. Numeric match: Folder name equals just the 7-digit number (101234567)
  4. No match: File goes to Unsorted for manual sorting

- **Example:** A file named "R101234567_invoice.pdf" uploads to folder named "R101234567" or "101234567"

## Requirements

- Node.js 18+ installed
- Windows (tested on Windows 10/11, Server 2016+)
- DDA server access with valid credentials

## Quick Start

### 1. Install Dependencies

```bash
cd print-connector
npm install
```

### 2. Configure the Connector

Create `config/local.json` with your settings:

```json
{
  "dda": {
    "baseUrl": "https://your-dda-server.com",
    "username": "your-username",
    "password": "your-password",
    "defaultFolderId": "optional-folder-uuid",
    "locationId": "optional-location-uuid",
    "departmentId": "optional-department-uuid"
  },
  "watcher": {
    "watchPath": "C:\\DDA_Print_Output"
  }
}
```

Or use environment variables:

```bash
DDA_BASE_URL=https://your-dda-server.com
DDA_USERNAME=your-username
DDA_PASSWORD=your-password
WATCH_PATH=C:\DDA_Print_Output
```

### 3. Run the Connector

**Standalone (for testing):**
```bash
npm start
```

**As Windows Service (recommended):**
```bash
# Install and start the service (requires Administrator)
 npm run install-service

# Stop and uninstall
npm run uninstall-service
```

## Configuration

| Setting | Description | Default |
|----------|-------------|---------|
|`dda.baseUrl` | DDA server URL | `http://localhost:3000` |
| `dda.username` | DDA login username | Required |
| `dda.password` | DDA login password | Required |
| `dda.defaultFolderId` | Target folder UUID | Uses "Unsorted" |
| `dda.locationId` | Default location | Optional |
| `dda.departmentId` | Default department | Optional |
| `watcher.watchPath` | Folder to watch | `C:\DDA_Print_Output` |
| `watcher.processedPath` | Moved after success | `{watchPath}\processed` |
| `watcher.failedPath` | Moved after failure | `{watchPath}\failed` |
| `watcher.fileExtensions` | Allowed file types | `.pdf`, `.png`, `.jpg` |
| `logging.level` | Log verbosity | `info` |
| `notifications.enabled` | Desktop notifications | `true` |

## Setting Up the PDF Printer

### Option 1: Microsoft Print to PDF (Windows 10+)

1. Open **Settings > Devices > Printers & scanners**
2. Click **Add a printer or scanner**
3. Select **The printer that I want isn't listed**
4. Choose **Add a local printer or network printer with manual settings**
5. Select **Microsoft Print to PDF** (or create new port)
6. After setup, set the default output folder

### Option 2: Third-Party PDF Printers

Applications like Bullzip PDF Printer, PDFCreator, or CutePDF allow configuring:
- Default output folder (set to `C:\DDA_Print_Output`)
- Automatic filename generation (use timestamps ordocument names)

## Folder Structure

```
C:\DDA_Print_Output\
├── your-file.pdf          ← New files appear here
├── processed\             ← Successfully uploaded files
│   └── your-file_2024-01-15T10-30-00.pdf
│   └── your-file_2024-01-15T10-30-00.pdf.meta.json
└── failed\                ← Failed uploads
    └── your-file_2024-01-15T10-30-00.pdf
    └── your-file_2024-01-15T10-30-00.pdf.error.json
```

## Troubleshooting

### Check Logs

```bash
# View recent logs
type logs\dda-connector.log

# Real-time monitoring (PowerShell)
Get-Content logs\dda-connector.log -Wait
```

### Common Issues

**"Cannot connect to DDA server"**
- Verify `baseUrl` is correct
- Check network connectivity
- Verify firewall allows outbound connections

**"Authentication failed"**
- Verify username/password
- Check if account is locked or expired
- Ensure user has upload permissions

**"File not uploaded"**
- Check file size (max 50MB by default)
- Verify file type is in allowed extensions
- Check DDA server logs

### Service Issues

```powershell
# Check service status
sc query "DDA Print Connector"

# View service logs
# Logs are in the print-connector/logs folder

# Manual service control
net start "DDA Print Connector"
net stop "DDA Print Connector"
```

## Security Notes

- Credentials can be stored in `config/local.json` (do not commit)
- Use environment variables for production deployments
- The `local.json` file is excluded from git via `.gitignore`
- Consider using DDA accounts with minimal required permissions

## License

MIT