import { useState, useEffect } from "react";
import { fuzzyMatch } from "../utils/helpers";
import {
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  ChevronRightIcon,
  SearchIcon,
  ChevronIcon,
} from "../components/Icons";
import * as api from "../api";

export default function FoldersBrowsePage({
  locations,
  departments,
  deptsInLocation,
  setActiveLocation,
  setActiveDepartment,
  setActiveFolderId,
  setFolderSearch,
  setSelectedFile,
  setPage,
  t,
  darkMode,
}) {
  const [search, setSearch] = useState("");
  const [collapsedLocations, setCollapsedLocations] = useState({});
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getFolderStats().then(setStats).catch(console.error);
  }, []);

  const q = search.trim();

  const toggleLocation = (locId) => {
    setCollapsedLocations((p) => ({ ...p, [locId]: !p[locId] }));
  };

  const goToDept = (locId, deptId) => {
    setActiveLocation(locId);
    setActiveDepartment(deptId);
    setActiveFolderId(null);
    setSelectedFile(null);
    setFolderSearch("");
    setPage("folders");
  };

  const getDeptFolderCount = (deptId) =>
    stats?.deptStats?.[deptId]?.folderCount ?? 0;
  const getDeptFileCount = (deptId) =>
    stats?.deptStats?.[deptId]?.fileCount ?? 0;

  // Build filtered structure
  const locationsWithData = locations
    .map((loc) => {
      const depts = deptsInLocation(loc.id);
      const filteredDepts = q
        ? depts.filter((d) => fuzzyMatch(q, d.name).match)
        : depts;
      return { ...loc, depts: filteredDepts };
    })
    .filter((loc) => {
      if (q) return loc.depts.length > 0 || fuzzyMatch(q, loc.name).match;
      return loc.depts.length > 0;
    });

  return (
    <div
      style={{
        maxWidth: 960,
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
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Folders</h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
            Browse departments by location
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: darkMode
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)",
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            padding: "6px 12px",
            width: 240,
          }}
        >
          <SearchIcon size={14} style={{ color: t.textDim, flexShrink: 0 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: t.text,
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {locationsWithData.length === 0 ? (
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
          <FolderClosedIcon size={36} />
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}>
            {q ? "No departments match your search" : "No locations yet"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {locationsWithData.map((loc) => {
            const isCollapsed = collapsedLocations[loc.id];
            const totalFolders = loc.depts.reduce(
              (s, d) => s + getDeptFolderCount(d.id),
              0
            );
            const totalFiles = loc.depts.reduce(
              (s, d) => s + getDeptFileCount(d.id),
              0
            );

            return (
              <div
                key={loc.id}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                {/* Location header */}
                <div
                  onClick={() => toggleLocation(loc.id)}
                  style={{
                    padding: "14px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    borderBottom: isCollapsed
                      ? "none"
                      : `1px solid ${t.border}`,
                    userSelect: "none",
                  }}
                >
                  <ChevronIcon open={!isCollapsed} />
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: t.accentSoft,
                      color: t.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MapPinIcon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {loc.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: t.textDim, marginTop: 1 }}
                    >
                      {loc.depts.length} department
                      {loc.depts.length !== 1 ? "s" : ""} · {totalFolders}{" "}
                      folder
                      {totalFolders !== 1 ? "s" : ""} · {totalFiles} file
                      {totalFiles !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                {/* Departments */}
                {!isCollapsed && (
                  <div style={{ padding: "8px 12px 12px" }}>
                    {loc.depts.map((dept) => {
                      const deptFolderCount = getDeptFolderCount(dept.id);
                      const deptFileCount = getDeptFileCount(dept.id);

                      return (
                        <div
                          key={dept.id}
                          onClick={() => goToDept(loc.id, dept.id)}
                          className="folder-select-item"
                          style={{
                            padding: "10px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            marginBottom: 2,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              background: darkMode
                                ? "rgba(255,255,255,0.05)"
                                : "rgba(0,0,0,0.04)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              color: t.textMuted,
                            }}
                          >
                            <LayersIcon size={14} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 600,
                                color: t.text,
                              }}
                            >
                              {dept.name}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: t.textDim,
                                marginTop: 1,
                              }}
                            >
                              {deptFolderCount} folder
                              {deptFolderCount !== 1 ? "s" : ""} ·{" "}
                              {deptFileCount} file
                              {deptFileCount !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <ChevronRightIcon size={14} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
