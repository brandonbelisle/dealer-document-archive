import { useState, useRef, useEffect } from "react";
import { fuzzyMatch } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import HighlightedName from "../components/HighlightedName";
import SubscribeButton from "../components/SubscribeButton";
import {
  FolderClosedIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  ChevronRightIcon,
  TrashIcon,
  ChevronDown,
  UploadCloudIcon,
} from "../components/Icons";

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

export default function FoldersPage({
  currentLocation,
  currentDept,
  currentDeptFolders,
  folderSearch,
  setFolderSearch,
  creatingDeptFolder,
  setCreatingDeptFolder,
  newDeptFolderName,
  setNewDeptFolderName,
  createDeptFolder,
  setActiveFolderId,
  setPage,
  setCreatingSubfolder,
  handleDeleteFolder,
  subscriptions,
  setSubscriptions,
  loggedInUser,
  t,
  darkMode,
  handleDeptDrop,
  deptDragOver,
  setDeptDragOver,
  handleDeptFiles,
}) {
  const canDeleteFolders = loggedInUser?.permissions?.includes("deleteFolders");
  const canUploadFiles = loggedInUser?.permissions?.includes("uploadFiles");
  const newDeptFolderRef = useRef(null);
  const deptFileInputRef = useRef(null);
  const [sortCol] = useState("createdAt");
  const [sortDir] = useState("desc");
  const [pageSize] = useState(25);
  const [currentPage] = useState(1);
  const [showPageSizeDropdown] = useState(false);
  const [dateFilterType] = useState("all");
  const [filterYear] = useState("");
  const [filterMonth] = useState("");
  const [filterDay] = useState("");
  const [showDateFilterDropdown] = useState(false);

  const handleSubscribe = (newSub) => {
    setSubscriptions((prev) => [...prev, newSub]);
  };

  const handleUnsubscribe = (subId) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
  };

  useEffect(() => {
    if (creatingDeptFolder && newDeptFolderRef.current)
      newDeptFolderRef.current.focus();
  }, [creatingDeptFolder]);

  const q = folderSearch.trim();
  const df = currentDeptFolders.filter((f) => !f.parentId);
  const filtered = q
    ? df
        .map((f) => ({ folder: f, ...fuzzyMatch(q, f.name) }))
        .filter((r) => r.match)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.folder)
    : df;

  const withCounts = filtered.map((folder) => ({
    ...folder,
    _fileCount: folder.fileCount || 0,
    _subCount: folder.subfolderCount || 0,
  }));

  const sorted = [...withCounts].sort((a, b) => {
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const totalFiles = df.reduce(
    (s, f) => s + (f.fileCount || 0),
    0
  );

  const colHeaderStyle = {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "10px 14px",
    whiteSpace: "nowrap",
    userSelect: "none",
    borderBottom: `1px solid ${t.border}`,
    cursor: "pointer",
    transition: "color 0.15s",
    textAlign: "left",
  };

  return (
    <div
      onDrop={handleDeptDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setDeptDragOver?.(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget))
          setDeptDragOver?.(false);
      }}
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.35s ease",
        position: "relative",
        minHeight: "calc(100vh - 55px)",
      }}
    >
      {deptDragOver && canUploadFiles && (
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
              Drop files here for Unsorted
            </div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
              Files will be added to Unsorted in this department
            </div>
          </div>
        </div>
      )}
      <input
        ref={deptFileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg,image/*"
        multiple
        onChange={(e) => {
          handleDeptFiles?.(e.target.files);
          e.target.value = "";
        }}
        style={{ display: "none" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
            <span
              onClick={() => setPage("folders-browse")}
              style={{ cursor: "pointer", color: t.textMuted, transition: "color 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.color = t.accent}
              onMouseLeave={(e) => e.currentTarget.style.color = t.textMuted}
            >
              {currentLocation?.name}
            </span>
            <span style={{ color: t.textDim, margin: "0 8px" }}>/</span>
            <span>{currentDept?.name}</span>
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
            {df.length} folder{df.length !== 1 ? "s" : ""} · {totalFiles} file{totalFiles !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {currentDept && (
            <SubscribeButton
              type="department"
              itemId={currentDept.id}
              subscriptions={subscriptions || []}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
              t={t}
            />
          )}
          {!creatingDeptFolder && (
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={() => {
                setCreatingDeptFolder(true);
                setNewDeptFolderName("");
              }}
              style={{ fontSize: 12 }}
            >
              <PlusIcon size={13} /> New Folder
            </Btn>
          )}
        </div>
      </div>

      {creatingDeptFolder && (
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
            ref={newDeptFolderRef}
            value={newDeptFolderName}
            onChange={(e) => setNewDeptFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createDeptFolder();
              if (e.key === "Escape") {
                setCreatingDeptFolder(false);
                setNewDeptFolderName("");
              }
            }}
            placeholder="Folder name..."
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
            onClick={createDeptFolder}
            style={{ padding: "5px 12px", fontSize: 11.5 }}
          >
            Create
          </Btn>
          <button
            onClick={() => {
              setCreatingDeptFolder(false);
              setNewDeptFolderName("");
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

      {canUploadFiles && (
        <div
          onClick={() => deptFileInputRef.current?.click()}
          style={{
            border: `2px dashed ${t.border}`,
            borderRadius: 14,
            padding: "24px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: t.dropzone,
            marginBottom: 16,
            transition: "all 0.2s",
          }}
        >
          <div style={{ color: t.textDim, marginBottom: 8 }}>
            <UploadCloudIcon size={28} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text, marginBottom: 4 }}>
            Drag & drop files here or click to browse
          </div>
          <div style={{ fontSize: 11, color: t.textMuted }}>
            Files will be added to Unsorted in this department
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 16,
        }}
      >
        <SearchIcon size={16} />
        <input
          value={folderSearch}
          onChange={(e) => setFolderSearch(e.target.value)}
          placeholder="Search folders..."
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            fontSize: 13.5,
            color: t.text,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {folderSearch && (
          <button
            onClick={() => setFolderSearch("")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.textDim,
              display: "flex",
              padding: 2,
            }}
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      {sorted.length > 0 ? (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...colHeaderStyle,
                    color: t.textDim,
                  }}
                >
                  Name
                </th>
                <th
                  style={{
                    ...colHeaderStyle,
                    color: t.textDim,
                    width: 90,
                    textAlign: "center",
                  }}
                >
                  Files
                </th>
                <th
                  style={{
                    ...colHeaderStyle,
                    color: t.textDim,
                    width: 180,
                  }}
                >
                  Created
                </th>
                <th
                  style={{
                    ...colHeaderStyle,
                    width: 60,
                    cursor: "default",
                    textAlign: "center",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((folder, idx) => (
                <tr
                  key={folder.id}
                  className="folder-row"
                  onClick={() => {
                    setActiveFolderId(folder.id);
                    setPage("folder-detail");
                    setCreatingSubfolder(false);
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "background 0.15s",
                    animation: `fadeIn 0.25s ease ${idx * 0.03}s both`,
                  }}
                >
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom:
                        idx < sorted.length - 1
                          ? `1px solid ${t.border}`
                          : "none",
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
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          background: t.accentSoft,
                          color: t.accent,
                          opacity: 0.75,
                        }}
                      >
                        <FolderClosedIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          <HighlightedName
                            name={folder.name}
                            query={folderSearch.trim()}
                            accentColor={t.accent}
                          />
                        </div>
                        {folder._subCount > 0 && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: t.textDim,
                              marginTop: 1,
                            }}
                          >
                            {folder._subCount} subfolder
                            {folder._subCount !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom:
                        idx < sorted.length - 1
                          ? `1px solid ${t.border}`
                          : "none",
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color:
                          folder._fileCount > 0
                            ? t.accent
                            : t.textDim,
                        background:
                          folder._fileCount > 0
                            ? t.accentSoft
                            : "transparent",
                        padding: "2px 9px",
                        borderRadius: 12,
                      }}
                    >
                      {folder._fileCount}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      borderBottom:
                        idx < sorted.length - 1
                          ? `1px solid ${t.border}`
                          : "none",
                      fontSize: 11.5,
                      color: t.textMuted,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmtDate(folder.createdAt)}
                  </td>
                  <td
                    style={{
                      padding: "12px 8px",
                      borderBottom:
                        idx < sorted.length - 1
                          ? `1px solid ${t.border}`
                          : "none",
                      textAlign: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canDeleteFolders && (
                      <SmallBtn
                        t={t}
                        title="Delete folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                      >
                        <TrashIcon size={12} />
                      </SmallBtn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !creatingDeptFolder && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: t.textDim,
            }}
          >
            <FolderClosedIcon size={48} />
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              {q ? `No match for "${q}"` : "No folders yet"}
            </div>
            {!q && (
              <div style={{ fontSize: 13, marginBottom: 16 }}>
                Create a folder to start organizing files
              </div>
            )}
            {!q && (
              <Btn
                primary
                darkMode={darkMode}
                t={t}
                onClick={() => {
                  setCreatingDeptFolder(true);
                  setNewDeptFolderName("");
                }}
              >
                <PlusIcon size={13} /> New Folder
              </Btn>
            )}
          </div>
        )
      )}
    </div>
  );
}