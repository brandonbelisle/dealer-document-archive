import { useEffect, useRef } from "react";
import { Btn } from "../ui/Btn";

export default function RenameModal({
  renamingFileId,
  renamingFileName,
  setRenamingFileId,
  setRenamingFileName,
  renameFile,
  t,
  darkMode,
}) {
  const renameFileRef = useRef(null);

  useEffect(() => {
    if (renamingFileId && renameFileRef.current) renameFileRef.current.focus();
  }, [renamingFileId]);

  if (!renamingFileId) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
        }}
        onClick={() => setRenamingFileId(null)}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 400,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "24px 22px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
          animation: "modalIn 0.2s ease",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
          Rename File
        </div>
        <input
          ref={renameFileRef}
          value={renamingFileName}
          onChange={(e) => setRenamingFileName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") renameFile(renamingFileId, renamingFileName);
            if (e.key === "Escape") setRenamingFileId(null);
          }}
          style={{
            width: "100%",
            padding: "10px 14px",
            fontSize: 14,
            fontFamily: "inherit",
            background: darkMode
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.02)",
            border: `1px solid ${t.accent}`,
            borderRadius: 8,
            color: t.text,
            outline: "none",
            boxSizing: "border-box",
            boxShadow: `0 0 0 3px ${t.accentSoft}`,
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button
            onClick={() => setRenamingFileId(null)}
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: t.text,
              fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <Btn
            primary
            darkMode={darkMode}
            t={t}
            onClick={() => renameFile(renamingFileId, renamingFileName)}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            Save
          </Btn>
        </div>
      </div>
    </div>
  );
}
