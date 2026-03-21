import { fmtSize } from "../utils/helpers";
import { Btn } from "../components/ui/Btn";
import {
  FileDocIcon,
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  UploadCloudIcon,
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
  setPage,
  setActiveFolderId,
  setViewingFileId,
  t,
  darkMode,
}) {
  const dd = dashboardData || {};
  const totalByLocation = (dd.locationStats || []).map((l) => ({
    name: l.name,
    folders: l.folder_count,
    files: l.file_count,
  }));
  const recentFiles = (dd.recentFiles || []).map((f) => ({
    id: f.id,
    name: f.name,
    size: Number(f.file_size_bytes || 0),
    pages: Number(f.page_count || 0),
    folderId: f.folder_id,
    folderName: f.folder_name,
    locationName: f.location_name,
    departmentName: f.department_name,
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
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          Files by Location
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {totalByLocation.map((loc, i) => {
            const maxFiles = Math.max(
              ...totalByLocation.map((l) => l.files),
              1
            );
            return (
              <div
                key={i}
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  animation: `fadeIn 0.25s ease ${i * 0.05}s both`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <MapPinIcon size={14} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {loc.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: t.textMuted }}>
                    {loc.files} file{loc.files !== 1 ? "s" : ""} ·{" "}
                    {loc.folders} folder{loc.folders !== 1 ? "s" : ""}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: t.progressBg,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(loc.files / maxFiles) * 100}%`,
                      background: `linear-gradient(90deg, ${t.accent}, ${t.accentDark})`,
                      borderRadius: 3,
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            margin: "0 0 12px",
            letterSpacing: "-0.01em",
          }}
        >
          Recent Uploads
        </h2>
        {recentFiles.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {recentFiles.map((file, idx) => (
<div
                  key={file.id}
                  className="folder-row"
                  onClick={() => {
                    setViewingFileId(file.id);
                    setPage("file-detail");
                  }}
                  style={{
                  display: "flex",
                  alignItems: "center",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "10px 16px",
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
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: t.successSoft,
                      color: t.success,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileDocIcon size={16} />
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
                    <div style={{ fontSize: 10.5, color: t.textDim }}>
                      {file.locationName} / {file.departmentName} /{" "}
                      {file.folderName}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {fmtSize(file.size)}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: t.textDim,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                >
                  {file.pages} pg
                </div>
                <div
                  style={{
                    width: 24,
                    display: "flex",
                    justifyContent: "flex-end",
                    color: t.textDim,
                    marginLeft: 8,
                  }}
                >
                  <ChevronRightIcon />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 10,
              padding: "40px 20px",
              textAlign: "center",
              color: t.textDim,
            }}
          >
            <UploadCloudIcon size={36} />
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                marginTop: 12,
                marginBottom: 6,
              }}
            >
              No files uploaded yet
            </div>
            <div style={{ fontSize: 12, marginBottom: 16 }}>
              Upload your first PDF to get started
            </div>
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              onClick={() => setPage("upload")}
            >
              <UploadCloudIcon size={15} /> Upload Files
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
