import { useState, useRef, useEffect } from "react";

export default function PdfCanvasPreview({ dataUrl, darkMode }) {
  const containerRef = useRef(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dataUrl || !window.pdfjsLib) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setPages([]);
    setError(null);

    (async () => {
      try {
        const base64 = dataUrl.split(",")[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++)
          bytes[i] = binaryString.charCodeAt(i);

        const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
        const rendered = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const scale = 1.5;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          rendered.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) {
          setPages(rendered);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Render failed");
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataUrl]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        padding: "20px 0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {loading && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: darkMode ? "#525960" : "#9e9888",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Rendering preview...
          </div>
        </div>
      )}
      {pages.map((src, i) => (
        <div
          key={i}
          style={{
            boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
            borderRadius: 4,
            overflow: "hidden",
            maxWidth: "90%",
          }}
        >
          <img
            src={src}
            alt={`Page ${i + 1}`}
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      ))}
      {!loading && pages.length === 0 && (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            color: darkMode ? "#525960" : "#9e9888",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            Could not render preview
          </div>
          {error && (
            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.7 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
