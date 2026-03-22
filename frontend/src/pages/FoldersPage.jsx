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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowDateFilterDropdown(!showDateFilterDropdown)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: dateFilterType !== "all" ? t.accent : t.text,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <span>Filter by Date</span>
            <ChevronDown />
          </button>
          {showDateFilterDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                boxShadow: darkMode
                  ? "0 8px 30px rgba(0,0,0,0.4)"
                  : "0 8px 30px rgba(0,0,0,0.15)",
                padding: 12,
                zIndex: 1000,
                minWidth: 200,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 8, color: t.textMuted }}>
                Filter Type
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {[
                  { value: "all", label: "All Dates" },
                  { value: "day", label: "Specific Day" },
                  { value: "month", label: "Specific Month" },
                  { value: "year", label: "Specific Year" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setDateFilterType(opt.value);
                      if (opt.value === "all") setShowDateFilterDropdown(false);
                    }}
                    style={{
                      background: dateFilterType === opt.value ? t.accentSoft : "transparent",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      fontSize: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      color: dateFilterType === opt.value ? t.accent : t.text,
                      fontFamily: "inherit",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {dateFilterType === "year" && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                    Select Year
                  </div>
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      fontSize: 12,
                      background: t.surface,
                      color: t.text,
                      fontFamily: "inherit",
                    }}
                  >
                    <option value="">Choose year...</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>
              )}
              {dateFilterType === "month" && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                      Select Year
                    </div>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        background: t.surface,
                        color: t.text,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose year...</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                      Select Month
                    </div>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        background: t.surface,
                        color: t.text,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose month...</option>
                      {availableMonths.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType === "day" && (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                      Select Year
                    </div>
                    <select
                      value={filterYear}
                      onChange={(e) => setFilterYear(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        background: t.surface,
                        color: t.text,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose year...</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                      Select Month
                    </div>
                    <select
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        background: t.surface,
                        color: t.text,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose month...</option>
                      {availableMonths.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6, color: t.textMuted }}>
                      Select Day
                    </div>
                    <select
                      value={filterDay}
                      onChange={(e) => setFilterDay(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 10px",
                        border: `1px solid ${t.border}`,
                        borderRadius: 6,
                        fontSize: 12,
                        background: t.surface,
                        color: t.text,
                        fontFamily: "inherit",
                      }}
                    >
                      <option value="">Choose day...</option>
                      {availableDays.map((d) => (
                        <option key={d} value={d}>{parseInt(d)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {dateFilterType !== "all" && (
                <button
                  onClick={() => {
                    setShowDateFilterDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: t.accent,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    marginTop: 4,
                  }}
                >
                  Apply Filter
                </button>
              )}
            </div>
          )}
        </div>
        {dateFilterType !== "all" && (
          <button
            onClick={() => {
              setDateFilterType("all");
              setFilterYear("");
              setFilterMonth("");
              setFilterDay("");
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 11,
              color: t.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Clear Filter
            <XIcon size={12} />
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
