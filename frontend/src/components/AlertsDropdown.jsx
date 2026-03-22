import { useState, useEffect } from "react";
import * as api from "../api";
import { BellIcon, XIcon, TrashIcon, MapPinIcon, LayersIcon, FolderClosedIcon } from "./Icons";
import { getTheme } from "../theme";
import { useSocket } from "../hooks/useSocket";

export default function AlertsDropdown({ darkMode, onNavigate }) {
  const t = getTheme(darkMode);
  const [showDropdown, setShowDropdown] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotificationCreated = (data) => {
    const notification = data.notification || data;
    setAlerts((prev) => [{ ...notification, read_at: null }, ...prev.slice(0, 99)]);
    setUnreadCount((prev) => prev + 1);
  };

  useSocket({
    onNotificationCreated: handleNotificationCreated,
  });

  useEffect(() => {
    if (showDropdown) {
      loadAlerts();
    }
  }, [showDropdown]);

  useEffect(() => {
    loadUnreadCount();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(false);
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const data = await api.getUnreadNotificationCount();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setAlerts((prev) => prev.map((a) => ({ ...a, read_at: a.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const deleteAlert = async (e, alertId) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const clearAll = async () => {
    try {
      await api.clearReadNotifications();
      setAlerts((prev) => prev.filter((a) => !a.read_at));
    } catch (err) {
      console.error("Failed to clear alerts:", err);
    }
  };

  const handleAlertClick = async (alert) => {
    try {
      await api.markNotificationRead(alert.id);
      setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, read_at: new Date().toISOString() } : a));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark alert as read:", err);
    }
    
    if (onNavigate) {
      onNavigate(alert);
    }
    setShowDropdown(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type) => {
    if (type === "location") return <MapPinIcon size={14} />;
    if (type === "department") return <LayersIcon size={14} />;
    return <FolderClosedIcon size={14} />;
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: t.textMuted,
          padding: "6px 8px",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          position: "relative",
        }}
        title="Alerts"
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: t.error,
              color: "white",
              fontSize: 10,
              fontWeight: 700,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxHeight: 480,
            overflow: "hidden",
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 12,
            boxShadow: darkMode ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.15)",
            animation: "fadeIn 0.15s ease",
            zIndex: 200,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BellIcon size={16} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Alerts</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 6px",
                    borderRadius: 8,
                    background: t.accentSoft,
                    color: t.accent,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: t.accent,
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowDropdown(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.textMuted,
                  padding: 4,
                  display: "flex",
                }}
              >
                <XIcon size={16} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                Loading...
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                <BellIcon size={32} />
                <div style={{ marginTop: 8, fontSize: 13 }}>No alerts yet</div>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleAlertClick(alert)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: `1px solid ${t.border}`,
                    background: alert.read_at ? "transparent" : darkMode ? "rgba(88,166,255,0.05)" : "rgba(88,166,255,0.03)",
                    opacity: alert.read_at ? 0.7 : 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <div style={{ color: t.accent, marginTop: 2, flexShrink: 0 }}>
                    {getTypeIcon(alert.item_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                      {alert.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                      Uploaded by {alert.created_by_name}
                    </div>
                    <div style={{ fontSize: 10, color: t.textDim, marginTop: 4 }}>
                      {alert.item_name} • {formatDate(alert.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => deleteAlert(e, alert.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: t.textMuted,
                      padding: 4,
                      display: "flex",
                      flexShrink: 0,
                    }}
                    title="Delete alert"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {alerts.some((a) => a.read_at) && (
            <div
              style={{
                padding: "10px 14px",
                borderTop: `1px solid ${t.border}`,
                textAlign: "center",
              }}
            >
              <button
                onClick={clearAll}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: t.textMuted,
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: "inherit",
                }}
              >
                Clear read alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}