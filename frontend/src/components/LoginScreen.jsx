import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from "./Icons";
import * as api from "../api";

export default function LoginScreen({
  loginForm,
  setLoginForm,
  loginError,
  setLoginError,
  loginLoading,
  handleLogin,
  darkMode,
  setDarkMode,
  t,
}) {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [allowLocalLogin, setAllowLocalLogin] = useState(true);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  // Check SSO status on mount
  useEffect(() => {
    const checkSsoStatus = async () => {
      try {
        const status = await api.getSamlStatus();
        setSsoEnabled(status.enabled);
        setAllowLocalLogin(status.allow_local_login !== false);
      } catch (err) {
        console.error("Failed to check SSO status:", err);
      }
    };
    checkSsoStatus();
  }, []);

  // Fetch logo based on dark mode
  useEffect(() => {
    const logoType = darkMode ? "dark" : "light";
    const url = `/api/settings/logo/${logoType}?t=${Date.now()}`;
    setLogoUrl(url);
  }, [darkMode]);

  // Handle SSO login redirect
  const handleSsoLogin = () => {
    setSsoLoading(true);
    window.location.href = api.getSamlLoginUrl();
  };

  // Handle token from URL (SAML callback)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      setLoginError(decodeURIComponent(error));
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (token) {
      // Set the token and clean up URL before reload
      localStorage.setItem("dda_token", token);
      // Remove token from URL to prevent infinite reload
      window.history.replaceState({}, "", window.location.pathname);
      // Force app to re-render with new token
      window.location.reload();
    }
  }, [setLoginError]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: darkMode ? "#0d0f12" : "#eeeae5",
        fontFamily: "'Geist','DM Sans',system-ui,sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://cdn.jsdelivr.net/npm/geist@1.2.2/dist/fonts/geist-sans/style.min.css"
        rel="stylesheet"
      />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}} .login-input:focus{border-color:${t.accent}!important;box-shadow:0 0 0 3px ${t.accentSoft}!important} input::placeholder{color:${t.textDim}}`}</style>
      <button
        onClick={() => setDarkMode(!darkMode)}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: 8,
          padding: 8,
          cursor: "pointer",
          color: t.textMuted,
          display: "flex",
          zIndex: 10,
        }}
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: "0 24px",
          animation: "fadeIn 0.5s ease",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              onError={() => setLogoUrl(null)}
              style={{
                height: 52,
                maxWidth: 200,
                objectFit: "contain",
                marginBottom: 16,
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                margin: "0 auto 16px",
                background: `linear-gradient(135deg,${t.accent},${t.accentDark})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.03em",
              }}
            >
              DDA
            </div>
          )}
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: t.text,
              margin: "0 0 4px",
            }}
          >
            Dealer Document Archive
          </h1>
          <p style={{ fontSize: 13.5, color: t.textMuted, margin: 0 }}>
            Sign in to access your documents
          </p>
        </div>

        {/* SSO Login Button */}
        {ssoEnabled && (
          <div style={{ marginBottom: allowLocalLogin ? 20 : 0 }}>
            <button
              onClick={handleSsoLogin}
              disabled={ssoLoading}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: ssoLoading ? "wait" : "pointer",
                background: darkMode ? "#2d2d2d" : "#fff",
                color: t.text,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: ssoLoading ? 0.7 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              {ssoLoading ? "Signing in..." : "Sign in with SSO"}
            </button>

            {allowLocalLogin && (
              <div style={{
                display: "flex",
                alignItems: "center",
                margin: "16px 0",
                color: t.textMuted,
                fontSize: 12,
              }}>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: t.border,
                }} />
                <span style={{ padding: "0 12px" }}>or use local account</span>
                <div style={{
                  flex: 1,
                  height: 1,
                  background: t.border,
                }} />
              </div>
            )}
          </div>
        )}

        {/* Local Login Form */}
        {(allowLocalLogin || !ssoEnabled) && (
          <div
            style={{
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: 14,
              padding: "28px 24px",
              boxShadow: darkMode
                ? "0 4px 24px rgba(0,0,0,0.3)"
                : "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {ssoEnabled && !allowLocalLogin ? (
              <div style={{ textAlign: "center", color: t.textMuted, fontSize: 13 }}>
                <p>Local login is disabled.</p>
                <p>Please use SSO to sign in.</p>
              </div>
            ) : (<>            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.textMuted,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                className="login-input"
                type="email"
                value={loginForm.username}
                onChange={(e) => {
                  setLoginForm((p) => ({ ...p, username: e.target.value }));
                  setLoginError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your email"
                autoFocus
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: t.textMuted,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <input
                className="login-input"
                type="password"
                value={loginForm.password}
                onChange={(e) => {
                  setLoginForm((p) => ({ ...p, password: e.target.value }));
                  setLoginError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: darkMode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {loginError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 7,
                  marginBottom: 16,
                  background: t.errorSoft,
                  color: t.error,
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                {loginError}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "inherit",
                cursor: loginLoading ? "wait" : "pointer",
                background: darkMode
                  ? `linear-gradient(135deg,${t.accent},${t.accentDark})`
                  : t.accent,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                opacity: loginLoading ? 0.7 : 1,
              }}
            >
              {loginLoading ? (
                <span style={{ animation: "pulse 1s infinite" }}>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
            </>)}
          </div>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: 11.5,
            color: t.textDim,
            marginTop: 20,
          }}
        >
          Contact your administrator if you need access
        </p>
      </div>
    </div>
  );
}