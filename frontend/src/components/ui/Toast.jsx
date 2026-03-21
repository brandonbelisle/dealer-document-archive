import { useEffect, useState, useRef } from "react";
import { XCloseIcon } from "../Icons";

function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (e) {
    console.log("Could not play notification sound");
  }
}

export default function Toast({ toasts, removeToast, darkMode }) {
  const t = darkMode;
  const prevToastCount = useRef(0);
  
  useEffect(() => {
    if (toasts.length > prevToastCount.current) {
      playNotificationSound();
    }
    prevToastCount.current = toasts.length;
  }, [toasts.length]);
  
  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 70,
        right: 20,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        maxWidth: 380,
      }}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          darkMode={darkMode}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose, darkMode }) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 200);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [onClose, isPaused, toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        background: darkMode ? "rgba(20, 25, 30, 0.98)" : "#fff",
        border: `1px solid ${darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: darkMode
          ? "0 8px 32px rgba(0,0,0,0.5)"
          : "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        animation: isExiting
          ? "toastOut 0.2s ease forwards"
          : "toastIn 0.3s ease",
        cursor: "pointer",
      }}
      onClick={handleClose}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ flex: 1}}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: darkMode ? "#e5e7eb" : "#1f2937",
            }}
          >
            {toast.title}
          </div>
          {toast.message && (
            <div
              style={{
                fontSize: 12,
                color: darkMode ? "#9ca3af" : "#6b7280",
                marginTop: 2,
                lineHeight: 1.4,
              }}
            >
              {toast.message}
            </div>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: darkMode ? "#6b7280" : "#9ca3af",
            padding: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <XCloseIcon size={14} />
        </button>
      </div>
    </div>
  );
}