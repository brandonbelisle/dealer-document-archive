import { useState } from "react";
import { fuzzyMatch } from "../utils/helpers";
import {
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  ChevronRightIcon,
  SearchIcon,
  FileDocIcon,
  ChevronIcon,
} from "../components/Icons";

export default function FoldersBrowsePage({
  locations,
  departments,
  folders,
  deptsInLocation,
  foldersInDepartment,
  filesInFolder,
  allFilesInFolderRecursive,
  subfoldersOf,
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

  const goToFolder = (locId, deptId, folderId) => {
    setActiveLocation(locId);
    setActiveDepartment(deptId);
    setActiveFolderId(folderId);
    setSelectedFile(null);
    setPage("folder-detail");
  };

  // Build filtered structure
  const locationsWithData = locations
    .map((loc) => {
      const depts = deptsInLocation(loc.id).map((dept) => {
        const deptFolders = foldersInDepartment(dept.id);
        const filtered = q
          ? deptFolders.filter((f) => fuzzyMatch(q, f.name).match)
          : deptFolders;
        return { ...dept, folders: filtered, allFolders: deptFolders };
      });
      // If searching, only show depts that have matching folders or whose name matches
      const filteredDepts = q
        ? depts.filter(
            (d) => d.folders.length > 0 || fuzzyMatch(q, d.name).match
          )
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
            Browse all departments and folders by location
          </p>
        </div>
        {/* Search */}
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
            placeholder="Search folders..."
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
            {q ? "No folders match your search" : "No folders yet"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {locationsWithData.map((loc) => {
            const isCollapsed = collapsedLocations[loc.id];
            const totalFolders = loc.depts.reduce(
              (s, d) => s + d.allFolders.length,
              0
            );
            const totalFiles = loc.depts.reduce(
              (s, d) =>
                s +
                d.allFolders.reduce(
                  (fs, f) => fs + allFilesInFolderRecursive(f.id),
                  0
                ),
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
                      const deptFileCount = dept.allFolders.reduce(
                        (s, f) => s + allFilesInFolderRecursive(f.id),
                        0
                      );
                      const foldersToShow = q ? dept.folders : dept.allFolders;

                      return (
                        <div key={dept.id} style={{ marginBottom: 6 }}>
                          {/* Department header */}
                          <div
                            onClick={() => goToDept(loc.id, dept.id)}
                            className="folder-select-item"
                            style={{
                              padding: "10px 12px",
                              borderRadius: 8,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
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
                                {dept.allFolders.length} folder
                                {dept.allFolders.length !== 1 ? "s" : ""} ·{" "}
                                {deptFileCount} file
                                {deptFileCount !== 1 ? "s" : ""}
                              </div>
                            </div>
                            <ChevronRightIcon size={14} />
                          </div>

                          {/* Folder list under department */}
                          {foldersToShow.length > 0 && (
                            <div style={{ paddingLeft: 22, marginTop: 2 }}>
                              {foldersToShow.map((folder) => {
                                const fileCount =
                                  allFilesInFolderRecursive(folder.id);
                                const subCount =
                                  subfoldersOf(folder.id).length;
                                return (
                                  <div
                                    key={folder.id}
                                    onClick={() =>
                                      goToFolder(loc.id, dept.id, folder.id)
                                    }
                                    className="folder-select-item"
                                    style={{
                                      padding: "7px 12px",
                                      borderRadius: 7,
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 9,
                                      fontSize: 12.5,
                                    }}
                                  >
                                    <FolderClosedIcon
                                      size={14}
                                      style={{ color: t.textDim }}
                                    />
                                    <span
                                      style={{
                                        flex: 1,
                                        fontWeight: 500,
                                        color: t.textMuted,
                                      }}
                                    >
                                      {folder.name}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        color: t.textDim,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 6,
                                      }}
                                    >
                                      {subCount > 0 && (
                                        <span>
                                          {subCount} subfolder
                                          {subCount !== 1 ? "s" : ""}
                                        </span>
                                      )}
                                      <span
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 3,
                                        }}
                                      >
                                        <FileDocIcon size={10} />
                                        {fileCount}
                                      </span>
                                    </span>
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
          })}
        </div>
      )}
    </div>
  );
}
