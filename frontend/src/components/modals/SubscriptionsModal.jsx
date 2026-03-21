import { useEffect, useState } from "react";
import * as api from "../api";
import { XIcon, BellIcon, MapPinIcon, LayersIcon, FolderClosedIcon } from "./Icons";

export default function SubscriptionsModal({ show, onClose, subscriptions, setSubscriptions, t, darkMode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show) {
      setLoading(true);
      api.getSubscriptionsWithDetails()
        .then((data) => {
          setSubscriptions(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [show]);

  if (!show) return null;

  const handleUnsubscribe = async (subId) => {
    try {
      await api.deleteSubscription(subId);
      setSubscriptions((prev) => prev.filter((s) => s.id !== subId));
    } catch (err) {
      console.error("Failed to unsubscribe:", err);
    }
  };

  const getTypeIcon = (type) => {
    if (type === "location") return <MapPinIcon size={16} />;
    if (type === "department") return <LayersIcon size={16} />;
    return <FolderClosedIcon size={16} />;
  };

  const getTypeLabel = (type) => {
    if (type === "location") return "Location";
    if (type === "department") return "Department";
    return "Folder";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 500,
          maxHeight: "80vh",
          overflow: "hidden",
          boxShadow: darkMode ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(0,0,0,0.2)",
          animation: "modalIn 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${t.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ color: t.accent }}>
              <BellIcon size={20} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>My Subscriptions</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: t.textMuted,
              padding: 4,
              display: "flex",
            }}
          >
            <XIcon size={18} />
          </button>
        </div>
        <div style={{ padding: "12px 20px", maxHeight: "calc(80vh - 60px)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted }}>
              Loading...
            </div>
          ) : subscriptions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: t.textMuted }}>
              <BellIcon size={32} />
              <p style={{ marginTop: 12, fontSize: 13 }}>No subscriptions yet</p>
              <p style={{ fontSize: 12, color: t.textDim }}>
                Subscribe to locations, departments, or folders to get notified when new files are uploaded.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
                    borderRadius: 10,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <div style={{ color: t.accent }}>{getTypeIcon(sub.subscription_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{sub.item_name}</div>
                    <div style={{ fontSize: 11, color: t.textDim }}>
                      {getTypeLabel(sub.subscription_type)}
                      {sub.location_name && ` · ${sub.location_name}`}
                      {sub.department_name && ` / ${sub.department_name}`}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnsubscribe(sub.id)}
                    style={{
                      background: "transparent",
                      border: `1px solid ${t.border}`,
                      borderRadius: 6,
                      padding: "5px 12px",
                      fontSize: 11,
                      fontWeight: 500,
                      color: t.textMuted,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Unsubscribe
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}