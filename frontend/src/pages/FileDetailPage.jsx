import { fmtSize, copyText } from "../utils/helpers";
import { Btn } from "../components/ui/Btn";
import {
  FileDocIcon,
  ArrowLeftIcon,
  EditIcon,
  CopyIcon,
  TrashIcon,
  MapPinIcon,
  LayersIcon,
} from "../components/Icons";
import PdfCanvasPreview from "../components/PdfCanvasPreview";
import * as api from "../api";

export default function FileDetailPage({
  viewingFileId,
  files,
  folders,
  locations,
  departments,
  getBreadcrumb,
  setViewingFileId,
  setActiveFolderId,
  setPage,
  setRenamingFileId,
  setRenamingFileName,
  removeFile,
  t,
  darkMode,
}) {
  const vf = files.find((f) => f.id === viewingFileId);
  if (!vf) return null;

  const folder = folders.find((f) => f.id === vf.folderId);
  const loc = folder
    ? locations.find((l) => l.id === folder.locationId)
    : null;
  const dept = folder
    ? departments.find((d) => d.id === folder.departmentId)
    : null;
  const breadcrumb = folder ? getBreadcrumb(folder.id) : [];
  const isPdf =
    vf.type === "application/pdf" ||
    vf.name.toLowerCase().endsWith(".pdf");
  const isImage = vf.type?.startsWith("image/");

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: "calc(100vh - 55px)",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Left panel - file info */}
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
        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
          <button
            onClick={() => {
              setViewingFileId(null);
              if (folder) {
                setActiveFolderId(folder.id);
                setPage("folder-detail");
              } else setPage("folders");
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.accent,
              fontSize: 12.5,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              fontFamily: "inherit",
              marginBottom: 16,
            }}
          >
            <ArrowLeftIcon /> Back to {folder?.name || "Folder"}
          </button>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: t.successSoft,
                color: t.success,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FileDocIcon size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: "0 0 2px",
                  wordBreak: "break-word",
                  lineHeight: 1.3,
                }}
              >
                {vf.name}
              </h2>
              <button
                onClick={() => {
                  setRenamingFileId(vf.id);
                  setRenamingFileName(vf.name);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.accent,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: 0,
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <EditIcon /> Rename
              </button>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px 16px",
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textDim,
                  marginBottom: 2,
                }}
              >
                Size
              </div>
              <div style={{ fontWeight: 500 }}>{fmtSize(vf.size)}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textDim,
                  marginBottom: 2,
                }}
              >
                Pages
              </div>
              <div style={{ fontWeight: 500 }}>{vf.pages}</div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textDim,
                  marginBottom: 2,
                }}
              >
                Type
              </div>
              <div style={{ fontWeight: 500 }}>
                {isPdf ? "PDF" : vf.type || "Unknown"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: t.textDim,
                  marginBottom: 2,
                }}
              >
                Status
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "1px 8px",
                  borderRadius: 8,
                  background: t.successSoft,
                  color: t.success,
                }}
              >
                {vf.status === "done" ? "Extracted" : vf.status}
              </span>
            </div>
            {loc && (
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: t.textDim,
                    marginBottom: 2,
                  }}
                >
                  Location
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <MapPinIcon size={11} /> {loc.name}
                </div>
              </div>
            )}
            {dept && (
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: t.textDim,
                    marginBottom: 2,
                  }}
                >
                  Department
                </div>
                <div
                  style={{
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <LayersIcon size={11} /> {dept.name}
                </div>
              </div>
            )}
          </div>
          {breadcrumb.length > 0 && (
            <div
              style={{ fontSize: 11, color: t.textDim, marginBottom: 12 }}
            >
              <span
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Path
              </span>
              {breadcrumb.map((b) => b.name).join(" / ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={() => copyText(vf.text)}
              style={{ fontSize: 11.5, padding: "6px 12px" }}
            >
              <CopyIcon /> Copy Text
            </Btn>
            <button
              onClick={() => removeFile(vf.id)}
              style={{
                background: t.errorSoft,
                color: t.error,
                border: "none",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <TrashIcon size={12} /> Delete
            </button>
          </div>
          <div
            style={{ borderBottom: `1px solid ${t.border}`, marginBottom: 0 }}
          />
        </div>
        {/* Extracted text */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: t.textDim,
              }}
            >
              Extracted Text
            </span>
            <span style={{ fontSize: 10, color: t.textDim }}>
              {(vf.text || "").length.toLocaleString()} chars
            </span>
          </div>
          <pre
            style={{
              flex: 1,
              padding: "0 20px 20px",
              margin: 0,
              fontSize: 11,
              lineHeight: 1.75,
              color: t.textMuted,
              fontFamily: "'IBM Plex Mono', monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowY: "auto",
            }}
          >
            {vf.text || "(No extractable text found)"}
          </pre>
        </div>
      </div>
      {/* Right panel - preview */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
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
            }}
          >
            <FileDocIcon size={16} /> Document Preview
          </div>
          <span style={{ fontSize: 11, color: t.textDim }}>{vf.name}</span>
        </div>
        <div
          style={{
            flex: 1,
            background: darkMode ? "#0a0c0f" : "#e8e5e0",
            overflow: "hidden",
          }}
        >
          {(() => {
            const previewUrl = vf.fileStoragePath
              ? api.getFilePreviewUrl(vf.fileStoragePath)
              : vf.fileDataUrl;
            if (previewUrl) {
              if (isPdf) {
                if (vf.fileDataUrl)
                  return (
                    <PdfCanvasPreview
                      dataUrl={vf.fileDataUrl}
                      darkMode={darkMode}
                    />
                  );
                return (
                  <iframe
                    src={previewUrl}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    title="PDF Preview"
                  />
                );
              }
              if (isImage)
                return (
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
                      src={previewUrl}
                      alt={vf.name}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                );
              return (
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
                    No preview available for this file type
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, color: t.textDim }}>
                    {vf.type || "Unknown type"}
                  </div>
                </div>
              );
            }
            return (
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
                  Preview not available
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  File data is no longer in memory
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
