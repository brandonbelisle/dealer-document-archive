import { SunIcon, MoonIcon, UserIcon, ArrowLeftIcon } from "./Icons";

export default function LandingNavbar({ darkMode, setDarkMode, loggedInUser, page, setPage }) {
  const showBackButton = page === "admin";

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: 55,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      gap: 12,
      borderBottom: `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
      background: darkMode ? "rgba(13,17,23,0.95)" : "rgba(255,255,255,0.95)",
      backdropFilter: "blur(12px)",
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {showBackButton && (
          <button
            onClick={() => setPage("landing")}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: darkMode ? "#c9d1d9" : "#57606a",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            <ArrowLeftIcon /> Back
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: darkMode ? "#c9d1d9" : "#57606a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
            borderRadius: 8,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = darkMode ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 8,
          background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          color: darkMode ? "#c9d1d9" : "#57606a",
          fontSize: 13,
          fontWeight: 500,
        }}>
          <UserIcon size={15} />
          <span>{loggedInUser?.name || "User"}</span>
        </div>
      </div>
    </div>
  );
}