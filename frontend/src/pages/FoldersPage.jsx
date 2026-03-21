import { useRef, useEffect } from "react";
import { fuzzyMatch } from "../utils/helpers";
import { Btn } from "../components/ui/Btn";
import { SmallBtn } from "../components/ui/Btn";
import HighlightedName from "../components/HighlightedName";
import {
  FolderClosedIcon,
  PlusIcon,
  XIcon,
  SearchIcon,
  ChevronRightIcon,
  TrashIcon,
} from "../components/Icons";

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
  allFilesInFolderRecursive,
  subfoldersOf,
  handleDeleteFolder,
  t,
  darkMode,
}) {
  const newDeptFolderRef = useRef(null);

  useEffect(() => {
    if (creatingDeptFolder && newDeptFolderRef.current)
      newDeptFolderRef.current.focus();
  }, [creatingDeptFolder]);

  const q = folderSearch.trim();
  const df = currentDeptFolders;
  const filtered = q
    ? df
        .map((f) => ({ folder: f, ...fuzzyMatch(q, f.name) }))
        .filter((r) => r.match)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.folder)
    : df;
  const fc = df.reduce((s, f) => s + allFilesInFolderRecursive(f.id), 0);

  return (
    <div
      style={{
        maxWidth: 900,
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
            {currentLocation?.name} — {currentDept?.name}
          </h1>
          <p
            style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}
          >
            {df.length} folder{df.length !== 1 ? "s" : ""} · {fc} file
            {fc !== 1 ? "s" : ""}
          </p>
        </div>
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
      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map((folder, idx) => {
            const c = allFilesInFolderRecursive(folder.id);
            const sc = subfoldersOf(folder.id).length;
            return (
              <div
                key={folder.id}
                className="folder-row"
                onClick={() => {
                  setActiveFolderId(folder.id);
                  setPage("folder-detail");
                  setCreatingSubfolder(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  borderRadius: 10,
                  padding: "12px 18px",
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
                    gap: 12,
                  }}
                >
                  <div style={{ color: t.accent, opacity: 0.75 }}>
                    <FolderClosedIcon size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>
                      <HighlightedName
                        name={folder.name}
                        query={folderSearch.trim()}
                        accentColor={t.accent}
                      />
                    </div>
                    {sc > 0 && (
                      <div style={{ fontSize: 10.5, color: t.textDim }}>
                        {sc} subfolder{sc !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: c > 0 ? t.accent : t.textDim,
                    background: c > 0 ? t.accentSoft : "transparent",
                    padding: "2px 9px",
                    borderRadius: 12,
                  }}
                >
                  {c}
                </span>
                <div
                  style={{
                    width: 30,
                    display: "flex",
                    justifyContent: "flex-end",
                    marginLeft: 6,
                  }}
                >
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
