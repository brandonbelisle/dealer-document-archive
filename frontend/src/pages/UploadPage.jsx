import { useState, useRef } from "react";
import { fmtSize, fuzzyMatch } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import {
  UploadCloudIcon,
  FileDocIcon,
  FolderClosedIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  SearchIcon,
  ChevronDown,
  RefreshIcon,
} from "../components/Icons";

export default function UploadPage({
  stagedFiles,
  setStagedFiles,
  stagedFolderAssignments,
  setStagedFolderAssignments,
  stagedSuggestions,
  setStagedSuggestions,
  folders,
  locations,
  departments,
  deptsInLocation,
  handleDrop,
  handleUploadFiles,
  dragOver,
  setDragOver,
  uploadAllStaged,
  removeStagedFile,
  t,
  darkMode,
  watchedFiles,
  setWatchedFiles,
  watchedFolderPath,
  watchFolderEnabled,
  autoUploadEnabled,
  scanWatchedFolder,
  isScanning,
  lastScanTime,
}) {
  const fileInputRef = useRef(null);
  const [openStagedDropdown, setOpenStagedDropdown] = useState(null);
  const [stagedDropdownSearch, setStagedDropdownSearch] = useState("");

  const allDone =
    stagedFiles.length > 0 &&
    stagedFiles.every((f) => f.status !== "processing");
  const readyCount = stagedFiles.filter(
    (f) => f.status === "done"
  ).length;
  const assignedCount = stagedFiles.filter(
    (f) => f.status === "done" && stagedFolderAssignments[f.id]
  ).length;
  const unsortedCount = readyCount - assignedCount;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.35s ease",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Upload</h1>
        <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
          Upload PDF and image files. Optionally assign each to a folder, or leave
          unassigned to go to Unsorted.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setDragOver(false);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? t.accent : t.border}`,
          borderRadius: 14,
          padding: "44px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? t.dropzoneActive : t.dropzone,
          marginBottom: 24,
          position: "relative",
        }}
      >
        <div
          style={{
            color: dragOver ? t.accent : t.textDim,
            marginBottom: 10,
          }}
        >
          <UploadCloudIcon />
        </div>
        <p
          style={{
            fontSize: 16,
            fontWeight: 500,
            marginBottom: 4,
            color: t.text,
          }}
        >
          {dragOver ? "Drop files" : "Drag & drop PDF and image files"}
        </p>
        <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
          or click to browse · max 50 MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*"
          multiple
          onChange={(e) => {
            handleUploadFiles(e.target.files);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      {/* Watched folder files section */}
      {watchFolderEnabled && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: 12 
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FolderClosedIcon size={16} style={{ color: t.accent }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                Watched Folder: {watchedFolderPath || "Unknown"}
              </span>
              {autoUploadEnabled && (
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 600,
                  background: darkMode ? "rgba(34,197,94,0.2)" : "rgba(34,197,94,0.1)",
                  color: darkMode ? "#22c55e" : "#16a34a",
                  padding: "2px 8px",
                  borderRadius: 4,
                  marginLeft: 8
                }}>
                  Auto Upload
                </span>
              )}
            </div>
            <button
              onClick={scanWatchedFolder}
              disabled={isScanning}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                background: isScanning ? t.border : t.accent,
                border: "none",
                borderRadius: 6,
                color: "white",
                fontSize: 11,
                fontWeight: 600,
                cursor: isScanning ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: isScanning ? 0.6 : 1,
              }}
            >
              <RefreshIcon size={14} spin={isScanning} />
              {isScanning ? "Scanning..." : "Scan Now"}
            </button>
          </div>

          {watchedFiles.length > 0 ? (
            <div style={{ 
              border: `1px solid ${t.border}`, 
              borderRadius: 10, 
              overflow: "visible",
              background: darkMode ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 14px",
                background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                borderBottom: `1px solid ${t.border}`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textDim,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>File</div>
                <div style={{ width: 80, textAlign: "right", flexShrink: 0 }}>
                  Size
                </div>
                <div style={{ width: 80, textAlign: "center", flexShrink: 0, paddingLeft: 12 }}>
                  Action
                </div>
              </div>

              {watchedFiles.slice(0, 10).map((wf, idx) => (
                <div
                  key={`${wf.name}-${idx}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom: idx < Math.min(watchedFiles.length, 10) - 1 ? `1px solid ${t.border}` : "none",
                  }}
                >
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: t.accentSoft,
                      color: t.accent,
                    }}>
                      <FileDocIcon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}>
                        {wf.name}
                      </div>
                      {wf.path !== wf.name && (
                        <div style={{ fontSize: 10, color: t.textDim }}>
                          {wf.path}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ width: 80, textAlign: "right", fontSize: 11, color: t.textMuted, flexShrink: 0 }}>
                    {fmtSize(wf.size)}
                  </div>

                  <div style={{ width: 80, display: "flex", justifyContent: "center", flexShrink: 0, paddingLeft: 12 }}>
                    <SmallBtn
                      t={t}
                      title="Add to upload queue"
                      onClick={() => {
                        handleUploadFiles([wf.file]);
                      }}
                    >
                      Add
                    </SmallBtn>
                  </div>
                </div>
              ))}

              {watchedFiles.length > 10 && (
                <div style={{ 
                  padding: "8px 14px", 
                  fontSize: 11, 
                  color: t.textMuted,
                  textAlign: "center",
                  borderTop: `1px solid ${t.border}`,
                  background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)"
                }}>
                    And {watchedFiles.length - 10} more file{watchedFiles.length - 10 !== 1 ? "s" : ""}...
                  </div>
              )}
            </div>
          ) : (
            <div style={{
              padding: "32px 24px",
              textAlign: "center",
              border: `1px dashed ${t.border}`,
              borderRadius: 10,
              background: darkMode ? "rgba(255,255,255,0.01)" : "rgba(0,0,0,0.01)"
            }}>
              <FileDocIcon size={32} style={{ color: t.textDim, marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: t.textMuted }}>
                {isScanning ? "Scanning folder..." : "No files found in watched folder"}
              </div>
              {lastScanTime && !isScanning && (
                <div style={{ fontSize: 11, color: t.textDim, marginTop: 4 }}>
                  Last scanned: {lastScanTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Staged files table */}
      {stagedFiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{ fontSize: 13, fontWeight: 600, color: t.text }}
            >
              {stagedFiles.length} file
              {stagedFiles.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => {
                setStagedFiles([]);
                setStagedFolderAssignments({});
                setStagedSuggestions({});
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: t.error,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "inherit",
              }}
            >
              Clear All
            </button>
          </div>
          <div
            style={{ border: `1px solid ${t.border}`, borderRadius: 10, overflow: "visible" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 14px",
                background: darkMode
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                borderBottom: `1px solid ${t.border}`,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: t.textDim,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>File</div>
              <div
                style={{ width: 60, textAlign: "right", flexShrink: 0 }}
              >
                Size
              </div>
              <div
                style={{ width: 45, textAlign: "right", flexShrink: 0 }}
              >
                Pages
              </div>
              <div
                style={{
                  width: 320,
                  textAlign: "left",
                  flexShrink: 0,
                  paddingLeft: 12,
                }}
              >
                Assign to Folder
              </div>
              <div style={{ width: 30, flexShrink: 0 }}></div>
            </div>

            {stagedFiles.map((sf, idx) => {
              const suggestion = stagedSuggestions[sf.id];
              const assignedFolderId =
                stagedFolderAssignments[sf.id] || null;
              const assignedFolder = assignedFolderId
                ? folders.find((f) => f.id === assignedFolderId)
                : null;
              const isOpen = openStagedDropdown === sf.id;
              const hasSuggestion =
                suggestion?.folder &&
                !assignedFolderId &&
                suggestion.confidence !== "none";

              return (
                <div
                  key={sf.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderBottom:
                      idx < stagedFiles.length - 1
                        ? `1px solid ${t.border}`
                        : "none",
                    animation: `fadeIn 0.2s ease ${idx * 0.03}s both`,
                    position: "relative",
                    zIndex: isOpen ? 1000 : 1,
                  }}
                >
                  {sf.status === "processing" && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        bottom: 0,
                        height: 2,
                        width: "100%",
                        background: t.progressBg,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${sf.progress}%`,
                          background: `linear-gradient(90deg,${t.accent},${t.accentDark})`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  )}

                  {/* File info */}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background:
                          sf.status === "error"
                            ? t.errorSoft
                            : sf.status === "done"
                              ? t.successSoft
                              : t.accentSoft,
                        color:
                          sf.status === "error"
                            ? t.error
                            : sf.status === "done"
                              ? t.success
                              : t.accent,
                      }}
                    >
                      {sf.status === "done" ? (
                        <CheckIcon />
                      ) : (
                        <FileDocIcon size={14} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {sf.name}
                      </div>
                      {sf.status === "processing" && (
                        <div style={{ fontSize: 10, color: t.accent }}>
                          Processing {sf.progress}%
                        </div>
                      )}
                      {sf.status === "error" && (
                        <div style={{ fontSize: 10, color: t.error }}>
                          {sf.error}
                        </div>
                      )}
                      {suggestion?.ro && sf.status === "done" && (
                        <div style={{ fontSize: 10, color: t.textDim }}>
                          RO# {suggestion.ro}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 60,
                      textAlign: "right",
                      fontSize: 11,
                      color: t.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {fmtSize(sf.size)}
                  </div>
                  <div
                    style={{
                      width: 45,
                      textAlign: "right",
                      fontSize: 11,
                      color: t.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {sf.pages || "—"}
                  </div>

                  {/* Per-file folder dropdown */}
                  <div
                    style={{
                      width: 320,
                      flexShrink: 0,
                      paddingLeft: 12,
                      position: "relative",
                    }}
                  >
                    {sf.status === "done" ? (
                      <>
                        {hasSuggestion && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 4,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: darkMode
                                ? "rgba(210,153,34,0.1)"
                                : "rgba(180,83,9,0.06)",
                              fontSize: 10,
                              color: darkMode ? "#d29922" : "#b45309",
                            }}
                          >
                            <span>
                              Suggested:{" "}
                              <b>{suggestion.folder.name}</b>
                            </span>
                            <button
                              onClick={() =>
                                setStagedFolderAssignments((p) => ({
                                  ...p,
                                  [sf.id]: suggestion.folder.id,
                                }))
                              }
                              style={{
                                background: t.successSoft,
                                color: t.success,
                                border: "none",
                                borderRadius: 4,
                                padding: "1px 6px",
                                fontSize: 9.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                setStagedSuggestions((p) => {
                                  const n = { ...p };
                                  n[sf.id] = {
                                    ...n[sf.id],
                                    confidence: "none",
                                  };
                                  return n;
                                })
                              }
                              style={{
                                background: "transparent",
                                color: t.textDim,
                                border: "none",
                                padding: "1px 4px",
                                fontSize: 9.5,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                        <div
                          onClick={() => {
                            setOpenStagedDropdown(
                              isOpen ? null : sf.id
                            );
                            setStagedDropdownSearch("");
                          }}
                          style={{
                            border: `1px solid ${isOpen ? t.accent : t.border}`,
                            borderRadius: 7,
                            padding: "5px 10px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            background: darkMode
                              ? "rgba(30,35,42,0.95)"
                              : "rgba(255,255,255,0.95)",
                          }}
                        >
                          <FolderClosedIcon size={13} />
                          <span
                            style={{
                              flex: 1,
                              color: assignedFolder
                                ? t.text
                                : t.textDim,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {assignedFolder
                              ? assignedFolder.name
                              : "Unsorted (optional)"}
                          </span>
                          {assignedFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setStagedFolderAssignments((p) => {
                                  const n = { ...p };
                                  delete n[sf.id];
                                  return n;
                                });
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: t.textDim,
                                padding: 0,
                                display: "flex",
                              }}
                            >
                              <XIcon size={12} />
                            </button>
                          )}
                          <ChevronDown />
                        </div>
                        {isOpen &&
                          (() => {
                            return (
                              <>
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    zIndex: 999,
                                    background: darkMode
                                      ? "#1e232a"
                                      : "#ffffff",
                                    border: `1px solid ${t.border}`,
                                    borderRadius: 10,
                                    boxShadow: darkMode
                                      ? "0 16px 48px rgba(0,0,0,0.7)"
                                      : "0 16px 48px rgba(0,0,0,0.25)",
                                    marginTop: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "8px",
                                      borderBottom: `1px solid ${t.border}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                        background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                                        border: `1px solid ${t.border}`,
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                      }}
                                    >
                                      <SearchIcon size={14} style={{ color: t.textDim, flexShrink: 0 }} />
                                      <input
                                        autoFocus
                                        value={stagedDropdownSearch}
                                        onChange={(e) =>
                                          setStagedDropdownSearch(
                                            e.target.value
                                          )
                                        }
                                        onClick={(e) =>
                                          e.stopPropagation()
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Escape")
                                            setOpenStagedDropdown(null);
                                        }}
                                        placeholder="Search folders by name..."
                                        style={{
                                          flex: 1,
                                          background: "transparent",
                                          border: "none",
                                          fontSize: 12,
                                          color: t.text,
                                          outline: "none",
                                          fontFamily: "inherit",
                                        }}
                                      />
                                      {stagedDropdownSearch && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setStagedDropdownSearch("");
                                          }}
                                          style={{
                                            background: "transparent",
                                            border: "none",
                                            cursor: "pointer",
                                            color: t.textDim,
                                            padding: 0,
                                            display: "flex",
                                          }}
                                        >
                                          <XIcon size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      maxHeight: 300,
                                      overflowY: "auto",
                                      padding: "4px 0",
                                    }}
                                  >
                                    {(() => {
                                      const searchQuery = stagedDropdownSearch.trim();
                                      const searchLower = searchQuery.toLowerCase();
                                      
                                      // Filter folders - search by name
                                      let filtered = [];
                                      if (folders && folders.length > 0) {
                                        if (searchQuery) {
                                          filtered = folders.filter((f) => 
                                            f.name && f.name.toLowerCase().includes(searchLower)
                                          );
                                        } else {
                                          filtered = [...folders];
                                        }
                                      }
                                      
                                      // Show max 10 results when searching
                                      const displayFolders = searchQuery ? filtered.slice(0, 10) : filtered.slice(0, 10);
                                      const totalMatches = filtered.length;
                                      
                                      if (!folders || folders.length === 0) {
                                        return (
                                          <div
                                            style={{
                                              padding: "12px",
                                              fontSize: 11,
                                              color: t.textDim,
                                              textAlign: "center",
                                            }}
                                          >
                                            No folders exist yet. Create folders in the Locations section.
                                          </div>
                                        );
                                      }
                                      
                                      if (displayFolders.length === 0 && searchQuery) {
                                        return (
                                          <div
                                            style={{
                                              padding: "12px",
                                              fontSize: 11,
                                              color: t.textDim,
                                              textAlign: "center",
                                            }}
                                          >
                                            No folders match "{searchQuery}"
                                          </div>
                                        );
                                      }
                                      
                                      return (
                                        <div>
                                          <div
                                            style={{
                                              padding: "4px 8px 2px",
                                              fontSize: 9,
                                              fontWeight: 700,
                                              letterSpacing: "0.06em",
                                              textTransform: "uppercase",
                                              color: t.textMuted,
                                            }}
                                          >
                                            {searchQuery 
                                              ? `Results for "${searchQuery}" (${totalMatches} found)`
                                              : `All Folders (${displayFolders.length})`}
                                          </div>
                                          {displayFolders.map((folder) => {
                                            const loc = locations.find((l) => l.id === folder.locationId);
                                            const dept = departments.find((d) => d.id === folder.departmentId);
                                            return (
                                              <div
                                                key={folder.id}
                                                onClick={() => {
                                                  setStagedFolderAssignments((p) => ({
                                                    ...p,
                                                    [sf.id]: folder.id,
                                                  }));
                                                  setOpenStagedDropdown(null);
                                                  setStagedDropdownSearch("");
                                                }}
                                                className="folder-select-item"
                                                style={{
                                                  padding: "6px 8px",
                                                  borderRadius: 5,
                                                  cursor: "pointer",
                                                  fontSize: 11.5,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 7,
                                                  background:
                                                    assignedFolderId === folder.id
                                                      ? t.accentSoft
                                                      : "transparent",
                                                  color:
                                                    assignedFolderId === folder.id
                                                      ? t.accent
                                                      : t.text,
                                                  fontWeight: 500,
                                                }}
                                              >
                                                <FolderClosedIcon size={12} />
                                                <span style={{ flex: 1 }}>{folder.name}</span>
                                                <span style={{ fontSize: 9.5, color: t.textDim }}>
                                                  {loc?.name} / {dept?.name}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                                {/* Backdrop - click to close */}
                                <div
                                  onClick={() => {
                                    setOpenStagedDropdown(null);
                                    setStagedDropdownSearch("");
                                  }}
                                  style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 998,
                                  }}
                                />
                              </>
                            );
                          })()}
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: t.textDim }}>
                        —
                      </span>
                    )}
                  </div>

                  {/* Remove button */}
                  <div
                    style={{
                      width: 30,
                      display: "flex",
                      justifyContent: "flex-end",
                      flexShrink: 0,
                    }}
                  >
                    <SmallBtn
                      t={t}
                      title="Remove"
                      onClick={() => removeStagedFile(sf.id)}
                    >
                      <TrashIcon size={12} />
                    </SmallBtn>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload button */}
          {allDone && readyCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
              }}
            >
              <div style={{ fontSize: 12, color: t.textMuted }}>
                {assignedCount > 0 && (
                  <span>
                    {assignedCount} to folder
                    {assignedCount !== 1 ? "s" : ""}
                  </span>
                )}
                {assignedCount > 0 && unsortedCount > 0 && (
                  <span> · </span>
                )}
                {unsortedCount > 0 && (
                  <span
                    style={{
                      color: darkMode ? "#d29922" : "#b45309",
                    }}
                  >
                    {unsortedCount} to Unsorted
                  </span>
                )}
              </div>
              <Btn
                primary
                darkMode={darkMode}
                t={t}
                onClick={uploadAllStaged}
                style={{ padding: "10px 28px", fontSize: 13.5 }}
              >
                <UploadCloudIcon size={16} /> Upload {readyCount} File
                {readyCount !== 1 ? "s" : ""}
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
