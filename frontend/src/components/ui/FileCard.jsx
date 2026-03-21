import { fmtSize } from "../../utils/helpers";
import { FileDocIcon, CheckIcon, EditIcon, CopyIcon, TrashIcon } from "../Icons";
import { SmallBtn } from "./Btn";

export default function FileCard({
  file,
  idx,
  staged,
  t,
  onView,
  onRename,
  onCopyText,
  onRemove,
}) {
  return (
    <div
      onClick={() =>
        !staged && file.status === "done" && onView && onView(file)
      }
      className="file-card"
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 10,
        padding: "12px 14px",
        cursor: !staged && file.status === "done" ? "pointer" : "default",
        transition: "all 0.2s",
        animation: `fadeIn 0.3s ease ${idx * 0.04}s both`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {file.status === "processing" && (
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            height: 2,
            width: "100%",
            background: t.progressBg,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${file.progress}%`,
              background: `linear-gradient(90deg,${t.accent},${t.accentDark})`,
              transition: "width 0.3s",
            }}
          />
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            background:
              file.status === "error"
                ? t.errorSoft
                : file.status === "done"
                  ? t.successSoft
                  : t.accentSoft,
            color:
              file.status === "error"
                ? t.error
                : file.status === "done"
                  ? t.success
                  : t.accent,
          }}
        >
          {file.status === "done" ? <CheckIcon /> : <FileDocIcon size={18} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {file.name}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: t.textMuted,
              marginTop: 1,
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            <span>{fmtSize(file.size)}</span>
            {file.pages > 0 && <span>· {file.pages} pg</span>}
            {file.status === "processing" && (
              <span style={{ color: t.accent }}>
                Extracting {file.progress}%
              </span>
            )}
            {file.status === "error" && (
              <span style={{ color: t.error }}>{file.error}</span>
            )}
            {file.status === "done" && (
              <span style={{ color: t.success }}>Ready</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {!staged && file.status === "done" && (
            <SmallBtn
              t={t}
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                onRename && onRename(file);
              }}
            >
              <EditIcon />
            </SmallBtn>
          )}
          {!staged && file.status === "done" && (
            <SmallBtn
              t={t}
              title="Copy text"
              onClick={(e) => {
                e.stopPropagation();
                onCopyText && onCopyText(file);
              }}
            >
              <CopyIcon />
            </SmallBtn>
          )}
          <SmallBtn
            t={t}
            title="Remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove && onRemove(file);
            }}
          >
            <TrashIcon />
          </SmallBtn>
        </div>
      </div>
    </div>
  );
}
