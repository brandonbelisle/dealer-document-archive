import { Btn } from "../components/ui/Btn";
import {
  FileDocIcon,
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  CalendarIcon,
  ChevronRightIcon,
} from "../components/Icons";

function StatCard({ icon, label, value, color, sub, t }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: "20px 18px",
        flex: 1,
        minWidth: 0,
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: color || t.accentSoft,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: t.accent,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          marginBottom: 2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: t.textMuted, fontWeight: 500 }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: 10.5, color: t.textDim, marginTop: 4 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage({
  dashboardData,
  loggedInUser,
  locations,
  departments,
  t,
  darkMode,
  setPage,
  setActiveFolderId,
}) {
  const dd = dashboardData || {};
  const year = new Date().getFullYear();

  const locationsWithDepts = locations.map((loc) => ({
    ...loc,
    departments: departments.filter((d) => d.locationId === loc.id),
  }));

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "36px 28px",
        animation: "fadeIn 0.35s ease",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.03em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}>
          Welcome back, {loggedInUser?.name}
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard
          t={t}
          icon={<FileDocIcon size={20} />}
          label="Total Files"
          value={dd.totalFiles ?? 0}
          color={t.accentSoft}
          sub={`${dd.filesToday ?? 0} uploaded today`}
        />
        <StatCard
          t={t}
          icon={<FolderClosedIcon size={20} />}
          label="Total Folders"
          value={dd.totalFolders ?? 0}
          color={t.successSoft}
          sub={`${dd.foldersToday ?? 0} created today`}
        />
        <StatCard
          t={t}
          icon={<MapPinIcon size={20} />}
          label="Locations"
          value={dd.totalLocations ?? 0}
          color={
            darkMode ? "rgba(210,153,34,0.12)" : "rgba(180,83,9,0.08)"
          }
        />
        <StatCard
          t={t}
          icon={<LayersIcon size={20} />}
          label="Departments"
          value={dd.totalDepartments ?? 0}
          color={
            darkMode ? "rgba(248,81,73,0.1)" : "rgba(225,29,72,0.07)"
          }
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard
          t={t}
          icon={<CalendarIcon size={20} />}
          label={`Files (${year})`}
          value={dd.filesThisYear ?? 0}
          color={darkMode ? "rgba(59,130,246,0.12)" : "rgba(59,130,246,0.08)"}
        />
        <StatCard
          t={t}
          icon={<CalendarIcon size={20} />}
          label={`Folders (${year})`}
          value={dd.foldersThisYear ?? 0}
          color={darkMode ? "rgba(34,197,94,0.12)" : "rgba(34,197,94,0.08)"}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            margin: "0 0 16px 0",
            letterSpacing: "-0.02em",
          }}
        >
          Locations & Departments
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {locationsWithDepts.map((loc) => (
            <div
              key={loc.id}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 12,
                padding: "16px 18px",
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background:
                      darkMode
                        ? "rgba(210,153,34,0.15)"
                        : "rgba(180,83,9,0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: darkMode ? "#d2992e" : "#b45309",
                  }}
                >
                  <MapPinIcon size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{loc.name}</div>
                  {loc.code && (
                    <div style={{ fontSize: 11, color: t.textDim }}>
                      {loc.code}
                    </div>
                  )}
                </div>
              </div>
              {loc.departments.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  {loc.departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setActiveFolderId(dept.id);
                        setPage("folder-detail");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        background: t.accentSoft,
                        color: t.accent,
                        border: "none",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <LayersIcon size={11} />
                      {dept.name}
                      <ChevronRightIcon size={10} />
                    </button>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: 11,
                    color: t.textDim,
                    fontStyle: "italic",
                  }}
                >
                  No departments
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
