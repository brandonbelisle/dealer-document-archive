import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { ShieldIcon, XIcon, ChevronDown, CheckIcon } from "./Icons";

/**
 * GroupAccessEditor — inline dropdown to assign security groups to a location or department.
 *
 * Uses a React Portal so the dropdown renders at document.body level,
 * completely escaping any parent overflow:hidden / overflow:auto clipping.
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
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sync selected state when assignedGroups changes
  useEffect(() => {
    setSelected(new Set((assignedGroups || []).map((g) => g.groupId)));
    setDirty(false);
  }, [assignedGroups, entityId]);

  // Recalculate position from the trigger button
  const recalcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropW = 260;
    // Align right edge of dropdown to right edge of trigger
    let left = rect.right - dropW;
    if (left < 8) left = 8;
    if (left + dropW > window.innerWidth - 8) left = window.innerWidth - dropW - 8;

    // Check if dropdown would go below viewport — if so, show above
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const dropEstimatedH = 380; // rough max height of the dropdown
    let top;
    if (spaceBelow < dropEstimatedH && rect.top > dropEstimatedH) {
      // Show above the trigger
      top = rect.top - dropEstimatedH - 6;
      if (top < 8) top = 8;
    } else {
      // Show below the trigger
      top = rect.bottom + 6;
    }

    setPos({ top, left });
  }, []);

  // When open changes to true, calculate position immediately
  useEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    recalcPos();
  }, [open, recalcPos]);

  // Re-position on scroll (any scrollable ancestor) and window resize
  useEffect(() => {
    if (!open) return;
    const handler = () => recalcPos();
    // Use capture:true to catch scroll on any ancestor
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open, recalcPos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      const inTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      if (!inDropdown && !inTrigger) {
        setOpen(false);
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

  // The dropdown content rendered via portal into document.body
  const dropdownContent = open && pos ? createPortal(
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 99999,
        width: 260,
        background: darkMode ? "#1a1d23" : "#ffffff",
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        boxShadow: darkMode
          ? "0 12px 40px rgba(0,0,0,0.6)"
          : "0 12px 40px rgba(0,0,0,0.18)",
        animation: "fadeIn 0.15s ease",
        fontFamily: "'Geist','DM Sans',system-ui,sans-serif",
        color: t.text,
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isChecked ? t.accentSoft : (darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)");
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isChecked ? t.accentSoft : "transparent";
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
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
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
          background: isRestricted ? t.accentSoft : "transparent",
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

      {/* Portal-rendered dropdown */}
      {dropdownContent}
    </div>
  );
}
