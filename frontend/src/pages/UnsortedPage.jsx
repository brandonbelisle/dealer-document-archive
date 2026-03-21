import { useState, useRef } from "react";
import { fmtSize, fuzzyMatch } from "../utils/helpers";
import { Btn, SmallBtn } from "../components/ui/Btn";
import {
  FileDocIcon,
  FolderClosedIcon,
  CheckIcon,
  TrashIcon,
  SearchIcon,
  ChevronDown,
} from "../components/Icons";

export default function UnsortedPage({
  unsortedFiles,
  folders,
  locations,
  departments,
  deptsInLocation,
  handleMoveFile,
  removeFile,
  setUnsortedFiles,
  setWarningModal,
  t,
  darkMode,
}) {
  const [movingFileId, setMovingFileId] = useState(null);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState("");
  const [showMoveSelect, setShowMoveSelect] = useState(false);
  const [moveSelectSearch, setMoveSelectSearch] = useState("");
  const moveSelectRef = useRef(null);

  const doMove = async (fileId, folderId) => {
    await handleMoveFile(fileId, folderId);
    setMovingFileId(null);
    setMoveTargetFolderId("");
  };

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
            Unsorted Files
          </h1>
          <p
            style={{ fontSize: 13, color: t.textMuted, margin: "4px 0 0" }}
          >
            {unsortedFiles.length} file
            {unsortedFiles.length !== 1 ? "s" : ""} not assigned to any
            folder
          </p>
        </div>
      </div>
      {unsortedFiles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {unsortedFiles.map((file, idx) => (
            <div
              key={file.id}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                padding: "12px 16px",
                animation: `fadeIn 0.25s ease ${idx * 0.03}s both`,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: t.accentSoft,
                    color: t.accent,
                  }}
                >
                  <FileDocIcon size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
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
                  <div
                    style={{
                      fontSize: 10.5,
                      color: t.textMuted,
                      display: "flex",
                      gap: 8,
                    }}
                  >
                    <span>{fmtSize(file.size)}</span>
                    {file.pages > 0 && <span>{file.pages} pg</span>}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  {movingFileId === file.id ? (
                    <div style={{ position: "relative", minWidth: 220 }}>
                      <div
                        onClick={() => {
                          setShowMoveSelect(!showMoveSelect);
                          setMoveSelectSearch("");
                        }}
                        style={{
                          border: `1px solid ${showMoveSelect ? t.accent : t.border}`,
                          borderRadius: 8,
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          background: darkMode
                            ? "rgba(255,255,255,0.03)"
                            : "rgba(0,0,0,0.02)",
                        }}
                      >
                        <FolderClosedIcon size={14} />
                        <span
                          style={{
                            flex: 1,
                            color: moveTargetFolderId
                              ? t.text
                              : t.textDim,
                          }}
                        >
                          {moveTargetFolderId
                            ? folders.find(
                                (f) => f.id === moveTargetFolderId
                              )?.name || "Select..."
                            : "Choose folder..."}
                        </span>
                        <ChevronDown />
                      </div>
                      {showMoveSelect &&
                        (() => {
                          const sq = moveSelectSearch.trim();
                          const dff = sq
                            ? folders
                                .map((f) => ({
                                  ...f,
                                  ...fuzzyMatch(sq, f.name),
                                }))
                                .filter((r) => r.match)
                                .sort((a, b) => b.score - a.score)
                            : folders;
                          return (
                            <div
                              style={{
                                position: "absolute",
                                top: "calc(100% + 4px)",
                                left: 0,
                                right: 0,
                                zIndex: 100,
                                background: t.surface,
                                border: `1px solid ${t.border}`,
                                borderRadius: 10,
                                boxShadow:
                                  "0 12px 36px rgba(0,0,0,0.2)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  padding: "6px 8px",
                                  borderBottom: `1px solid ${t.border}`,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <SearchIcon size={13} />
                                <input
                                  ref={moveSelectRef}
                                  value={moveSelectSearch}
                                  onChange={(e) =>
                                    setMoveSelectSearch(e.target.value)
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Search folders..."
                                  style={{
                                    flex: 1,
                                    background: "transparent",
                                    border: "none",
                                    fontSize: 12,
                                    color: t.text,
                                    outline: "none",
                                    fontFamily: "inherit",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  maxHeight: 250,
                                  overflowY: "auto",
                                  padding: 4,
                                }}
                              >
                                {locations.map((loc) => {
                                  const li = dff.filter(
                                    (f) => f.locationId === loc.id
                                  );
                                  if (!li.length) return null;
                                  return (
                                    <div key={loc.id}>
                                      <div
                                        style={{
                                          padding: "5px 8px 2px",
                                          fontSize: 9.5,
                                          fontWeight: 700,
                                          letterSpacing: "0.06em",
                                          textTransform: "uppercase",
                                          color: t.textMuted,
                                        }}
                                      >
                                        {loc.name}
                                      </div>
                                      {deptsInLocation(loc.id).map(
                                        (dept) => {
                                          const di = li.filter(
                                            (f) =>
                                              f.departmentId === dept.id
                                          );
                                          if (!di.length) return null;
                                          return (
                                            <div key={dept.id}>
                                              <div
                                                style={{
                                                  padding:
                                                    "3px 8px 2px 16px",
                                                  fontSize: 9,
                                                  fontWeight: 600,
                                                  color: t.textDim,
                                                }}
                                              >
                                                {dept.name}
                                              </div>
                                              {di.map((folder) => (
                                                <div
                                                  key={folder.id}
                                                  onClick={() => {
                                                    setMoveTargetFolderId(
                                                      folder.id
                                                    );
                                                    setShowMoveSelect(
                                                      false
                                                    );
                                                    setMoveSelectSearch(
                                                      ""
                                                    );
                                                  }}
                                                  className="folder-select-item"
                                                  style={{
                                                    padding:
                                                      "6px 10px 6px 24px",
                                                    borderRadius: 6,
                                                    cursor: "pointer",
                                                    fontSize: 12,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    background:
                                                      moveTargetFolderId ===
                                                      folder.id
                                                        ? t.accentSoft
                                                        : "transparent",
                                                    color:
                                                      moveTargetFolderId ===
                                                      folder.id
                                                        ? t.accent
                                                        : t.text,
                                                    fontWeight: 500,
                                                  }}
                                                >
                                                  <FolderClosedIcon
                                                    size={13}
                                                  />
                                                  <span
                                                    style={{ flex: 1 }}
                                                  >
                                                    {folder.name}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      {moveTargetFolderId && (
                        <Btn
                          primary
                          darkMode={darkMode}
                          t={t}
                          onClick={() =>
                            doMove(file.id, moveTargetFolderId)
                          }
                          style={{
                            marginTop: 6,
                            fontSize: 11,
                            padding: "5px 12px",
                            width: "100%",
                          }}
                        >
                          <CheckIcon /> Move to Folder
                        </Btn>
                      )}
                      <button
                        onClick={() => {
                          setMovingFileId(null);
                          setMoveTargetFolderId("");
                          setShowMoveSelect(false);
                        }}
                        style={{
                          marginTop: 4,
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: t.textDim,
                          fontSize: 10.5,
                          fontFamily: "inherit",
                          width: "100%",
                          textAlign: "center",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <Btn
                        darkMode={darkMode}
                        t={t}
                        onClick={() => {
                          setMovingFileId(file.id);
                          setMoveTargetFolderId("");
                          setShowMoveSelect(false);
                        }}
                        style={{ fontSize: 11, padding: "5px 12px" }}
                      >
                        <FolderClosedIcon size={13} /> Move to Folder
                      </Btn>
                      <SmallBtn
                        t={t}
                        title="Delete"
                        onClick={() => {
                          setWarningModal({
                            title: "Delete File",
                            message: `Delete "${file.name}"? This cannot be undone.`,
                            onConfirm: async () => {
                              await removeFile(file.id);
                              setUnsortedFiles((p) =>
                                p.filter((f) => f.id !== file.id)
                              );
                              setWarningModal(null);
                            },
                          });
                        }}
                      >
                        <TrashIcon size={12} />
                      </SmallBtn>
                    </>
                  )}
                </div>
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
            padding: "48px 20px",
            textAlign: "center",
            color: t.textDim,
          }}
        >
          <CheckIcon />
          <div
            style={{ fontSize: 13, fontWeight: 500, marginTop: 12 }}
          >
            All files are sorted
          </div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            No unsorted files at the moment
          </div>
        </div>
      )}
    </div>
  );
}
