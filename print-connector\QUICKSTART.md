# Quick Start Guide

## One-Time Setup (Windows)

1. **Run as Administrator**: Right-click `scripts\install-build-env.bat` → **Run as Administrator**
   
   This automatically installs:
   - Node.js 20 LTS
   - WiX Toolset v3
   - All npm dependencies

2. **Restart your terminal** (to refresh PATH)

## Build the MSI

**Quick build:**
```
scripts\build.bat
```

**Or manually:**
```powershell
.\scripts\build-msi.ps1
```

The MSI will be created at: `dist\msi\DDAPrintConnector-{version}.msi`

## Install on Target Machine

1. Copy `DDAPrintConnector-{version}.msi` to the target computer
2. Right-click → **Install** (must be Administrator)
3. Configure: `C:\Program Files\DDA Print Connector\config\local.json`
4. Start: `sc start DDAPrintConnector`

## Configuration

Edit `config\local.json` with your DDA credentials:

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

## File Structure After Installation

```
C:\Program Files\DDA Print Connector\
├── dda-print-connector.exe
├── config\
│   └── default.json
├── logs\
│   └── dda-connector.log
└── config\local.json  (create this)
```

## Troubleshooting

**Build fails:**
- Ensure you ran `install-build-env.bat` as Administrator
- Restart terminal after installation
- Check Node.js and WiX are in PATH:
  ```
  node --version
  candle -?
  ```

**Service won't start:**
- Check logs: `C:\Program Files\DDA Print Connector\logs\`
- Verify config file exists and is valid JSON
- Verify DDA server URL and credentials

**Files not uploading:**
- Check watch folder exists: `C:\DDA_Print_Output`
- Check DDA server is accessible
- Check user has upload permissions