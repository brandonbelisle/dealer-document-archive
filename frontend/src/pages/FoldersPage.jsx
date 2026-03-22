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
  const [sortCol, setSortCol] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPageSizeDropdown, setShowPageSizeDropdown] = useState(false);
  const [dateFilterType, setDateFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const [showDateFilterDropdown, setShowDateFilterDropdown] = useState(false);

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

  const availableYears = [...new Set(withCounts.map(f => f.createdAt ? new Date(f.createdAt).getFullYear() : null).filter(Boolean))].sort((a, b) => b - a);
  const availableMonths = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const getDaysInMonth = (year, month) => {
    if (!year || !month) return31;
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const daysInSelectedMonth = filterYear && filterMonth ? getDaysInMonth(filterYear, filterMonth) : 31;
  const availableDays = Array.from({ length: daysInSelectedMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  const dateFiltered = sorted.filter((folder) => {
    if (dateFilterType === "all") return true;
    if (!folder.createdAt) return false;

    const date = new Date(folder.createdAt);
    const folderYear = date.getFullYear().toString();
    const folderMonth = String(date.getMonth() + 1).padStart(2, "0");
    const folderDay = String(date.getDate()).padStart(2, "0");

    if (dateFilterType === "year" && filterYear) {
      return folderYear === filterYear;
    }
    if (dateFilterType === "month" && filterMonth && filterYear) {
      return folderYear === filterYear && folderMonth === filterMonth;
    }
    if (dateFilterType === "day" && filterDay && filterMonth && filterYear) {
      return folderYear === filterYear && folderMonth === filterMonth && folderDay === filterDay;
    }
    return true;
  });

  const totalPages = Math.ceil(dateFiltered.length / pageSize);
  const paginated = dateFiltered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [folderSearch, pageSize, dateFilterType, filterYear, filterMonth, filterDay]);

  useEffect(() => {
    if (dateFilterType === "all") {
      setFilterYear("");
      setFilterMonth("");
      setFilterDay("");
    } else if (dateFilterType === "year") {
      setFilterMonth("");
      setFilterDay("");
    } else if (dateFilterType === "month") {
      setFilterDay("");
    }
  }, [dateFilterType]);

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
          <p
            style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}
          >
            {dateFilterType !== "all" ? (
              <>
                {dateFiltered.length} of {df.length} folder{df.length !== 1 ? "s" : ""} ·{" "}
                {totalFiles} file{totalFiles !== 1 ? "s" : ""}
              </>
            ) : (
              <>
                {df.length} folder{df.length !== 1 ? "s" : ""} · {totalFiles}{" "}
                file
                {totalFiles !== 1 ? "s" : ""}
              </>
)}
        )}
        {canUploadFiles && (
          <div
            onClick={() => deptFileInputRef.current?.click()}
            style={{
              border: `2px dashed ${t.border}`,
              borderRadius: 14,
              padding: "36px 24px",
              textAlign: "center",
              cursor: "pointer",
              background: t.dropzone,
              marginTop: 24,
              transition: "all 0.2s",
            }}
          >
            <div style={{ color: t.textDim, marginBottom: 10 }}>
              <UploadCloudIcon size={32} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: t.text, marginBottom: 4 }}>
              Drag & drop files here or click to browse
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>
              Files will be added to Unsorted in this department
            </div>
          </div>
        )}
      </div>
    );
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
      {dateFiltered.length > 0 ? (
        <div
          style={{
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {dateFiltered.length > pageSize && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: `1px solid ${t.border}`,
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
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, dateFiltered.length)} of {dateFiltered.length}
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
                        idx < paginated.length - 1
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
                        idx < paginated.length - 1
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
                        idx < paginated.length - 1
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
                        idx < paginated.length - 1
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
