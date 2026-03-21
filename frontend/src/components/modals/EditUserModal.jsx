import { useState, useEffect, useRef } from "react";
import * as api from "../../api";
import { Btn } from "../ui/Btn";
import { XIcon, EyeIcon, EyeOffIcon, RefreshIcon } from "../Icons";

function generatePassword(length = 16) {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = "";
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function EditUserModal({ show, onClose, user, groups, onUserUpdated, t, darkMode }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  
  const firstNameRef = useRef(null);
  
  useEffect(() => {
    if (show && user) {
      const nameParts = (user.name || "").split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setEmail(user.email || "");
      setSelectedGroups(user.groupIds || []);
      setPassword("");
      setChangePassword(false);
      setShowPassword(false);
      setError("");
      setSuccess("");
      setLoading(false);
      setTimeout(() => firstNameRef.current?.focus(), 100);
    }
  }, [show, user]);
  
  const handleRegeneratePassword = () => {
    setPassword(generatePassword());
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (changePassword && !password) {
      setError("Password is required");
      return;
    }
    
    const displayName = `${firstName.trim()} ${lastName.trim()}`;
    
    setLoading(true);
    try {
      await api.updateUser(user.id, {
        displayName,
        email: email.trim(),
      });
      
      await api.updateUserGroups(user.id, selectedGroups);
      
      if (changePassword && password) {
        await api.adminSetPassword(user.id, password);
      }
      
      onUserUpdated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };
  
  if (!show || !user) return null;
  
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
          maxWidth: 440,
          maxHeight: "90vh",
          overflowY: "auto",
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
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Edit User</h2>
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
        
        <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
                First Name *
              </label>
              <input
                ref={firstNameRef}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
                Last Name *
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.text,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                fontFamily: "inherit",
                background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                color: t.text,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: t.textMuted, display: "block", marginBottom: 6 }}>
              Security Groups
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {groups.map((g) => {
                const isSelected = selectedGroups.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setSelectedGroups((prev) =>
                        isSelected ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                      );
                    }}
                    style={{
                      background: isSelected ? t.accentSoft : "transparent",
                      border: `1px solid ${isSelected ? t.accent : t.border}`,
                      borderRadius: 16,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      color: isSelected ? t.accent : t.textMuted,
                      transition: "all 0.15s",
                    }}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div style={{ marginBottom: 20, padding: "12px 14px", background: darkMode ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius: 10, border: `1px solid ${t.border}` }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: changePassword ? 12 : 0 }}>
              <input
                type="checkbox"
                checked={changePassword}
                onChange={(e) => {
                  setChangePassword(e.target.checked);
                  if (e.target.checked) {
                    setPassword(generatePassword());
                    setShowPassword(true);
                  }
                }}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: t.text }}>Change password</span>
            </label>
            
            {changePassword && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: t.textMuted }}>New Password</label>
                  <button
                    type="button"
                    onClick={handleRegeneratePassword}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: t.accent,
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <RefreshIcon size={12} /> Regenerate
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      paddingRight: 40,
                      fontSize: 14,
                      fontFamily: "monospace",
                      background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                      border: `1px solid ${t.border}`,
                      borderRadius: 8,
                      color: t.text,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: t.textMuted,
                      padding: 4,
                      display: "flex",
                    }}
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>
              </>
            )}
          </div>
          
          {error && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: t.errorSoft, color: t.error, borderRadius: 8, fontSize: 13 }}>
              {error}
            </div>
          )}
          
          {success && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: t.successSoft, color: t.success, borderRadius: 8, fontSize: 13 }}>
              {success}
            </div>
          )}
          
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 8,
                padding: "9px 16px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: t.text,
                fontFamily: "inherit",
              }}
            >
              Cancel
            </button>
            <Btn
              primary
              darkMode={darkMode}
              t={t}
              type="submit"
              loading={loading}
              style={{ padding: "9px 20px", fontSize: 13 }}
            >
              Save Changes
            </Btn>
          </div>
        </form>
      </div>
    </div>
  );
}