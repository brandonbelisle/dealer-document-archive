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
}) {
  const canDeleteFolders = loggedInUser?.permissions?.includes("deleteFolders");
  const newDeptFolderRef = useRef(null);
  const [sortCol, setSortCol] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);

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

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [folderSearch, pageSize]);

  const pageSizeOptions = [25, 50, 100, 150];

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
        maxWidth: 1200,
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
          <p
            style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}
          >
            {df.length} folder{df.length !== 1 ? "s" : ""} · {totalFiles}{" "}
            file
            {totalFiles !== 1 ? "s" : ""}
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
              {paginated.map((folder, idx) => (
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
          {sorted.length > pageSize && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderTop: `1px solid ${t.border}`,
                fontSize: 12,
                color: t.textMuted,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Rows per page:</span>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowPageSizeDropdown(!showPageSizeDropdown)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      background: "transparent",
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 12,
                      color: t.text,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {pageSize}
                    <ChevronDown />
                  </button>
                  {showPageSizeDropdown && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        marginTop: 4,
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        boxShadow: darkMode
                          ? "0 4px 20px rgba(0,0,0,0.4)"
                          : "0 4px 20px rgba(0,0,0,0.1)",
                        overflow: "hidden",
                        zIndex: 1000,
                      }}
                    >
                      {pageSizeOptions.map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setPageSize(size);
                            setShowPageSizeDropdown(false);
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "6px 16px",
                            background: size === pageSize ? t.accentSoft : "transparent",
                            border: "none",
                            fontSize: 12,
                            color: size === pageSize ? t.accent : t.text,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            textAlign: "left",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span>
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      background: "transparent",
                      border: `1px solid ${t.border}`,
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      color: currentPage === 1 ? t.textDim : t.text,
                      cursor: currentPage === 1 ? "default" : "pointer",
                      opacity: currentPage === 1 ? 0.5 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      background: "transparent",
                      border: `1px solid ${t.border}`,
                      borderRadius: 4,
                      padding: "4px 8px",
                      fontSize: 11,
                      color: currentPage === totalPages ? t.textDim : t.text,
                      cursor: currentPage === totalPages ? "default" : "pointer",
                      opacity: currentPage === totalPages ? 0.5 : 1,
                      fontFamily: "inherit",
                    }}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
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
