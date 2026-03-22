import { fmtSize } from "../utils/helpers";
import { Btn } from "../components/ui/Btn";
import {
  FileDocIcon,
  FolderClosedIcon,
  MapPinIcon,
  LayersIcon,
  UploadCloudIcon,
  ChevronRightIcon,
  ImageIcon,
  CalendarIcon,
} from "../components/Icons";

function getFileTypeInfo(mimeType, fileName) {
  if (mimeType?.startsWith("image/")) {
    return { type: "image", label: "Image", icon: ImageIcon };
  }
  if (mimeType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")) {
    return { type: "document", label: "Document", icon: FileDocIcon };
  }
  return { type: "other", label: "Other", icon: FileDocIcon };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  const year = new Date().getFullYear();
  const recentFiles = (dd.recentFiles || []).map((f) => ({
    id: f.id,
    name: f.name,
    size: Number(f.file_size_bytes || 0),
    pages: Number(f.page_count || 0),
    mimeType: f.mime_type,
    uploadedAt: f.uploaded_at,
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
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 16px",
                fontSize: 10.5,
                fontWeight: 600,
                color: t.textDim,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>File</div>
              <div style={{ width: 70, textAlign: "center", flexShrink: 0 }}>
                Type
              </div>
              <div style={{ width: 70, textAlign: "right", flexShrink: 0 }}>
                Size
              </div>
              <div style={{ width: 60, textAlign: "right", flexShrink: 0 }}>
                Pages
              </div>
              <div style={{ width: 70, textAlign: "right", flexShrink: 0 }}>
                Uploaded
              </div>
              <div style={{ width: 24, flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recentFiles.map((file, idx) => {
                const typeInfo = getFileTypeInfo(file.mimeType, file.name);
                const Icon = typeInfo.icon;
                const isImage = typeInfo.type === "image";
                return (
                  <div
                    key={file.id}
                    className="folder-row"
onClick={() => {
                       if (file.folderId && file.locationId && file.departmentId) {
                         setActiveLocation(file.locationId);
                         setActiveDepartment(file.departmentId);
                         setActiveFolderId(file.folderId);
                         setPage("folder-detail");
                       }
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
                          background: isImage
                            ? "rgba(234,179,8,0.15)"
                            : t.successSoft,
                          color: isImage ? "#eab308" : t.success,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={16} />
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
                        width: 70,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: isImage ? "#eab308" : t.textMuted,
                          fontWeight: 500,
                        }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    <div
                      style={{
                        width: 70,
                        textAlign: "right",
                        fontSize: 11.5,
                        color: t.textMuted,
                        flexShrink: 0,
                      }}
                    >
                      {fmtSize(file.size)}
                    </div>
                    <div
                      style={{
                        width: 60,
                        textAlign: "right",
                        fontSize: 10.5,
                        color: t.textDim,
                        flexShrink: 0,
                      }}
                    >
                      {file.pages} pg
                    </div>
                    <div
                      style={{
                        width: 70,
                        textAlign: "right",
                        fontSize: 10.5,
                        color: t.textDim,
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(file.uploadedAt)}
                    </div>
                    <div
                      style={{
                        width: 24,
                        display: "flex",
                        justifyContent: "flex-end",
                        color: t.textDim,
                      }}
                    >
                      <ChevronRightIcon />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
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
