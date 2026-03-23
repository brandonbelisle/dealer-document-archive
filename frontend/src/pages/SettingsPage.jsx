import { useState } from "react";
import { SunIcon, MoonIcon } from "../components/Icons";

export default function SettingsPage({ darkMode, setDarkMode, t }) {
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, color: t.text }}>
        Settings
      </h1>

      <div style={{ 
        background: t.surface, 
        border: `1px solid ${t.border}`, 
        borderRadius: 12,
        overflow: "hidden" 
      }}>
        {/* Appearance Section */}
        <div style={{ 
          padding: "16px 20px", 
          borderBottom: `1px solid ${t.border}`,
          background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" 
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: t.text }}>
            Appearance
          </h2>
        </div>

        <div style={{ padding: "16px 20px" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center" 
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: t.text }}>
                Dark Mode
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 4 }}>
                Switch between light and dark themes
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: darkMode 
                  ? "linear-gradient(135deg, #f59e0b, #d97706)" 
                  : "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                borderRadius: 8,
                color: "white",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {darkMode ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}