import { useState, useEffect, useRef } from "react";
import { ShieldIcon, XIcon, ChevronDown, CheckIcon } from "./Icons";

/**
 * GroupAccessEditor — inline dropdown to assign security groups to a location or department.
 *
 * Props:
 *   entityId       - ID of the location or department
 *   assignedGroups - array of { groupId, groupName } currently assigned
 *   allGroups      - array of { id, name } for all security groups
 *   onSave         - async (entityId, groupIds[]) => void
 *   t              - theme object
 *   darkMode       - boolean
 */
export default function GroupAccessEditor({
  entityId,
  assignedGroups,
  allGroups,
  onSave,
  t,
  darkMode,
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dropdownRef = useRef(null);

  // Sync selected state when assignedGroups changes
  useEffect(() => {
    setSelected(new Set((assignedGroups || []).map((g) => g.groupId)));
    setDirty(false);
  }, [assignedGroups, entityId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        // Reset to saved state if not saved
        if (dirty) {
          setSelected(new Set((assignedGroups || []).map((g) => g.groupId)));
          setDirty(false);
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, dirty, assignedGroups]);

  const toggle = (groupId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(entityId, Array.from(selected));
      setDirty(false);
      setOpen(false);
    } catch (err) {
      console.error("Failed to save access:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearAll = async () => {
    setSaving(true);
    try {
      await onSave(entityId, []);
      setSelected(new Set());
      setDirty(false);
      setOpen(false);
    } catch (err) {
      console.error("Failed to clear access:", err);
    } finally {
      setSaving(false);
    }
  };

  const isRestricted = assignedGroups && assignedGroups.length > 0;
  const groupNames = (assignedGroups || []).map((g) => g.groupName);

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title={
          isRestricted
            ? `Restricted to: ${groupNames.join(", ")}`
            : "Open to all groups — click to restrict"
        }
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 8,
          border: `1px solid ${isRestricted ? t.accent + "50" : t.border}`,
          background: isRestricted
            ? t.accentSoft
            : "transparent",
          color: isRestricted ? t.accent : t.textDim,
          fontSize: 10.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
          transition: "all 0.2s",
        }}
      >
        <ShieldIcon size={11} />
        {isRestricted ? (
          <>
            {groupNames.length <= 2
              ? groupNames.join(", ")
              : `${groupNames[0]} +${groupNames.length - 1}`}
          </>
        ) : (
          "All Groups"
        )}
        <ChevronDown />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 200,
            minWidth: 260,
            background: darkMode ? "#1a1d23" : "#ffffff",
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            boxShadow: darkMode
              ? "0 12px 40px rgba(0,0,0,0.5)"
              : "0 12px 40px rgba(0,0,0,0.15)",
            overflow: "hidden",
            animation: "fadeIn 0.15s ease",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 14px 8px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldIcon size={13} />
              <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                Group Access
              </span>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                if (dirty) {
                  setSelected(
                    new Set((assignedGroups || []).map((g) => g.groupId))
                  );
                  setDirty(false);
                }
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: t.textDim,
                display: "flex",
                padding: 2,
              }}
            >
              <XIcon size={13} />
            </button>
          </div>

          {/* Info text */}
          <div
            style={{
              padding: "8px 14px 4px",
              fontSize: 10.5,
              color: t.textMuted,
              lineHeight: 1.4,
            }}
          >
            {selected.size === 0
              ? "No restrictions — all authenticated users can access this."
              : `Only users in the selected group${selected.size > 1 ? "s" : ""} will have access.`}
          </div>

          {/* Group list */}
          <div
            style={{
              padding: "6px 6px",
              maxHeight: 240,
              overflowY: "auto",
            }}
          >
            {allGroups.map((group) => {
              const isChecked = selected.has(group.id);
              return (
                <div
                  key={group.id}
                  onClick={() => toggle(group.id)}
                  className="folder-select-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: isChecked ? t.text : t.textMuted,
                    background: isChecked ? t.accentSoft : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 5,
                      border: `1.5px solid ${isChecked ? t.accent : darkMode ? "#3a3f47" : "#ccc7bd"}`,
                      background: isChecked ? t.accent : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {isChecked && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ flex: 1 }}>{group.name}</span>
                  {group.name === "Administrator" && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: darkMode
                          ? "rgba(210,153,34,0.12)"
                          : "rgba(180,83,9,0.08)",
                        color: t.warn,
                      }}
                    >
                      Always
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div
            style={{
              padding: "8px 10px",
              borderTop: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
            }}
          >
            {selected.size > 0 ? (
              <button
                onClick={handleClearAll}
                disabled={saving}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.error,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  padding: "4px 6px",
                  opacity: saving ? 0.5 : 1,
                }}
              >
                Remove All
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{
                background:
                  dirty
                    ? darkMode
                      ? `linear-gradient(135deg,${t.accent},${t.accentDark})`
                      : t.accent
                    : darkMode
                      ? "#2a2e35"
                      : "#e6e2da",
                color: dirty ? "#fff" : t.textDim,
                border: "none",
                borderRadius: 8,
                padding: "6px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: dirty ? "pointer" : "default",
                fontFamily: "inherit",
                opacity: saving ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
