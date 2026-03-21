import { useState, useRef, useEffect } from "react";
import { fmtSize, fuzzyMatch } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import {
  FileDocIcon,
  ImageIcon,
  FolderClosedIcon,
  CheckIcon,
  TrashIcon,
  SearchIcon,
  ChevronDown,
} from "../components/Icons";
import PdfCanvasPreview from "../components/PdfCanvasPreview";
import * as api from "../api";

function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt)) return "—";
  const mon = dt.toLocaleString("en-US", { month: "short" });
  const day = dt.getDate();
  const yr = dt.getFullYear();
  const h = dt.getHours();
  const m = dt.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${mon} ${day}, ${yr} ${h12}:${m} ${ampm}`;
}

export default function UnsortedPage({
  unsortedFiles,
  folders,
  locations,
  departments,
  deptsInLocation,
  handleMoveFile,
  removeFile,
  setUnsortedFiles,
  setWarningModal,
  loggedInUser,
  t,
  darkMode,
}) {
  const canDeleteFiles = loggedInUser?.permissions?.includes("deleteFiles");
  const [movingFileId, setMovingFileId] = useState(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [showMoveSelect, setShowMoveSelect] = useState(false);
  const [moveSelectSearch, setMoveSelectSearch] = useState("");
  const moveSelectRef = useRef(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sortCol, setSortCol] = useState("uploadedAt");
  const [sortDir, setSortDir] = useState("desc");

  const selectedFile = unsortedFiles.find((f) => f.id === selectedFileId);

  const getFileTypeInfo = (file) => {
    const mimeType = file.type || "";
    if (mimeType.startsWith("image/")) {
      return { type: "image", label: "Image", icon: ImageIcon };
    }
    if (mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      return { type: "document", label: "Document", icon: FileDocIcon };
    }
    return { type: "other", label: "Other", icon: FileDocIcon };
  };

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedFiles = [...unsortedFiles].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "name":
        cmp = (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        });
        break;
      case "size":
        cmp = (a.size || 0) - (b.size || 0);
        break;
      case "uploadedAt": {
        const da = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const db = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        cmp = da - db;
        break;
      }
      case "uploadedBy":
        cmp = (a.uploadedBy || "").localeCompare(b.uploadedBy || "", undefined, {
          sensitivity: "base",
        });
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  // Auto-select first file when list changes
  useEffect(() => {
    if (
      unsortedFiles.length > 0 &&
      !unsortedFiles.find((f) => f.id === selectedFileId)
    ) {
      setSelectedFileId(sortedFiles[0]?.id ?? null);
    } else if (unsortedFiles.length === 0) {
      setSelectedFileId(null);
    }
  }, [unsortedFiles, selectedFileId, sortedFiles]);

  // Load preview data when selected file changes
  useEffect(() => {
    if (!selectedFile) {
      setPreviewDataUrl(null);
      return;
    }

    const filePdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");
    const fileImage = selectedFile.type?.startsWith("image/");

    if (!filePdf && !fileImage) {
      setPreviewDataUrl(null);
      return;
    }

    if (selectedFile.fileDataUrl) {
      setPreviewDataUrl(selectedFile.fileDataUrl);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    setPreviewDataUrl(null);

    const downloadUrl = api.getFileDownloadUrl(selectedFile.id);
    const token = localStorage.getItem("dda_token");

    fetch(downloadUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const reader = new FileReader();
        reader.onload = () => {
          if (!cancelled) {
            setPreviewDataUrl(reader.result);
            setPreviewLoading(false);
          }
        };
        reader.onerror = () => {
          if (!cancelled) setPreviewLoading(false);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.id]);

  const doMove = async (fileId, folderId) => {
    await handleMoveFile(fileId, folderId);
    setMovingFileId(null);
    setMoveTargetFolderId("");
  };

  // ── Empty state ──
  if (unsortedFiles.length === 0) {
    return (
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "36px 28px",
          animation: "fadeIn 0.35s ease",
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
            Unsorted Files
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
            0 files not assigned to any folder
          </p>
        </div>
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "48px 20px",
            textAlign: "center",
            color: t.textDim,
          }}
        >
          <CheckIcon />
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}>
            All files are sorted
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            No unsorted files at the moment
          </div>
        </div>
      </div>
    );
  }

  const isPdf = selectedFile
    ? selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf")
    : false;
  const isImage = selectedFile?.type?.startsWith("image/");

  const colHeaderStyle = {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: t.textDim,
    padding: "8px 10px",
    whiteSpace: "nowrap",
    userSelect: "none",
    borderBottom: `1px solid ${t.border}`,
    position: "sticky",
    top: 0,
    background: darkMode ? "rgba(15,17,20,0.95)" : "rgba(246,244,240,0.95)",
    backdropFilter: "blur(6px)",
    zIndex: 2,
    cursor: "pointer",
    transition: "color 0.15s",
  };

  const SortArrow = ({ col }) => {
    if (sortCol !== col)
      return (
        <span style={{ opacity: 0.25, marginLeft: 3, fontSize: 9 }}>↕</span>
      );
    return (
      <span style={{ marginLeft: 3, fontSize: 9, color: t.accent }}>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // ── Move-to-folder dropdown (rendered under a row) ──
  const renderMoveControls = (file) => (
    <tr key={`move-${file.id}`}>
      <td
        colSpan={5}
        style={{ padding: "0 10px 8px", borderBottom: `1px solid ${t.border}` }}
      >
        <div style={{ position: "relative" }}>
          <div
            onClick={() => {
              setShowMoveSelect(!showMoveSelect);
              setMoveSelectSearch("");
            }}
            style={{
              border: `1px solid ${showMoveSelect ? t.accent : t.border}`,
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              background: darkMode
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.02)",
            }}
          >
            <FolderClosedIcon size={13} />
            <span
              style={{
                flex: 1,
                color: moveTargetFolderId ? t.text : t.textDim,
              }}
            >
              {moveTargetFolderId
                ? folders.find((f) => f.id === moveTargetFolderId)?.name ||
                  "Select..."
                : "Choose folder..."}
            </span>
            <ChevronDown />
          </div>
          {showMoveSelect &&
            (() => {
              const sq = moveSelectSearch.trim();
              const dff = sq
                ? folders
                    .map((f) => ({ ...f, ...fuzzyMatch(sq, f.name) }))
                    .filter((r) => r.match)
                    .sort((a, b) => b.score - a.score)
                : folders;
              return (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    boxShadow: "0 12px 36px rgba(0,0,0,0.2)",
                    overflow: "hidden",
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
                    <SearchIcon size={13} />
                    <input
                      ref={moveSelectRef}
                      value={moveSelectSearch}
                      onChange={(e) => setMoveSelectSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
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
                      maxHeight: 250,
                      overflowY: "auto",
                      padding: 4,
                    }}
                  >
                    {locations.map((loc) => {
                      const li = dff.filter((f) => f.locationId === loc.id);
                      if (!li.length) return null;
                      return (
                        <div key={loc.id}>
                          <div
                            style={{
                              padding: "5px 8px 2px",
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              textTransform: "uppercase",
                              color: t.textMuted,
                            }}
                          >
                            {loc.name}
                          </div>
                          {deptsInLocation(loc.id).map((dept) => {
                            const di = li.filter(
                              (f) => f.departmentId === dept.id
                            );
                            if (!di.length) return null;
                            return (
                              <div key={dept.id}>
<div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <SmallBtn
                            t={t}
                            title="Move to Folder"
                            onClick={() => {
                              setSelectedFileId(file.id);
                              setMovingFileId(file.id);
                              setMoveTargetFolderId("");
                              setShowMoveSelect(false);
                            }}
                          >
                            <FolderClosedIcon size={12} />
                          </SmallBtn>
                          {canDeleteFiles && (
                            <SmallBtn
                              t={t}
                              title="Delete"
                              onClick={() => {
                                setWarningModal({
                                  title: "Delete File",
                                  message: `Delete "${file.name}"? This cannot be undone.`,
                                  onConfirm: async () => {
                                    await removeFile(file.id);
                                    setUnsortedFiles((p) =>
                                      p.filter((f) => f.id !== file.id)
                                    );
                                    setWarningModal(null);
                                  },
                                });
                              }}
                            >
                              <TrashIcon size={11} />
                            </SmallBtn>
                          )}
                        </div>
                                {di.map((folder) => (
                                  <div
                                    key={folder.id}
                                    onClick={() => {
                                      setMoveTargetFolderId(folder.id);
                                      setShowMoveSelect(false);
                                      setMoveSelectSearch("");
                                    }}
                                    className="folder-select-item"
                                    style={{
                                      padding: "6px 10px 6px 24px",
                                      borderRadius: 6,
                                      cursor: "pointer",
                                      fontSize: 12,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      background:
                                        moveTargetFolderId === folder.id
                                          ? t.accentSoft
                                          : "transparent",
                                      color:
                                        moveTargetFolderId === folder.id
                                          ? t.accent
                                          : t.text,
                                      fontWeight: 500,
                                    }}
                                  >
                                    <FolderClosedIcon size={13} />
                                    <span style={{ flex: 1 }}>
                                      {folder.name}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          {moveTargetFolderId && (
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={() => doMove(file.id, moveTargetFolderId)}
              style={{ fontSize: 11, padding: "5px 12px", flex: 1 }}
            >
              <CheckIcon /> Move to Folder
            </Btn>
          )}
          <button
            onClick={() => {
              setMovingFileId(null);
              setMoveTargetFolderId("");
              setShowMoveSelect(false);
            }}
            style={{
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              cursor: "pointer",
              color: t.textDim,
              fontSize: 11,
              fontFamily: "inherit",
              padding: "5px 12px",
              flex: moveTargetFolderId ? undefined : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: "calc(100vh - 55px)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* ── Left panel: file table ── */}
      <div
        style={{
          width: 520,
          minWidth: 420,
          borderRight: `1px solid ${t.border}`,
          background: darkMode
            ? "rgba(15,17,20,0.5)"
            : "rgba(246,244,240,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            flexShrink: 0,
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
            Unsorted Files
          </h1>
          <p style={{ fontSize: 12, color: t.textMuted, margin: "4px 0 0" }}>
            {unsortedFiles.length} file
            {unsortedFiles.length !== 1 ? "s" : ""} not assigned to any folder
          </p>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{ ...colHeaderStyle, paddingLeft: 16, color: sortCol === "name" ? t.accent : t.textDim }}
                  onClick={() => toggleSort("name")}
                >
                  Name <SortArrow col="name" />
                </th>
                <th
                  style={{ ...colHeaderStyle, textAlign: "center" }}
                >
                  Type
                </th>
                <th
                  style={{ ...colHeaderStyle, color: sortCol === "size" ? t.accent : t.textDim }}
                  onClick={() => toggleSort("size")}
                >
                  Size <SortArrow col="size" />
                </th>
                <th
                  style={{ ...colHeaderStyle, color: sortCol === "uploadedAt" ? t.accent : t.textDim }}
                  onClick={() => toggleSort("uploadedAt")}
                >
                  Uploaded <SortArrow col="uploadedAt" />
                </th>
                <th
                  style={{ ...colHeaderStyle, color: sortCol === "uploadedBy" ? t.accent : t.textDim }}
                  onClick={() => toggleSort("uploadedBy")}
                >
                  By <SortArrow col="uploadedBy" />
                </th>
                <th style={{ ...colHeaderStyle, width: 60, textAlign: "center", cursor: "default" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedFiles.map((file, idx) => {
                const isSelected = selectedFileId === file.id;
                const isMoving = movingFileId === file.id;
                const rowBg = isSelected
                  ? darkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)"
                  : "transparent";

                return [
                  <tr
                    key={file.id}
                    onClick={() => {
                      setSelectedFileId(file.id);
                      if (movingFileId && movingFileId !== file.id) {
                        setMovingFileId(null);
                        setMoveTargetFolderId("");
                        setShowMoveSelect(false);
                      }
                    }}
                    style={{
                      cursor: "pointer",
                      background: rowBg,
                      borderLeft: isSelected
                        ? `3px solid ${t.accent}`
                        : "3px solid transparent",
                      transition: "background 0.15s",
                      animation: `fadeIn 0.25s ease ${idx * 0.02}s both`,
                    }}
                  >
                    <td
                      style={{
                        padding: "8px 10px 8px 13px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        maxWidth: 200,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {(() => {
                          const typeInfo = getFileTypeInfo(file);
                          const FileTypeIcon = typeInfo.icon;
                          const isImage = typeInfo.type === "image";
                          return (
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                background: isSelected
                                  ? t.accent + "18"
                                  : isImage
                                    ? "rgba(234,179,8,0.15)"
                                    : t.accentSoft,
                                color: isSelected
                                  ? t.accent
                                  : isImage
                                    ? "#eab308"
                                    : t.textDim,
                              }}
                            >
                              <FileTypeIcon size={14} />
                            </div>
                          );
                        })()}
                        <span
                          style={{
                            fontWeight: isSelected ? 600 : 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            color: isSelected ? t.text : t.textMuted,
                          }}
                        >
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        textAlign: "center",
                      }}
                    >
                      <span style={{
                        fontSize: 11,
                        color: getFileTypeInfo(file).type === "image"
                          ? "#eab308"
                          : t.textDim,
                        fontWeight: 500,
                      }}>
                        {getFileTypeInfo(file).label}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        color: t.textDim,
                        whiteSpace: "nowrap",
                        fontSize: 11,
                      }}
                    >
                      {fmtSize(file.size)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        color: t.textDim,
                        whiteSpace: "nowrap",
                        fontSize: 11,
                      }}
                    >
                      {fmtDate(file.uploadedAt)}
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        color: t.textDim,
                        whiteSpace: "nowrap",
                        fontSize: 11,
                        maxWidth: 100,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {file.uploadedBy || "—"}
                    </td>
                    <td
                      style={{
                        padding: "8px 6px",
                        borderBottom: isMoving
                          ? "none"
                          : `1px solid ${t.border}`,
                        textAlign: "center",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isMoving && (
                        <div
                          style={{
                            display: "flex",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <SmallBtn
                            t={t}
                            title="Move to Folder"
                            onClick={() => {
                              setSelectedFileId(file.id);
                              setMovingFileId(file.id);
                              setMoveTargetFolderId("");
                              setShowMoveSelect(false);
                            }}
                          >
                            <FolderClosedIcon size={12} />
                          </SmallBtn>
                          <SmallBtn
                            t={t}
                            title="Delete"
                            onClick={() => {
                              setWarningModal({
                                title: "Delete File",
                                message: `Delete "${file.name}"? This cannot be undone.`,
                                onConfirm: async () => {
                                  await removeFile(file.id);
                                  setUnsortedFiles((p) =>
                                    p.filter((f) => f.id !== file.id)
                                  );
                                  setWarningModal(null);
                                },
                              });
                            }}
                          >
                            <TrashIcon size={11} />
                          </SmallBtn>
                        </div>
                      )}
                    </td>
                  </tr>,
                  isMoving ? renderMoveControls(file) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right panel: preview ── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {selectedFile ? (
          <>
            <div
              style={{
                padding: "12px 20px",
                borderBottom: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <FileDocIcon size={16} />
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Document Preview
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: t.textDim,
                  whiteSpace: "nowrap",
                  marginLeft: 12,
                  flexShrink: 0,
                }}
              >
                {selectedFile.name}
              </span>
            </div>

            <div
              style={{
                flex: 1,
                background: darkMode ? "#0a0c0f" : "#e8e5e0",
                overflow: "hidden",
              }}
            >
              {previewLoading ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: t.textDim,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      border: `3px solid ${t.border}`,
                      borderTopColor: t.accent,
                      borderRadius: "50%",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginTop: 14,
                    }}
                  >
                    Loading preview…
                  </div>
                  <style>
                    {`@keyframes spin { to { transform: rotate(360deg) } }`}
                  </style>
                </div>
              ) : previewDataUrl && isPdf ? (
                <PdfCanvasPreview
                  dataUrl={previewDataUrl}
                  darkMode={darkMode}
                />
              ) : previewDataUrl && isImage ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                    overflow: "auto",
                  }}
                >
                  <img
                    src={previewDataUrl}
                    alt={selectedFile.name}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: 4,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    color: t.textDim,
                    padding: 40,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                  }}
                >
                  <FileDocIcon size={48} />
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      marginTop: 14,
                    }}
                  >
                    {isPdf || isImage
                      ? "Preview not available"
                      : "No preview for this file type"}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: t.textDim,
                    }}
                  >
                    {selectedFile.type || "Unknown type"}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: t.textDim,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <FileDocIcon size={48} />
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>
                Select a file to preview
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
