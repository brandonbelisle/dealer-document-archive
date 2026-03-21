import { useRef, useEffect } from "react";
import { fmtSize } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import {
  FolderClosedIcon,
  FolderOpenIcon,
  FileDocIcon,
  UploadCloudIcon,
  PlusIcon,
  XIcon,
  EditIcon,
  CopyIcon,
  TrashIcon,
  ChevronRightIcon,
} from "../components/Icons";

export default function FolderDetailPage({
  activeFolder,
  activeFolderId,
  filesInFolder,
  subfoldersOf,
  allFilesInFolderRecursive,
  getBreadcrumb,
  locations,
  departments,
  folders,
  setActiveFolderId,
  setPage,
  setSelectedFile,
  setViewingFileId,
  setRenamingFileId,
  setRenamingFileName,
  copyText,
  removeFile,
  handleDeleteFolder,
  creatingSubfolder,
  setCreatingSubfolder,
  newSubfolderName,
  setNewSubfolderName,
  createSubfolder,
  folderDetailDragOver,
  setFolderDetailDragOver,
  handleFolderDetailDrop,
  handleFolderDetailFiles,
  t,
  darkMode,
}) {
  const newSubfolderRef = useRef(null);
  const folderDetailInputRef = useRef(null);

  useEffect(() => {
    if (creatingSubfolder && newSubfolderRef.current)
      newSubfolderRef.current.focus();
  }, [creatingSubfolder]);

  if (!activeFolder) return null;

  const ff = filesInFolder(activeFolderId);
  const fd = departments.find((d) => d.id === activeFolder.departmentId);
  const fl = locations.find((l) => l.id === activeFolder.locationId);
  const subs = subfoldersOf(activeFolderId);
  const breadcrumb = getBreadcrumb(activeFolderId);
  const ddOver = folderDetailDragOver;

  return (
    <div
      onDrop={handleFolderDetailDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setFolderDetailDragOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget))
          setFolderDetailDragOver(false);
      }}
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.3s ease",
        position: "relative",
        minHeight: "calc(100vh - 55px)",
      }}
    >
      {ddOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            borderRadius: 14,
            border: `2px dashed ${t.accent}`,
            background: t.dropzoneActive,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ color: t.accent, marginBottom: 10 }}>
              <UploadCloudIcon size={48} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: t.text }}>
              Drop files into "{activeFolder.name}"
            </div>
            <div
              style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}
            >
              Files will be added to this folder automatically
            </div>
          </div>
        </div>
      )}
      <input
        ref={folderDetailInputRef}
        type="file"
        accept=".pdf"
        multiple
        onChange={(e) => {
          handleFolderDetailFiles(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      {/* Breadcrumb */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => {
            setPage("folders");
            setSelectedFile(null);
            setCreatingSubfolder(false);
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
            gap: 4,
            padding: 0,
            fontFamily: "inherit",
          }}
        >
          {fl?.name} — {fd?.name}
        </button>
        {breadcrumb.map((crumb, i) => (
          <span
            key={crumb.id}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span style={{ color: t.textDim, fontSize: 11 }}>/</span>
            {i === breadcrumb.length - 1 ? (
              <span
                style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}
              >
                {crumb.name}
              </span>
            ) : (
              <button
                onClick={() => {
                  setActiveFolderId(crumb.id);
                  setCreatingSubfolder(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.accent,
                  fontSize: 12.5,
                  fontWeight: 500,
                  padding: 0,
                  fontFamily: "inherit",
                }}
              >
                {crumb.name}
              </button>
            )}
          </span>
        ))}
      </div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: t.accent }}>
            <FolderOpenIcon size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              {activeFolder.name}
            </h1>
            <p
              style={{
                fontSize: 12.5,
                color: t.textMuted,
                margin: "2px 0 0",
              }}
            >
              {subs.length > 0 &&
                `${subs.length} subfolder${subs.length !== 1 ? "s" : ""} · `}
              {ff.length} file{ff.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {!creatingSubfolder && (
            <Btn
              darkMode={darkMode}
              t={t}
              onClick={() => {
                setCreatingSubfolder(true);
                setNewSubfolderName("");
              }}
              style={{ fontSize: 12 }}
            >
              <FolderClosedIcon size={14} /> New Subfolder
            </Btn>
          )}
          <Btn
            primary
            darkMode={darkMode}
            t={t}
            onClick={() => folderDetailInputRef.current?.click()}
            style={{ fontSize: 12 }}
          >
            <UploadCloudIcon size={15} /> Add Files
          </Btn>
        </div>
      </div>
      {/* Create subfolder inline */}
      {creatingSubfolder && (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.accent}`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: `0 0 0 3px ${t.accentSoft}`,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ color: t.accent }}>
            <FolderClosedIcon size={18} />
          </div>
          <input
            ref={newSubfolderRef}
            value={newSubfolderName}
            onChange={(e) => setNewSubfolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createSubfolder();
              if (e.key === "Escape") {
                setCreatingSubfolder(false);
                setNewSubfolderName("");
              }
            }}
            placeholder="Subfolder name..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              fontSize: 13.5,
              color: t.text,
              outline: "none",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          />
          <Btn
            primary
            darkMode={darkMode}
            t={t}
            onClick={createSubfolder}
            style={{ padding: "5px 12px", fontSize: 11.5 }}
          >
            Create
          </Btn>
          <button
            onClick={() => {
              setCreatingSubfolder(false);
              setNewSubfolderName("");
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.textDim,
              display: "flex",
              padding: 3,
            }}
          >
            <XIcon size={14} />
          </button>
        </div>
      )}
      {/* Subfolders */}
      {subs.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: t.textDim,
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Subfolders
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {subs.map((sub, idx) => {
              const sc = allFilesInFolderRecursive(sub.id);
              const subSubs = subfoldersOf(sub.id).length;
              return (
                <div
                  key={sub.id}
                  className="folder-row"
                  onClick={() => {
                    setActiveFolderId(sub.id);
                    setCreatingSubfolder(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 10,
                    padding: "11px 16px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    animation: `fadeIn 0.25s ease ${idx * 0.03}s both`,
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ color: t.accent, opacity: 0.7 }}>
                      <FolderClosedIcon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {sub.name}
                      </div>
                      {subSubs > 0 && (
                        <div style={{ fontSize: 10, color: t.textDim }}>
                          {subSubs} subfolder{subSubs !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: sc > 0 ? t.accent : t.textDim,
                      background: sc > 0 ? t.accentSoft : "transparent",
                      padding: "2px 8px",
                      borderRadius: 10,
                    }}
                  >
                    {sc} file{sc !== 1 ? "s" : ""}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginLeft: 6,
                    }}
                  >
                    <SmallBtn
                      t={t}
                      title="Delete subfolder"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFolder(sub);
                      }}
                    >
                      <TrashIcon size={12} />
                    </SmallBtn>
                  </div>
                  <div
                    style={{
                      width: 24,
                      display: "flex",
                      justifyContent: "flex-end",
                      color: t.textDim,
                      marginLeft: 4,
                    }}
                  >
                    <ChevronRightIcon />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Drop zone */}
      <div
        onClick={() => folderDetailInputRef.current?.click()}
        style={{
          border: `1px dashed ${t.border}`,
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          background: t.dropzone,
        }}
      >
        <div style={{ color: t.textDim }}>
          <UploadCloudIcon size={24} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>
            Drag & drop files here or click to browse
          </div>
          <div style={{ fontSize: 11, color: t.textDim }}>
            PDFs added directly to this folder
          </div>
        </div>
      </div>
      {/* Files table */}
      {ff.length > 0 ? (
        <div>
          <div
            style={{
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
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
              <div style={{ flex: 1, minWidth: 0 }}>Name</div>
              <div
                style={{ width: 70, textAlign: "right", flexShrink: 0 }}
              >
                Size
              </div>
              <div
                style={{ width: 50, textAlign: "right", flexShrink: 0 }}
              >
                Pages
              </div>
              <div
                style={{ width: 140, textAlign: "right", flexShrink: 0 }}
              >
                Uploaded
              </div>
              <div
                style={{ width: 100, textAlign: "right", flexShrink: 0 }}
              >
                By
              </div>
              <div style={{ width: 80, flexShrink: 0 }}></div>
            </div>
            {ff.map((file, idx) => {
              const uploadDate = file.uploadedAt
                ? new Date(file.uploadedAt)
                : null;
              const dateStr = uploadDate
                ? uploadDate.toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "";
              const timeStr = uploadDate
                ? uploadDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              return (
                <div
                  key={file.id}
                  onClick={() => {
                    if (file.status === "done") {
                      setViewingFileId(file.id);
                      setPage("file-detail");
                    }
                  }}
                  className="folder-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 16px",
                    cursor:
                      file.status === "done" ? "pointer" : "default",
                    borderBottom:
                      idx < ff.length - 1
                        ? `1px solid ${t.border}`
                        : "none",
                    animation: `fadeIn 0.2s ease ${idx * 0.03}s both`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {file.status === "processing" && (
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
                          width: `${file.progress}%`,
                          background: `linear-gradient(90deg,${t.accent},${t.accentDark})`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                  )}
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        background:
                          file.status === "error"
                            ? t.errorSoft
                            : file.status === "done"
                              ? t.successSoft
                              : t.accentSoft,
                        color:
                          file.status === "error"
                            ? t.error
                            : file.status === "done"
                              ? t.success
                              : t.accent,
                      }}
                    >
                      <FileDocIcon size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {file.name}
                      </div>
                      {file.status === "processing" && (
                        <div style={{ fontSize: 10, color: t.accent }}>
                          Processing {file.progress}%
                        </div>
                      )}
                      {file.status === "error" && (
                        <div style={{ fontSize: 10, color: t.error }}>
                          {file.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 70,
                      textAlign: "right",
                      fontSize: 11.5,
                      color: t.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {fmtSize(file.size)}
                  </div>
                  <div
                    style={{
                      width: 50,
                      textAlign: "right",
                      fontSize: 11.5,
                      color: t.textMuted,
                      flexShrink: 0,
                    }}
                  >
                    {file.pages || "—"}
                  </div>
                  <div
                    style={{
                      width: 140,
                      textAlign: "right",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ fontSize: 11, color: t.textMuted }}>
                      {dateStr}
                    </div>
                    <div style={{ fontSize: 10, color: t.textDim }}>
                      {timeStr}
                    </div>
                  </div>
                  <div
                    style={{
                      width: 100,
                      textAlign: "right",
                      fontSize: 11,
                      color: t.textMuted,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={file.uploadedBy || ""}
                  >
                    {file.uploadedBy || "—"}
                  </div>
                  <div
                    style={{
                      width: 80,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 2,
                      flexShrink: 0,
                    }}
                  >
                    {file.status === "done" && (
                      <SmallBtn
                        t={t}
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFileId(file.id);
                          setRenamingFileName(file.name);
                        }}
                      >
                        <EditIcon />
                      </SmallBtn>
                    )}
                    {file.status === "done" && (
                      <SmallBtn
                        t={t}
                        title="Copy text"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyText(file.text);
                        }}
                      >
                        <CopyIcon />
                      </SmallBtn>
                    )}
                    <SmallBtn
                      t={t}
                      title="Remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <TrashIcon size={12} />
                    </SmallBtn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        subs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: t.textDim,
            }}
          >
            <FileDocIcon size={40} />
            <div style={{ fontSize: 14, fontWeight: 500, marginTop: 14 }}>
              No files yet
            </div>
            <div style={{ fontSize: 12.5, marginTop: 4 }}>
              Drag files onto this page or click "Add Files"
            </div>
          </div>
        )
      )}
    </div>
  );
}
