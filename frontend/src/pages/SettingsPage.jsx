import { useState, useEffect } from "react";
import { SunIcon, MoonIcon, FolderClosedIcon, RefreshIcon } from "../components/Icons";
import { saveHandle, getHandle, removeHandle, checkPermission } from "../utils/fileHandles";

export default function SettingsPage({ darkMode, setDarkMode, t }) {
  const [watchFolderEnabled, setWatchFolderEnabled] = useState(false);
  const [autoUploadEnabled, setAutoUploadEnabled] = useState(false);
  const [watchedFolderPath, setWatchedFolderPath] = useState(null);
  const [watchedFolderHandle, setWatchedFolderHandle] = useState(null);
  const [folderPermissionStatus, setFolderPermissionStatus] = useState(null);
  const [handledFolderPath, setHandledFolderPath] = useState(null);
  const [handledFolderHandle, setHandledFolderHandle] = useState(null);

  useEffect(() => {
    const savedWatchFolder = localStorage.getItem('dda_watch_folder_enabled');
    const savedAutoUpload = localStorage.getItem('dda_auto_upload_enabled');
    const savedFolderPath = localStorage.getItem('dda_watched_folder_path');
    const savedHandledFolderPath = localStorage.getItem('dda_handled_folder_path');
    
    if (savedWatchFolder === 'true') setWatchFolderEnabled(true);
    if (savedAutoUpload === 'true') setAutoUploadEnabled(true);
    if (savedFolderPath) setWatchedFolderPath(savedFolderPath);
    if (savedHandledFolderPath) setHandledFolderPath(savedHandledFolderPath);

    const initHandles = async () => {
      const savedWatchHandle = await getHandle('watchedFolder');
      if (savedWatchHandle && await checkPermission(savedWatchHandle)) {
        setWatchedFolderHandle(savedWatchHandle);
      }
      
      const savedHandledHandle = await getHandle('handledFolder');
      if (savedHandledHandle && await checkPermission(savedHandledHandle)) {
        setHandledFolderHandle(savedHandledHandle);
      }
    };
    
    initHandles();
  }, []);

  const handleSelectFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support folder access. Please use Chrome, Edge, or another Chromium-based browser.');
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'read' });
      const permission = await handle.requestPermission({ mode: 'read' });
      
      if (permission === 'granted') {
        setWatchedFolderHandle(handle);
        setWatchedFolderPath(handle.name);
        setWatchFolderEnabled(true);
        setFolderPermissionStatus('granted');
        
        localStorage.setItem('dda_watch_folder_enabled', 'true');
        localStorage.setItem('dda_watched_folder_path', handle.name);
        localStorage.setItem('dda_watched_folder_name', handle.name);
        
        await saveHandle('watchedFolder', handle);
        
        window.dispatchEvent(new CustomEvent('watchFolderChanged', { 
          detail: { handle, path: handle.name, enabled: true, autoUpload: autoUploadEnabled }
        }));
      } else {
        setFolderPermissionStatus('denied');
        alert('Permission denied. Please allow access to the folder.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        alert('Failed to select folder. Please try again.');
      }
    }
  };

  const handleDisableWatchFolder = async () => {
    setWatchFolderEnabled(false);
    setAutoUploadEnabled(false);
    setWatchedFolderPath(null);
    setWatchedFolderHandle(null);
    setFolderPermissionStatus(null);
    
    localStorage.removeItem('dda_watch_folder_enabled');
    localStorage.removeItem('dda_auto_upload_enabled');
    localStorage.removeItem('dda_watched_folder_path');
    localStorage.removeItem('dda_watched_folder_name');
    
    await removeHandle('watchedFolder');
    
    window.dispatchEvent(new CustomEvent('watchFolderChanged', { 
      detail: { handle: null, path: null, enabled: false, autoUpload: false }
    }));
  };

  const handleToggleAutoUpload = () => {
    const newValue = !autoUploadEnabled;
    setAutoUploadEnabled(newValue);
    localStorage.setItem('dda_auto_upload_enabled', newValue.toString());
    
    window.dispatchEvent(new CustomEvent('autoUploadChanged', { 
      detail: { enabled: newValue }
    }));
  };

  const handleSelectHandledFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Your browser does not support folder access. Please use Chrome, Edge, or another Chromium-based browser.');
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const permission = await handle.requestPermission({ mode: 'readwrite' });
      
      if (permission === 'granted') {
        setHandledFolderHandle(handle);
        setHandledFolderPath(handle.name);
        
        localStorage.setItem('dda_handled_folder_path', handle.name);
        
        await saveHandle('handledFolder', handle);
        
        window.dispatchEvent(new CustomEvent('handledFolderChanged', { 
          detail: { handle, path: handle.name }
        }));
      } else {
        alert('Permission denied. Please allow access to the folder.');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting folder:', err);
        alert('Failed to select folder. Please try again.');
      }
    }
  };

  const handleClearHandledFolder = async () => {
    setHandledFolderPath(null);
    setHandledFolderHandle(null);
    localStorage.removeItem('dda_handled_folder_path');
    
    await removeHandle('handledFolder');
    
    window.dispatchEvent(new CustomEvent('handledFolderChanged', { 
      detail: { handle: null, path: null }
    }));
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: t.text }}>
        Settings
      </h1>

      <div style={{ 
        background: t.surface, 
        border: `1px solid ${t.border}`, 
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 16 
      }}>
        <div style={{ 
          padding: "16px 20px", 
          borderBottom: `1px solid ${t.border}`,
          background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" 
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>
            Appearance
          </h2>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                Dark Mode
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                Switch between light and dark themes
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: darkMode 
                  ? "linear-gradient(135deg, #f59e0b, #d97706)" 
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {darkMode ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ 
        background: t.surface, 
        border: `1px solid ${t.border}`, 
        borderRadius: 12,
        overflow: "hidden"
      }}>
        <div style={{ 
          padding: "16px 20px", 
          borderBottom: `1px solid ${t.border}`,
          background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" 
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>
            Upload Folder Watch
          </h2>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 8 }}>
              Watch Folder
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>
              Select a folder to monitor for new files. Files will appear in the Upload page for quick bulk upload.
            </div>
            
            {watchFolderEnabled && watchedFolderPath ? (
              <div style={{ 
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                border: `1px solid ${darkMode ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}`,
                borderRadius: 8
              }}>
                <FolderClosedIcon size={18} />
                <div style={{ flex: 1, fontSize: 13, color: t.text, fontWeight: 500 }}>
                  {watchedFolderPath}
                </div>
                <button
                  onClick={handleSelectFolder}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    background: t.accent,
                    border: "none",
                    borderRadius: 6,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <RefreshIcon size={14} />
                  Change
                </button>
                <button
                  onClick={handleDisableWatchFolder}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: `1px solid ${t.border}`,
                    borderRadius: 6,
                    color: t.textMuted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Disable
                </button>
              </div>
            ) : (
              <button
                onClick={handleSelectFolder}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  background: t.accent,
                  border: "none",
                  borderRadius: 8,
                  color: "white",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <FolderClosedIcon size={16} />
                Select Folder
              </button>
            )}
          </div>

          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            paddingTop: 16,
            borderTop: `1px solid ${t.border}`
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                Auto Upload
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                Automatically upload new files detected in the watched folder
              </div>
            </div>
            <button
              onClick={handleToggleAutoUpload}
              disabled={!watchFolderEnabled}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: autoUploadEnabled 
                  ? "linear-gradient(135deg, #10b981, #059669)" 
                  : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                border: `1px solid ${autoUploadEnabled ? "transparent" : t.border}`,
                borderRadius: 8,
                color: watchFolderEnabled ? (autoUploadEnabled ? "white" : t.textMuted) : t.textDim,
                fontSize: 13,
                fontWeight: 600,
                cursor: watchFolderEnabled ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                opacity: watchFolderEnabled ? 1 : 0.5,
              }}
            >
              {autoUploadEnabled ? "Enabled" : "Disabled"}
            </button>
          </div>

          {watchFolderEnabled && (
            <div style={{ 
              marginTop: 16,
              paddingTop: 16,
              borderTop: `1px solid ${t.border}`
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 8 }}>
                Handled Folder
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 12 }}>
                Folder where auto-uploaded files will be moved after being processed. Files are moved after successful upload when Auto Upload is enabled. If not set, files will remain in the watch folder.
              </div>
              
              {handledFolderPath ? (
                <div style={{ 
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: darkMode ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.05)",
                  border: `1px solid ${darkMode ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}`,
                  borderRadius: 8
                }}>
                  <FolderClosedIcon size={18} />
                  <div style={{ flex: 1, fontSize: 13, color: t.text, fontWeight: 500 }}>
                    {handledFolderPath}
                  </div>
                  <button
                    onClick={handleSelectHandledFolder}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: t.accent,
                      border: "none",
                      borderRadius: 6,
                      color: "white",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <RefreshIcon size={14} />
                    Change
                  </button>
                  <button
                    onClick={handleClearHandledFolder}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      color: t.textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSelectHandledFolder}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${t.border}`,
                    borderRadius: 8,
                    color: t.textMuted,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <FolderClosedIcon size={16} />
                  Select Handled Folder
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}