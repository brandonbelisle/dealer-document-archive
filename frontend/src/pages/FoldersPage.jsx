import { useState, useRef, useEffect } from "react";
import { fuzzyMatch } from "../utils/helpers";
import { Btn } from "../components/ui/Btn";
import { SmallBtn } from "../components/ui/Btn";
import HighlightedName from "../components/HighlightedName";
import {
  FolderClosedIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  ChevronRightIcon,
  TrashIcon,
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
  t,
  darkMode,
}) {
  const newDeptFolderRef = useRef(null);
  const [sortCol, setSortCol] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (creatingDeptFolder && newDeptFolderRef.current)
      newDeptFolderRef.current.focus();
  }, [creatingDeptFolder]);

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const q = folderSearch.trim();
  const df = currentDeptFolders.filter((f) => !f.parentId);
  const filtered = q
    ? df
        .map((f) => ({ folder: f, ...fuzzyMatch(q, f.name) }))
        .filter((r) => r.match)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.folder)
    : df;

  // Build sortable list with counts from API
  const withCounts = filtered.map((folder) => ({
    ...folder,
    _fileCount: folder.fileCount || 0,
    _subCount: folder.subfolderCount || 0,
  }));

  const sorted = [...withCounts].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case "name":
        cmp = (a.name || "").localeCompare(b.name || "", undefined, {
          sensitivity: "base",
        });
        break;
      case "createdAt": {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = da - db;
        break;
      }
      case "files":
        cmp = a._fileCount - b._fileCount;
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
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

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.35s ease",
      }}
    >
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
            {currentLocation?.name} — {currentDept?.name}
          </h1>
          <p
            style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}
          >
            {df.length} folder{df.length !== 1 ? "s" : ""} · {totalFiles}{" "}
            file
            {totalFiles !== 1 ? "s" : ""}
          </p>
        </div>
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
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
                    color: sortCol === "name" ? t.accent : t.textDim,
                  }}
                  onClick={() => toggleSort("name")}
                >
                  Name <SortArrow col="name" />
                </th>
                <th
                  style={{
                    ...colHeaderStyle,
                    color: sortCol === "files" ? t.accent : t.textDim,
                    width: 90,
                    textAlign: "center",
                  }}
                  onClick={() => toggleSort("files")}
                >
                  Files <SortArrow col="files" />
                </th>
                <th
                  style={{
                    ...colHeaderStyle,
                    color:
                      sortCol === "createdAt" ? t.accent : t.textDim,
                    width: 180,
                  }}
                  onClick={() => toggleSort("createdAt")}
                >
                  Created <SortArrow col="createdAt" />
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
