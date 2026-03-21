import { useState, useEffect } from "react";
import SubscribeButton from "../components/SubscribeButton";
import {
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  ChevronRightIcon,
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
  subscriptions,
  setSubscriptions,
  t,
  darkMode,
}) {
  const [collapsedLocations, setCollapsedLocations] = useState({});
  const [stats, setStats] = useState(null);

  const handleSubscribe = (newSub) => {
    setSubscriptions((prev) => [...prev, newSub]);
  };

  const handleUnsubscribe = (subId) => {
    setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
  };

  useEffect(() => {
    api.getFolderStats().then(setStats).catch(console.error);
  }, []);

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

  const locationsWithData = locations.filter(
    (loc) => deptsInLocation(loc.id).length > 0
  );

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.35s ease",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>Folders</h1>
        <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
          Browse departments by location
        </p>
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
            No locations yet
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {locationsWithData.map((loc) => {
            const isCollapsed = collapsedLocations[loc.id];
            const depts = deptsInLocation(loc.id);
            const totalFolders = depts.reduce(
              (s, d) => s + getDeptFolderCount(d.id),
              0
            );
            const totalFiles = depts.reduce(
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
                      {depts.length} department
                      {depts.length !== 1 ? "s" : ""} · {totalFolders}{" "}
                      folder
                      {totalFolders !== 1 ? "s" : ""} · {totalFiles} file
                      {totalFiles !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <SubscribeButton
                    type="location"
                    itemId={loc.id}
                    subscriptions={subscriptions || []}
                    onSubscribe={handleSubscribe}
                    onUnsubscribe={handleUnsubscribe}
                    t={t}
                  />
                </div>

                {/* Departments */}
                {!isCollapsed && (
                  <div style={{ padding: "8px 12px 12px" }}>
                    {depts.map((dept) => {
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
