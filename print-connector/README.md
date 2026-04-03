# DDA Print Connector

Windows print connector that monitors a folder for PDF files and automatically uploads them to Dealer Document Archive (DDA).

## Overview

This connector enables "Print to DDA" functionality:

1. Configure any PDF printer to save files to a watched folder
2. The connector automatically detects new files
3. **RO numbers are extracted from filenames** (10-char string starting with R10)
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

## Installation

### Option1: MSI Installer (Recommended)

1. **Prerequisites:**
   - Windows 10/11 or Windows Server 2016+
   - DDA server access with valid credentials

2. **Build the MSI** (requires [WiX Toolset](https://wixtoolset.org/releases/)):
   ```powershell
   cd print-connector
   npm install --include=dev
   .\scripts\build-msi.ps1
   ```

3. **Install:**
   - Right-click `dist\msi\DDAPrintConnector-1.0.0.msi` → Run as Administrator
   - Or from command line: `msiexec /i DDAConnecto-1.0.0.msi`

4. **Configure:**
   - Edit `C:\Program Files\DDA Print Connector\config\local.json`
   - Set your DDA server URL, username, password, and watch folder

5. **Start the service:**
   ```powershell
   sc start DDAPrintConnector
   ```

### Option 2: Manual Installation

1. **Install Node.js 18+**

2. **Install dependencies:**
   ```bash
   cd print-connector
   npm install
   ```

3. **Configure:**
   Create `config/local.json`:
   ```json
   {
     "dda": {
       "baseUrl": "https://your-dda-server.com",
       "username": "your-username",
       "password": "your-password"
     },
     "watcher": {
       "watchPath": "C:\\DDA_Print_Output"
     }
   }
   ```

4. **Run:**
   ```bash
   npm start
   ```

   **Install as service:**
   ```bash
   npm run install-service
   ```

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `dda.baseUrl` | DDA server URL | `http://localhost:3000` |
| `dda.username` | DDA login username | Required |
| `dda.password` | DDA login password | Required |
| `dda.defaultFolderId` | Target folder UUID | Uses RO matching or Unsorted |
| `watcher.watchPath` | Folder to watch | `C:\DDA_Print_Output` |
| `watcher.processedPath` | Moved after success | `{watchPath}\processed` |
| `watcher.failedPath` | Moved after failure | `{watchPath}\failed` |
| `watcher.fileExtensions` | Allowed file types | `.pdf`, `.png`, `.jpg` |
| `logging.level` | Log verbosity | `info` |

## Setting Up the PDF Printer

### Option1: PDFCreator (Recommended)

1. Install [PDFCreator](https://www.pdfforge.org/pdfcreator) (free version available)
2. Go to **Profiles → Create Profile** → Name it "DDA Upload"
3. Configure:
   - **Filename:** `{DateTime}_{FileName}`
   - **Target directory:** `C:\DDA_Print_Output`
   - **Disable:** Show quick action window, Input box
4. Set as default printer or select when printing

### Option 2: Bullzip PDF Printer

1. Install [Bullzip PDF Printer](https://www.bullzip.com/)
2. Configure output folder to `C:\DDA_Print_Output`
3. Enable auto-naming with timestamps

## Folder Structure

```
C:\DDA_Print_Output\
├── R101234567_invoice.pdf     ← New files appear here
├── processed\                 ← Successfully uploaded
│   └── R101234567_invoice_2024-01-15T10-30-00.pdf
│   └── R101234567_invoice_2024-01-15T10-30-00.pdf.meta.json
└── failed\                    ← Failed uploads
    └── problem_file.pdf
    └── problem_file.pdf.error.json
```

## Service Management

```powershell
# Check service status
sc query DDAPrintConnector

# Start service
sc start DDAPrintConnector

# Stop service
sc stop DDAPrintConnector

# View logs
Get-Content "C:\Program Files\DDA Print Connector\logs\dda-connector.log" -Wait
```

## Building the MSI

### Requirements

1. [Node.js 18+](https://nodejs.org/)
2. [WiX Toolset v3or v4](https://wixtoolset.org/releases/)

### Build Commands

**PowerShell:**
```powershell
.\scripts\build-msi.ps1
```

**Batch:**
```cmd
.\scripts\build-msi.bat
```

**Node.js:**
```bash
node scripts/build-msi.js
```

The MSI will be created at `dist\msi\DDAPrintConnector-{version}.msi`

## Troubleshooting

### Check Logs

```powershell
# MSI install log
msiexec /i DDAConnector-1.0.0.msi /l*v install.log

# Service logs
Get-Content "C:\Program Files\DDA Print Connector\logs\dda-connector.log" -Tail 100
```

### Common Issues

**"Cannot connect to DDA server"**
- Verify `baseUrl` in config
- Check firewall allows outbound connections
- Verify DDA server is running

**"Authentication failed"**
- Verify username/password in config
- Check if DDA account has upload permissions

**"Service starts but doesn't process files"**
- Check logs for errors
- Verify watch folder exists
- Verify DDA credentials are correct

**"MSI install fails"**
- Run as Administrator
- Check Windows Installer logs
- Verify .NET Framework 3.5+ is installed

## Security Notes

- Credentials are stored in `config/local.json` - protect this file
- For production, use Windows service account with minimal permissions
- DDA account should have only `uploadFiles` permission
- Consider using environment variables instead of config file

## License

MIT