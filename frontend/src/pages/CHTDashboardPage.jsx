export default function CHTDashboardPage({ loggedInUser, t, darkMode }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 54px)",
      padding: 40,
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 20,
        background: "linear-gradient(135deg,#f59e0b,#d97706)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: 24,
        fontWeight: 800,
        marginBottom: 24,
      }}>
        CHT
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 12px", color: t.text }}>
        Credit Hold Tracker
      </h1>
      <p style={{ fontSize: 15, color: t.textMuted, margin: 0 }}>
        Manage and track credit holds across your organization
      </p>
    </div>
  );
}