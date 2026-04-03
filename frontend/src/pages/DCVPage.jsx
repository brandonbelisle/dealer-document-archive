import { useState, useEffect } from "react";
import { getTheme } from "../theme";
import { UsersIcon, MapPinIcon, BuildingIcon, MailIcon, PhoneIcon, ClockIcon, CreditCardIcon, FolderIcon, FileIcon, ChevronLeftIcon, ChevronRightIcon, WrenchIcon, CarIcon, SearchIcon } from "../components/Icons";
import * as api from "../api";

export default function DCVPage({ t, darkMode, selectedCustomer, setPage, setActiveFolderId, initialRepairOrderSlsId, setInitialRepairOrderSlsId, initialTab = "timeline" }) {
  const theme = getTheme(darkMode);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Timeline state
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotalPages, setTimelineTotalPages] = useState(1);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [timelineFilter, setTimelineFilter] = useState(null);
  
  // Service state
  const [repairOrders, setRepairOrders] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [servicePage, setServicePage] = useState(1);
  const [serviceTotalPages, setServiceTotalPages] = useState(1);
  const [serviceTotal, setServiceTotal] = useState(0);
  const [serviceFilter, setServiceFilter] = useState(null);
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedRepairOrder, setSelectedRepairOrder] = useState(null);
  const [vinDetails, setVinDetails] = useState(null);
  const [vinLoading, setVinLoading] = useState(false);
  
  const pageSize = 20;

  const customer = selectedCustomer;

  useEffect(() => {
    if (customer && activeTab === "timeline") {
      setTimelineLoading(true);
      api.getDcvCustomerTimeline(customer.id, timelinePage, pageSize, timelineFilter)
        .then((data) => {
          setTimeline(data.events || []);
          setTimelineTotal(data.total || 0);
          setTimelineTotalPages(data.totalPages || 1);
        })
        .catch(console.error)
        .finally(() => setTimelineLoading(false));
    }
  }, [customer, activeTab, timelinePage, timelineFilter]);

  useEffect(() => {
    if (customer && activeTab === "service") {
      setServiceLoading(true);
      api.getDcvRepairOrders(customer.id, servicePage, pageSize, serviceFilter, serviceSearch)
        .then((data) => {
          setRepairOrders(data.repairOrders || []);
          setServiceTotal(data.total || 0);
          setServiceTotalPages(data.totalPages || 1);
        })
        .catch(console.error)
        .finally(() => setServiceLoading(false));
    }
  }, [customer, activeTab, servicePage, serviceFilter, serviceSearch]);

  useEffect(() => {
    if (customer) {
      setTimelinePage(1);
      setServicePage(1);
      setSelectedRepairOrder(null);
      setVinDetails(null);
      setServiceSearch("");
    }
  }, [customer]);

  useEffect(() => {
    if (initialRepairOrderSlsId && customer && activeTab === "service" && repairOrders.length > 0) {
      const matchingRO = repairOrders.find(ro => ro.slsId === initialRepairOrderSlsId);
      if (matchingRO) {
        setSelectedRepairOrder(matchingRO);
        setInitialRepairOrderSlsId(null);
      }
    }
  }, [initialRepairOrderSlsId, customer, activeTab, repairOrders, setInitialRepairOrderSlsId]);

  useEffect(() => {
    setTimelinePage(1);
  }, [timelineFilter]);

  useEffect(() => {
    setServicePage(1);
  }, [serviceFilter]);

  useEffect(() => {
    setServicePage(1);
  }, [serviceSearch]);

  useEffect(() => {
    if (selectedRepairOrder && selectedRepairOrder.vin) {
      setVinLoading(true);
      api.getDcvVinLookup(selectedRepairOrder.vin)
        .then((data) => {
          setVinDetails(data);
        })
        .catch((err) => {
          console.error('[DCV] VIN lookup error:', err);
          setVinDetails({ error: 'Failed to decode VIN' });
        })
        .finally(() => setVinLoading(false));
    } else {
      setVinDetails(null);
    }
  }, [selectedRepairOrder]);

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

  const formatPhoneForTel = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 &&digits.startsWith("1")) {
      return `+${digits}`;
    }
    return `+1${digits}`;
  };

  const openGoogleMaps = (addr1, addr2, city, state, post) => {
    const parts = [addr1, addr2, city, state, post].filter(Boolean);
    if (parts.length === 0) return;
    const address = parts.join(", ");
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  };

  const tabs = [
    { id: "timeline", label: "Timeline" },
    { id: "service", label: "Service" },
    { id: "parts", label: "Parts" },
  ];

  const filterOptions = [
    { id: null, label: "All Time" },
    { id: "day", label: "Last 24 Hours" },
    { id: "month", label: "Last Month" },
    { id: "year", label: "Last Year" },
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

  const activeFilter = activeTab === "timeline" ? timelineFilter : serviceFilter;
  const setActiveFilter = activeTab === "timeline" ? setTimelineFilter : setServiceFilter;
  const activePage = activeTab === "timeline" ? timelinePage : servicePage;
  const setActivePage = activeTab === "timeline" ? setTimelinePage : setServicePage;
  const activeTotalPages = activeTab === "timeline" ? timelineTotalPages : serviceTotalPages;
  const activeTotal = activeTab === "timeline" ? timelineTotal : serviceTotal;
  const activeLoading = activeTab === "timeline" ? timelineLoading : serviceLoading;

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
              <div 
                onClick={() => openGoogleMaps(customer.addr1, customer.addr2, customer.city, customer.state, customer.post)}
                style={{ fontSize: 14, color: theme.text, lineHeight: 1.6, cursor: "pointer", textDecoration: "underline", textDecorationColor: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>
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
                      <a href={`tel:${formatPhoneForTel(customer.phoneHome)}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.phoneHome}
                      </a>
                    </div>
                  )}
                  {customer.phoneWork && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Work:</span>
                      <a href={`tel:${formatPhoneForTel(customer.phoneWork)}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.phoneWork}
                      </a>
                    </div>
                  )}
                  {customer.phoneOther && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Other:</span>
                      <a href={`tel:${formatPhoneForTel(customer.phoneOther)}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.phoneOther}
                      </a>
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
                      <a href={`mailto:${customer.emailHome}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.emailHome}
                      </a>
                    </div>
                  )}
                  {customer.emailWork && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Work:</span>
                      <a href={`mailto:${customer.emailWork}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.emailWork}
                      </a>
                    </div>
                  )}
                  {customer.emailOther && (
                    <div style={{ fontSize: 13, color: theme.text }}>
                      <span style={{ color: theme.textMuted, marginRight: 8 }}>Other:</span>
                      <a href={`mailto:${customer.emailOther}`} style={{ color: "#0891b2", textDecoration: "none" }}>
                        {customer.emailOther}
                      </a>
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
                  <div 
                    onClick={() => openGoogleMaps(customer.billAddr1, customer.billAddr2, customer.billCity, customer.billState, customer.billPost)}
                    style={{ fontSize: 13, color: theme.text, cursor: "pointer", textDecoration: "underline", textDecorationColor: darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}>
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
              {/* Timeline Tab */}
              {activeTab === "timeline" && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {filterOptions.map((filter) => (
                        <button
                          key={filter.id || "all"}
                          onClick={() => setTimelineFilter(filter.id)}
                          style={{
                            padding: "6px 12px",
                            background: timelineFilter === filter.id ? "#8b5cf6" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${timelineFilter === filter.id ? "#8b5cf6" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                            borderRadius: 6,
                            color: timelineFilter === filter.id ? "#fff" : theme.textMuted,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    
                    {timelineTotal > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: theme.textMuted }}>
                          {((timelinePage - 1) * pageSize) + 1}-{Math.min(timelinePage * pageSize, timelineTotal)} of {timelineTotal}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => setTimelinePage(Math.max(1, timelinePage - 1))}
                            disabled={timelinePage === 1}
                            style={{
                              padding: 6,
                              background: timelinePage === 1 ? "transparent" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                              borderRadius: 4,
                              color: timelinePage === 1 ? theme.textMuted : theme.text,
                              cursor: timelinePage === 1 ? "not-allowed" : "pointer",
                              opacity: timelinePage === 1 ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronLeftIcon />
                          </button>
                          <span style={{ fontSize: 12, color: theme.text, padding: "0 8px" }}>
                            Page {timelinePage} of {timelineTotalPages}
                          </span>
                          <button
                            onClick={() => setTimelinePage(Math.min(timelineTotalPages, timelinePage + 1))}
                            disabled={timelinePage === timelineTotalPages}
                            style={{
                              padding: 6,
                              background: timelinePage === timelineTotalPages ? "transparent" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                              borderRadius: 4,
                              color: timelinePage === timelineTotalPages ? theme.textMuted : theme.text,
                              cursor: timelinePage === timelineTotalPages ? "not-allowed" : "pointer",
                              opacity: timelinePage === timelineTotalPages ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronRightIcon />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

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
                        {timelineFilter ? `No Activity in ${filterOptions.find(f => f.id === timelineFilter)?.label || "Selected Period"}` : "No Activity Yet"}
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

              {/* Service Tab */}
              {activeTab === "service" && !selectedRepairOrder && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Search repair orders..."
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "10px 12px 10px 36px",
                          background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                          border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                          borderRadius: 8,
                          color: theme.text,
                          fontSize: 14,
                          fontFamily: "inherit",
                          outline: "none",
                          transition: "all 0.15s",
                        }}
                      />
                      <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: theme.textMuted, pointerEvents: "none" }}>
                        <SearchIcon size={16} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {filterOptions.map((filter) => (
                        <button
                          key={filter.id || "all"}
                          onClick={() => setServiceFilter(filter.id)}
                          style={{
                            padding: "6px 12px",
                            background: serviceFilter === filter.id ? "#f59e0b" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                            border: `1px solid ${serviceFilter === filter.id ? "#f59e0b" : darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                            borderRadius: 6,
                            color: serviceFilter === filter.id ? "#fff" : theme.textMuted,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s",
                          }}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                    
                    {serviceTotal > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 12, color: theme.textMuted }}>
                          {((servicePage - 1) * pageSize) + 1}-{Math.min(servicePage * pageSize, serviceTotal)} of {serviceTotal}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => setServicePage(Math.max(1, servicePage - 1))}
                            disabled={servicePage === 1}
                            style={{
                              padding: 6,
                              background: servicePage === 1 ? "transparent" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                              borderRadius: 4,
                              color: servicePage === 1 ? theme.textMuted : theme.text,
                              cursor: servicePage === 1 ? "not-allowed" : "pointer",
                              opacity: servicePage === 1 ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronLeftIcon />
                          </button>
                          <span style={{ fontSize: 12, color: theme.text, padding: "0 8px" }}>
                            Page {servicePage} of {serviceTotalPages}
                          </span>
                          <button
                            onClick={() => setServicePage(Math.min(serviceTotalPages, servicePage + 1))}
                            disabled={servicePage === serviceTotalPages}
                            style={{
                              padding: 6,
                              background: servicePage === serviceTotalPages ? "transparent" : darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                              border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                              borderRadius: 4,
                              color: servicePage === serviceTotalPages ? theme.textMuted : theme.text,
                              cursor: servicePage === serviceTotalPages ? "not-allowed" : "pointer",
                              opacity: servicePage === serviceTotalPages ? 0.5 : 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <ChevronRightIcon />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {serviceLoading ? (
                    <div style={{ textAlign: "center", padding: 60, color: theme.textMuted }}>
                      Loading repair orders...
                    </div>
                  ) : repairOrders.length === 0 ? (
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
                        <WrenchIcon size={28} style={{ color: "#f59e0b" }} />
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
                        {serviceFilter ? `No Repair Orders in ${filterOptions.find(f => f.id === serviceFilter)?.label || "Selected Period"}` : "No Repair Orders"}
                      </div>
                      <div style={{ fontSize: 13, color: theme.textMuted }}>
                        Repair orders will appear here when service records are synced from your DMS.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {repairOrders.map((ro) => (
                        <div
                          key={ro.id}
                          onClick={() => setSelectedRepairOrder(ro)}
                          style={{
                            display: "flex",
                            gap: 16,
                            padding: 16,
                            background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                            borderRadius: 12,
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          <div style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            background: "rgba(245,158,11,0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#f59e0b",
                            flexShrink: 0,
                          }}>
                            <WrenchIcon size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 4 }}>
                              Repair Order: {ro.slsId}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8, fontSize: 13, color: theme.textMuted }}>
                              {ro.vin && <span>VIN: {ro.vin}</span>}
                              {ro.tag && <span>Tag: {ro.tag}</span>}
                              {ro.odomIn && <span>Odom In: {ro.odomIn?.toLocaleString()}</span>}
                              {ro.odomOut && <span>Odom Out: {ro.odomOut?.toLocaleString()}</span>}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: darkMode ? "#6b7280" : "#9ca3af" }}>
                              {ro.locationName && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <MapPinIcon size={12} />
                                  {ro.locationName}
                                </span>
                              )}
                              {ro.folderName && (
                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                  <FolderIcon size={12} />
                                  {ro.folderName}
                                </span>
                              )}
                              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <ClockIcon size={12} />
                                {formatDate(ro.dateCreate)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ServiceTab - Repair Order Detail View */}
              {activeTab === "service" && selectedRepairOrder && (
                <div>
                  <button
                    onClick={() => setSelectedRepairOrder(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      background: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
                      borderRadius: 8,
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      marginBottom: 20,
                      transition: "all 0.15s",
                    }}
                  >
                    <ChevronLeftIcon />
                    <span>Back to Repair Orders</span>
                  </button>

                  <div style={{
                    display: "flex",
                    gap: 16,
                    padding: 20,
                    background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                    borderRadius: 12,
                    border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(245,158,11,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                      flexShrink: 0,
                    }}>
                      <WrenchIcon size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, marginBottom: 8 }}>
                        Repair Order: {selectedRepairOrder.slsId}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: theme.textMuted }}>
                        {selectedRepairOrder.tag && <span>Tag: <strong style={{ color: theme.text }}>{selectedRepairOrder.tag}</strong></span>}
                        {selectedRepairOrder.locationName && <span>Location: <strong style={{ color: theme.text }}>{selectedRepairOrder.locationName}</strong></span>}
                        <span>Created: <strong style={{ color: theme.text }}>{formatDate(selectedRepairOrder.dateCreate)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 16,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      padding: 16,
                      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      borderRadius: 12,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Odometer In
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
                        {selectedRepairOrder.odomIn ? selectedRepairOrder.odomIn.toLocaleString() : "N/A"}
                      </div>
                    </div>
                    <div style={{
                      padding: 16,
                      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      borderRadius: 12,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        Odometer Out
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>
                        {selectedRepairOrder.odomOut ? selectedRepairOrder.odomOut.toLocaleString() : "N/A"}
                      </div>
                    </div>
                  </div>

                  {selectedRepairOrder.folderId && (
                    <button
                      onClick={() => {
                        setActiveFolderId(selectedRepairOrder.folderId);
                        setPage("folder-detail");
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "12px 20px",
                        background: "linear-gradient(135deg, #0891b2, #0e7490)",
                        border: "none",
                        borderRadius: 8,
                        color: "white",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        marginBottom: 20,
                        transition: "all 0.15s",
                      }}
                    >
                      <FolderIcon size={16} />
                      <span>View Folder: {selectedRepairOrder.folderName || "View Folder"}</span>
                    </button>
                  )}

                  {selectedRepairOrder.vin && (
                    <div style={{
                      padding: 20,
                      background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                      borderRadius: 12,
                      border: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: "rgba(139,92,246,0.15)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#8b5cf6",
                        }}>
                          <CarIcon size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                            Vehicle Information
                          </div>
                          <div style={{ fontSize: 12, color: theme.textMuted, fontFamily: "monospace" }}>
                            VIN: {selectedRepairOrder.vin}
                          </div>
                        </div>
                      </div>

                      {vinLoading ? (
                        <div style={{ textAlign: "center", padding: 20, color: theme.textMuted }}>
                          Looking up VIN...
                        </div>
                      ) : vinDetails ? (
                        vinDetails.error && vinDetails.error !== "0" ? (
                          <div style={{ fontSize: 13, color: theme.textMuted, textAlign: "center", padding: 20 }}>
                            {vinDetails.error || "Unable to decode VIN"}
                          </div>
                        ) : (
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 12,
                          }}>
                            {vinDetails.modelYear && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Year
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.modelYear}
                                </div>
                              </div>
                            )}
                            {vinDetails.make && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Make
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.make}
                                </div>
                              </div>
                            )}
                            {vinDetails.model && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Model
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.model}
                                </div>
                              </div>
                            )}
                            {vinDetails.trim && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Trim
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.trim}
                                </div>
                              </div>
                            )}
                            {vinDetails.bodyClass && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Body Class
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.bodyClass}
                                </div>
                              </div>
                            )}
                            {vinDetails.vehicleType && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Vehicle Type
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.vehicleType}
                                </div>
                              </div>
                            )}
                            {vinDetails.doors && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Doors
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.doors}
                                </div>
                              </div>
                            )}
                            {vinDetails.engineModel && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Engine
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.engineModel}
                                </div>
                              </div>
                            )}
                            {vinDetails.engineCylinders && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Cylinders
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.engineCylinders}
                                </div>
                              </div>
                            )}
                            {vinDetails.displacementL && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Displacement
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.displacementL}L
                                </div>
                              </div>
                            )}
                            {vinDetails.fuelTypePrimary && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Fuel Type
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.fuelTypePrimary}
                                </div>
                              </div>
                            )}
                            {vinDetails.manufacturer && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Manufacturer
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.manufacturer}
                                </div>
                              </div>
                            )}
                            {vinDetails.plantCountry && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: darkMode ? "#6b7280" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                                  Plant Country
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: theme.text }}>
                                  {vinDetails.plantCountry}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      ) : null}
                    </div>
                  )}
                </div>
              )}

              {/* Parts Tab */}
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