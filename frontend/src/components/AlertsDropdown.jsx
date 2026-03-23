import { useState, useEffect } from "react";
import * as api from "../api";
import { BellIcon, XIcon, TrashIcon, MapPinIcon, LayersIcon, FolderClosedIcon } from "./Icons";
import { getTheme } from "../theme";
import { useSocket } from "../hooks/useSocket";

export default function AlertsDropdown({ darkMode, onNavigate, currentUserId, onShowToast }) {
  const t = getTheme(darkMode);
  const [showDropdown, setShowDropdown] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotificationCreated = (data) => {
    const notification = data.notification || data;
    
    // For CHT notifications, only show if it's for the current user
    const isCHT = notification.type === 'cht_inquiry_assigned' || notification.type === 'cht_inquiry_updated';
    if (isCHT && data.userId && currentUserId && data.userId !== currentUserId) {
      return;
    }
    
    // Add notification with proper ID
    const newAlert = {
      ...notification,
      id: notification.id || `cht-${Date.now()}`,
      created_at: notification.created_at || notification.createdAt || new Date().toISOString(),
      read_at: null,
    };
    
    setAlerts((prev) => {
      // Avoid duplicates
      const exists = prev.some((a) => a.id === newAlert.id);
      if (exists) return prev;
      return [newAlert, ...prev.slice(0, 99)];
    });
    setUnreadCount((prev) => prev + 1);

    // Show Toast notification for CHT
    if (isCHT && onShowToast) {
      onShowToast({
        title: notification.title || 'Credit Hold Tracker',
        message: notification.message,
        type: 'cht',
        duration: 6000,
      });
    }
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
      // Merge database notifications with real-time notifications
      // Real-time notifications (CHT) don't have an id field from the database
      // We use the id or a composite key to avoid duplicates
      setAlerts((prev) => {
        const dbAlerts = data || [];
        const rtAlerts = prev.filter((a) => !a.notification_type && !a.file_name); // Real-time CHT alerts
        const existingIds = new Set(dbAlerts.map((a) => a.id));
        const uniqueRtAlerts = rtAlerts.filter((a) => !existingIds.has(a.id));
        return [...uniqueRtAlerts, ...dbAlerts].slice(0, 100);
      });
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
    const isCHT = alert.type === 'cht_inquiry_assigned' || alert.type === 'cht_inquiry_updated';
    
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, read_at: a.read_at || new Date().toISOString() } : a));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    
    if (!isCHT && alert.id) {
      try {
        await api.markNotificationRead(alert.id);
      } catch (err) {
        console.error("Failed to mark alert as read:", err);
      }
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

  const getAlertType = (alert) => {
    // CHT notifications
    if (alert.type === 'cht_inquiry_assigned' || alert.type === 'cht_inquiry_updated') {
      return 'cht';
    }
    // DDA file upload notifications
    return 'dda';
  };

  const renderCHTIcon = () => (
    <div style={{
      width: 28,
      height: 28,
      borderRadius: 6,
      background: "linear-gradient(135deg, #f59e0b, #d97706)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: 10,
      fontWeight: 800,
    }}>
      CHT
    </div>
  );

  const renderDDAIcon = (alert) => {
    const iconColor = t.accent;
    if (alert.notification_type === 'location_upload' || alert.item_type === 'location') {
      return <MapPinIcon size={16} style={{ color: iconColor }} />;
    }
    if (alert.notification_type === 'department_upload' || alert.item_type === 'department') {
      return <LayersIcon size={16} style={{ color: iconColor }} />;
    }
    return <FolderClosedIcon size={16} style={{ color: iconColor }} />;
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
        title="Notifications"
      >
        <BellIcon size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: "#dc2626",
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
            width: 400,
            maxHeight: 500,
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
            <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Notifications</span>
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

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                Loading...
              </div>
            ) : alerts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: t.textMuted }}>
                <BellIcon size={32} />
                <div style={{ marginTop: 8, fontSize: 13 }}>No notifications</div>
              </div>
            ) : (
              alerts.map((alert, idx) => {
                const alertType = getAlertType(alert);
                const isCHT = alertType === 'cht';
                
                return (
                  <div
                    key={alert.id || idx}
                    onClick={() => handleAlertClick(alert)}
                    style={{
                      padding: "12px 14px",
                      borderBottom: `1px solid ${t.border}`,
                      background: alert.read_at ? "transparent" : darkMode ? "rgba(88,166,255,0.05)" : "rgba(88,166,255,0.03)",
                      opacity: alert.read_at ? 0.7 : 1,
                      cursor: "pointer",
                    }}
                  >
                    {isCHT ? (
                      // CHT Notification
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ flexShrink: 0 }}>
                          {renderCHTIcon()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#f59e0b", marginBottom: 2 }}>
                            Credit Hold Tracker
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                            {alert.title || "Inquiry Updated"}
                          </div>
                          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                            {alert.message}
                          </div>
                          <div style={{ fontSize: 10, color: t.textDim, marginTop: 4 }}>
                            {formatDate(alert.created_at || alert.createdAt)}
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
                            flexShrink: 0,
                          }}
                          title="Dismiss"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ) : (
                      // DDA File Upload Notification
                      <div style={{ display: "flex", gap: 10 }}>
                        <div style={{ color: t.accent, marginTop: 2, flexShrink: 0 }}>
                          {renderDDAIcon(alert)}
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
                            flexShrink: 0,
                          }}
                          title="Dismiss"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
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
                Clear read notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}