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
            style={{ border: `1px solid ${t.border}`, borderRadius: 10 }}
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
                              ? "rgba(255,255,255,0.03)"
                              : "rgba(0,0,0,0.02)",
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
                            const sq = stagedDropdownSearch.trim();
                            const dff = sq
                              ? folders
                                  .map((f) => ({
                                    ...f,
                                    ...fuzzyMatch(sq, f.name),
                                  }))
                                  .filter((r) => r.match)
                                  .sort((a, b) => b.score - a.score)
                              : folders;
                            return (
                              <>
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenStagedDropdown(null);
                                    setStagedDropdownSearch("");
                                  }}
                                  style={{
                                    position: "fixed",
                                    inset: 0,
                                    zIndex: 499,
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    zIndex: 500,
                                    background: darkMode
                                      ? "#1a1d23"
                                      : "#ffffff",
                                    border: `1px solid ${t.border}`,
                                    borderRadius: 10,
                                    boxShadow: darkMode
                                      ? "0 12px 40px rgba(0,0,0,0.6)"
                                      : "0 12px 40px rgba(0,0,0,0.2)",
                                    marginTop: 4,
                                  }}
                                >
                                  <div
                                    style={{
                                      padding: "6px 8px",
                                      borderBottom: `1px solid ${t.border}`,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 6,
                                    }}
                                  >
                                    <SearchIcon size={13} style={{ color: t.textDim, flexShrink: 0 }} />
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
                                      placeholder="Search folders..."
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
                                  </div>
                                  <div
                                    style={{
                                      maxHeight: 300,
                                      overflowY: "auto",
                                      padding: 3,
                                    }}
                                  >
                                    {(() => {
                                      const sq = stagedDropdownSearch.trim();
                                      const searchResults = sq
                                        ? folders
                                            .map((f) => ({
                                              ...f,
                                              ...fuzzyMatch(sq, f.name),
                                            }))
                                            .filter((r) => r.match)
                                            .sort((a, b) => b.score - a.score)
                                            .slice(0, 10)
                                        : [];
                                      
                                      if (sq && searchResults.length === 0) {
                                        return (
                                          <div
                                            style={{
                                              padding: "12px",
                                              fontSize: 11,
                                              color: t.textDim,
                                              textAlign: "center",
                                            }}
                                          >
                                            No folders match "{sq}"
                                          </div>
                                        );
                                      }
                                      
                                      return searchResults.length > 0 ? (
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
                                            {sq ? "Search Results" : "All Folders"}
                                          </div>
                                          {searchResults.map((folder) => {
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
                                      ) : (
                                        <div
                                          style={{
                                            padding: "10px",
                                            fontSize: 11,
                                            color: t.textDim,
                                            textAlign: "center",
                                          }}
                                        >
                                          No folders available
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
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
