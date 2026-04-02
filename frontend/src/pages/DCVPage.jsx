import { useState, useEffect } from "react";
import { getTheme } from "../theme";
import { UsersIcon, MapPinIcon, BuildingIcon, MailIcon, PhoneIcon, ClockIcon, CreditCardIcon, FolderIcon, FileIcon } from "../components/Icons";
import * as api from "../api";

export default function DCVPage({ t, darkMode, selectedCustomer }) {
  const theme = getTheme(darkMode);
  const [activeTab, setActiveTab] = useState("timeline");
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const customer = selectedCustomer;

  useEffect(() => {
    if (customer && activeTab === "timeline") {
      setTimelineLoading(true);
      api.getDcvCustomerTimeline(customer.id)
        .then(setTimeline)
        .catch(console.error)
        .finally(() => setTimelineLoading(false));
    }
  }, [customer, activeTab]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "N/A";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAddress = (addr1, addr2, city, state, post) => {
    const parts = [addr1, addr2, city, state, post].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const tabs = [
    { id: "timeline", label: "Timeline" },
    { id: "service", label: "Service" },
    { id: "parts", label: "Parts" },
  ];

  const getEventIcon = (type) => {
    switch (type) {
      case "folder_created":
        return <FolderIcon size={16} />;
      case "file_uploaded":
        return <FileIcon size={16} />;
      default:
        return <ClockIcon size={16} />;
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case "folder_created":
        return "#0891b2";
      case "file_uploaded":
        return "#10b981";
      default:
        return "#8b5cf6";
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 55px)", marginTop: 55, background: darkMode ? "#0d1117" : "#f6f8fa" }}>
      <div style={{
        width: 360,
        minWidth: 360,
        borderRight: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        background: darkMode ? "rgba(15,17,20,0.95)" : "#fff",
        overflowY: "auto",
        flexShrink: 0,
      }}>
        {customer ? (
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {customer.name?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
                  {customer.name || "Unknown Customer"}
                </div>
                <div style={{ fontSize: 13, color: theme.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                  <CreditCardIcon size={12} />
                  <span>{customer.cusId || "No ID"}</span>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Customer ID
              </div>
              <div style={{ fontSize: 14, color: theme.text, fontFamily: "monospace", background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)", padding: "8px 12px", borderRadius: 6, border: `1px solid ${theme.border}` }}>
                {customer.cusId || "N/A"}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                Name
              </div>
              <div style={{ fontSize: 14, color: theme.text }}>
                {customer.name || "N/A"}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                <MapPinIcon size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                Address
              </div>
              <div style={{ fontSize: 14, color: theme.text, lineHeight: 1.6 }}>
                {formatAddress(customer.addr1, customer.addr2, customer.city, customer.state, customer.post)}
              </div>
              {customer.county && (
                <div style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
                  {customer.county}
                </div>
              )}
            </div>

            {(customer.phoneHome || customer.phoneWork || customer.phoneOther) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  <PhoneIcon size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Phone Numbers
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {customer.phoneHome && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Home:</span>
                      {customer.phoneHome}
                    </div>
                  )}
                  {customer.phoneWork && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Work:</span>
                      {customer.phoneWork}
                    </div>
                  )}
                  {customer.phoneOther && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Other:</span>
                      {customer.phoneOther}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(customer.emailHome || customer.emailWork || customer.emailOther) && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  <MailIcon size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Email
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {customer.emailHome && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Home:</span>
                      {customer.emailHome}
                    </div>
                  )}
                  {customer.emailWork && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Work:</span>
                      {customer.emailWork}
                    </div>
                  )}
                  {customer.emailOther && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Other:</span>
                      {customer.emailOther}
                    </div>
                  )}
                </div>
              </div>
            )}

            {customer.billCusId && customer.billCusId !== customer.cusId && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                  <BuildingIcon size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  Billing Address
                </div>
                <div style={{ fontSize: 13, color: theme.text, marginBottom: 4 }}>
                  ID: {customer.billCusId}
                </div>
                {customer.billAddr1 && (
                  <div style={{ fontSize: 13, color: theme.text }}>
                    {formatAddress(customer.billAddr1, customer.billAddr2, customer.billCity, customer.billState, customer.billPost)}
                  </div>
                )}
              </div>
            )}

            <div style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: `1px solid ${theme.border}`,
            }}>
              <div style={{ fontSize: 11, color: theme.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <ClockIcon size={12} />
                <span>Created: {formatDate(customer.dateCreate)}</span>
              </div>
              {customer.dateUpdate && (
                <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <ClockIcon size={12} />
                  <span>Updated: {formatDate(customer.dateUpdate)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: 40,
            textAlign: "center",
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: darkMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}>
              <UsersIcon size={28} style={{ color: "#8b5cf6" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
              No Customer Selected
            </div>
            <div style={{ fontSize: 13, color: theme.textMuted, maxWidth: 240 }}>
              Search for a customer using the search bar above to view their details.
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {customer ? (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              padding: "0 24px",
              background: darkMode ? "rgba(15,17,20,0.95)" : "#fff",
            }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "16px 20px",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.id ? `2px solid #8b5cf6` : "2px solid transparent",
                    color: activeTab === tab.id ? "#8b5cf6" : theme.textMuted,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              {activeTab === "timeline" && (
                <div>
                  {timelineLoading ? (
                    <div style={{ textAlign: "center", padding: 60, color: theme.textMuted }}>
                      Loading timeline...
                    </div>
                  ) : timeline.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 60 }}>
                      <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: darkMode ? "rgba(139,92,246,0.1)" : "rgba(139,92,246,0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                      }}>
                        <ClockIcon size={28} style={{ color: "#8b5cf6" }} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
                        No Activity Yet
                      </div>
                      <div style={{ fontSize: 13, color: theme.textMuted }}>
                        Timeline events will appear here when folders or files are created for this customer.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {timeline.map((event, index) => (
                        <div
                          key={`${event.type}-${event.id}-${index}`}
                          style={{
                            display: "flex",
                            gap: 16,
                            padding: 16,
                            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                            borderRadius: 12,
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                          }}
                        >
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: `${getEventColor(event.type)}15`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: getEventColor(event.type),
                            flexShrink: 0,
                          }}>
                            {getEventIcon(event.type)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                              {event.title}
                            </div>
                            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 8 }}>
                              {event.description}
                            </div>
                            <div style={{ fontSize: 11, color: darkMode ? "#6b7280" : "#9ca3af", display: "flex", alignItems: "center", gap: 4 }}>
                              <ClockIcon size={12} />
                              {formatDate(event.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "service" && (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: darkMode ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <FolderIcon size={28} style={{ color: "#f59e0b" }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
                    Service History
                  </div>
                  <div style={{ fontSize: 13, color: theme.textMuted }}>
                    Service records will appear here once connected to your DMS.
                  </div>
                </div>
              )}

              {activeTab === "parts" && (
                <div style={{ textAlign: "center", padding: 60 }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: darkMode ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}>
                    <FolderIcon size={28} style={{ color: "#10b981" }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
                    Parts History
                  </div>
                  <div style={{ fontSize: 13, color: theme.textMuted }}>
                    Parts records will appear here once connected to your DMS.
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: 500,
          }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 16,
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <span style={{ color: "white", fontSize: 28, fontWeight: 800 }}>DCV</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", color: theme.text }}>
              Dealer Customer Vision
            </h1>
            <p style={{ fontSize: 15, color: theme.textMuted, margin: 0, textAlign: "center", maxWidth: 500 }}>
              Search for a customer in the navbar above to view their information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}