import { useState, useRef, useEffect } from "react";
import { fmtSize, fuzzyMatch } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import {
  FileDocIcon,
  FolderClosedIcon,
  CheckIcon,
  TrashIcon,
  SearchIcon,
  ChevronDown,
} from "../components/Icons";
import PdfCanvasPreview from "../components/PdfCanvasPreview";
import * as api from "../api";

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
  t,
  darkMode,
}) {
  const [movingFileId, setMovingFileId] = useState(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [showMoveSelect, setShowMoveSelect] = useState(false);
  const [moveSelectSearch, setMoveSelectSearch] = useState("");
  const moveSelectRef = useRef(null);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedFile = unsortedFiles.find((f) => f.id === selectedFileId);

  // Auto-select first file when list changes
  useEffect(() => {
    if (
      unsortedFiles.length > 0 &&
      !unsortedFiles.find((f) => f.id === selectedFileId)
    ) {
      setSelectedFileId(unsortedFiles[0].id);
    } else if (unsortedFiles.length === 0) {
      setSelectedFileId(null);
    }
  }, [unsortedFiles, selectedFileId]);

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

  // Empty state
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

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: "calc(100vh - 55px)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* ── Left panel: file list ── */}
      <div
        style={{
          width: 400,
          minWidth: 400,
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
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {unsortedFiles.map((file, idx) => {
            const isSelected = selectedFileId === file.id;
            const isMoving = movingFileId === file.id;
            return (
              <div
                key={file.id}
                style={{ animation: `fadeIn 0.25s ease ${idx * 0.03}s both` }}
              >
                <div
                  onClick={() => {
                    setSelectedFileId(file.id);
                    if (movingFileId && movingFileId !== file.id) {
                      setMovingFileId(null);
                      setMoveTargetFolderId("");
                      setShowMoveSelect(false);
                    }
                  }}
                  style={{
                    background: isSelected
                      ? darkMode
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.04)"
                      : "transparent",
                    border: `1px solid ${isSelected ? t.accent + "44" : "transparent"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background: isSelected ? t.accent + "18" : t.accentSoft,
                        color: isSelected ? t.accent : t.textDim,
                      }}
                    >
                      <FileDocIcon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? 600 : 500,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: isSelected ? t.text : t.textMuted,
                        }}
                      >
                        {file.name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: t.textDim,
                          display: "flex",
                          gap: 8,
                          marginTop: 1,
                        }}
                      >
                        <span>{fmtSize(file.size)}</span>
                        {file.pages > 0 && <span>{file.pages} pg</span>}
                      </div>
                    </div>
                    {!isMoving && (
                      <div
                        style={{
                          display: "flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                  </div>
                  {/* Move-to-folder inline controls */}
                  {isMoving && (
                    <div
                      style={{ marginTop: 8 }}
                      onClick={(e) => e.stopPropagation()}
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
                              ? folders.find(
                                  (f) => f.id === moveTargetFolderId
                                )?.name || "Select..."
                              : "Choose folder..."}
                          </span>
                          <ChevronDown />
                        </div>
                        {showMoveSelect &&
                          (() => {
                            const sq = moveSelectSearch.trim();
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
                                  boxShadow:
                                    "0 12px 36px rgba(0,0,0,0.2)",
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
                                    onChange={(e) =>
                                      setMoveSelectSearch(e.target.value)
                                    }
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
                                    const li = dff.filter(
                                      (f) => f.locationId === loc.id
                                    );
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
                                        {deptsInLocation(loc.id).map(
                                          (dept) => {
                                            const di = li.filter(
                                              (f) =>
                                                f.departmentId === dept.id
                                            );
                                            if (!di.length) return null;
                                            return (
                                              <div key={dept.id}>
                                                <div
                                                  style={{
                                                    padding:
                                                      "3px 8px 2px 16px",
                                                    fontSize: 9,
                                                    fontWeight: 600,
                                                    color: t.textDim,
                                                  }}
                                                >
                                                  {dept.name}
                                                </div>
                                                {di.map((folder) => (
                                                  <div
                                                    key={folder.id}
                                                    onClick={() => {
                                                      setMoveTargetFolderId(
                                                        folder.id
                                                      );
                                                      setShowMoveSelect(
                                                        false
                                                      );
                                                      setMoveSelectSearch(
                                                        ""
                                                      );
                                                    }}
                                                    className="folder-select-item"
                                                    style={{
                                                      padding:
                                                        "6px 10px 6px 24px",
                                                      borderRadius: 6,
                                                      cursor: "pointer",
                                                      fontSize: 12,
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 8,
                                                      background:
                                                        moveTargetFolderId ===
                                                        folder.id
                                                          ? t.accentSoft
                                                          : "transparent",
                                                      color:
                                                        moveTargetFolderId ===
                                                        folder.id
                                                          ? t.accent
                                                          : t.text,
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    <FolderClosedIcon
                                                      size={13}
                                                    />
                                                    <span
                                                      style={{ flex: 1 }}
                                                    >
                                                      {folder.name}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            );
                                          }
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                      {moveTargetFolderId && (
                        <Btn
                          primary
                          darkMode={darkMode}
                          t={t}
                          onClick={() =>
                            doMove(file.id, moveTargetFolderId)
                          }
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            padding: "5px 12px",
                            width: "100%",
                          }}
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
                          marginTop: 4,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: t.textDim,
                          fontSize: 10.5,
                          fontFamily: "inherit",
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexShrink: 0,
                  marginLeft: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: t.textDim,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtSize(selectedFile.size)}
                  {selectedFile.pages > 0 &&
                    ` · ${selectedFile.pages} page${selectedFile.pages !== 1 ? "s" : ""}`}
                </span>
              </div>
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
              <div
                style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}
              >
                Select a file to preview
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
