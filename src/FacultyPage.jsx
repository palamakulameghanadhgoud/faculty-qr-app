import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

export default function FacultyPage() {
  // QR and dashboard states
  const [qr, setQr] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // Fullscreen QR state
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Toggle dark mode handler
  const toggleDarkMode = () => setDarkMode(d => !d);

  // Colors based on mode
  const BG = darkMode ? "#181a1b" : "#fff";
  const RED = "#b71c1c";
  const WHITE = "#fff";
  const TEXT = darkMode ? "#eee" : "#222";
  const CARD = darkMode ? "#232526" : "#fff";
  const BORDER = darkMode ? "#333" : "#b71c1c";
  const SHADOW = darkMode ? "0 4px 32px rgba(40,40,40,0.4)" : "0 4px 32px rgba(183, 28, 28, 0.13)";

  // Get API URL based on environment
  const getApiUrl = () => {
    if (window.location.hostname.includes('.onrender.com')) {
      return window.location.origin;
    }
    return 'https://py-lq4p.onrender.com';
  };

  const startQR = () => {
    const t = Math.max(30, duration);
    setTimeLeft(t);
    setRunning(true);
    setDownloadReady(false);
  };

  const stopQR = () => {
    setRunning(false);
    setTimeLeft(0);
    setQr(null);
    setDownloadReady(false);
  };

  const handleDownload = async () => {
    try {
      const API_BASE_URL = getApiUrl();
      const response = await fetch(`${API_BASE_URL}/download/excel`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        console.error('Download failed:', data);
        alert('Download failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download attendance file');
    }
  };

  useEffect(() => {
    if (!running) return;

    const countdown = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          setRunning(false);
          setDownloadReady(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const fetchQR = async () => {
      try {
        const API_BASE_URL = getApiUrl();
        const res = await fetch(`${API_BASE_URL}/qr`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const json = await res.json();
        setQr(json);
      } catch (err) {
        console.error("Failed to fetch QR:", err);
      }
    };

    fetchQR();
    const qrInterval = setInterval(fetchQR, 3000);

    return () => {
      clearInterval(countdown);
      clearInterval(qrInterval);
    };
  }, [running]);

  // Automatically exit fullscreen when time is up
  useEffect(() => {
    if (isFullScreen && timeLeft === 0) {
      setIsFullScreen(false);
    }
  }, [isFullScreen, timeLeft]);

  // MAIN FACULTY DASHBOARD (after login)
  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "Segoe UI, Arial, sans-serif",
        margin: 0,
        padding: 0,
        color: TEXT,
        transition: "background 0.3s, color 0.3s"
      }}
    >
      <header
        style={{
          width: "100vw",
          background: RED,
          color: WHITE,
          padding: "0",
          textAlign: "center",
          boxShadow: "0 2px 16px rgba(183, 28, 28, 0.13)",
          position: "relative",
          minHeight: 60,
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src="/kl.jpg"
          alt="KL University Logo"
          style={{
            height: 48,
            width: 48,
            marginLeft: 16,
            marginRight: 16,
            marginTop: 6,
            marginBottom: 6,
            background: "#fff",
            borderRadius: "50%",
            boxShadow: "0 2px 8px rgba(183,28,28,0.08)",
            objectFit: "cover",
            display: "block",
          }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 28, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>
            MARKMEE
          </h1>
          <div style={{ fontSize: 14, letterSpacing: 1, marginTop: 2, fontWeight: 500 }}>
            faculty portal
          </div>
        </div>
        <button
          onClick={toggleDarkMode}
          style={{
            marginRight: 24,
            background: darkMode ? "#333" : "#fff",
            color: darkMode ? "#fff" : "#b71c1c",
            border: `2px solid ${RED}`,
            borderRadius: "50%",
            width: 36,
            height: 36,
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            transition: "background 0.2s, color 0.2s"
          }}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? "🌙" : "☀️"}
        </button>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          background: BG,
        }}
      >
        <div
          style={{
            background: CARD,
            borderRadius: 20,
            boxShadow: SHADOW,
            padding: "48px 36px",
            minWidth: 340,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
            color: TEXT,
            border: `1.5px solid ${BORDER}`,
            transition: "background 0.3s, color 0.3s"
          }}
        >
          <h2 style={{ color: RED, marginBottom: 24, fontWeight: 600 }}>
            Attendance QR Code Display
          </h2>

          {!running && !downloadReady ? (
            <>
              <label
                style={{
                  color: RED,
                  fontWeight: 500,
                  fontSize: 16,
                  marginBottom: 12,
                  display: "block",
                }}
              >
                Duration (minimum 30 seconds):
                <input
                  type="number"
                  min={30}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  style={{
                    marginLeft: 12,
                    padding: "6px 10px",
                    border: "1px solid #ffcdd2",
                    borderRadius: 6,
                    fontSize: 16,
                    outline: "none",
                    width: 80,
                    color: RED,
                    background: "#fff5f5",
                    marginTop: 8,
                  }}
                />
              </label>
              <button
                onClick={startQR}
                style={{
                  marginTop: 28,
                  background: RED,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(183, 28, 28, 0.08)",
                  transition: "background 0.2s",
                }}
              >
                Start QR Display
              </button>
            </>
          ) : downloadReady ? (
            <>
              <h3 style={{ color: "#4caf50", fontWeight: 600, marginBottom: 18, fontSize: 22 }}>
                Time Expired!
              </h3>
              <p style={{ color: RED, marginBottom: 20, fontWeight: 500 }}>
                The attendance file is now available for download.
              </p>
              <button
                onClick={handleDownload}
                style={{
                  background: "#4caf50",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
                  transition: "background 0.2s",
                  marginRight: 12,
                  marginBottom: 12,
                }}
              >
                Download Excel File
              </button>
              <br />
              <button
                onClick={() => {
                  setDownloadReady(false);
                  setQr(null);
                }}
                style={{
                  background: RED,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(183, 28, 28, 0.3)",
                  transition: "background 0.2s",
                }}
              >
                Start New Session
              </button>
            </>
          ) : (
            <>
              <h3
                style={{
                  color: RED,
                  fontWeight: 600,
                  marginBottom: 18,
                  fontSize: 22,
                }}
              >
                Time Left: {timeLeft}s
              </h3>
              {qr ? (
                <>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={qr.image}
                      alt="QR Code"
                      width="200"
                      height="200"
                      style={{
                        marginTop: 10,
                        marginBottom: 18,
                        borderRadius: 12,
                        border: "2px solid RED",
                        background: "#fff5f5",
                        display: "block"
                      }}
                    />
                    <button
                      onClick={() => setIsFullScreen(true)}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        background: "#222",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: 36,
                        height: 36,
                        fontSize: 18,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 2
                      }}
                      title="Full Screen QR"
                    >
                      ⛶
                    </button>
                  </div>
                  <div
                    style={{
                      background: "#fff5f5",
                      color: RED,
                      borderRadius: 8,
                      padding: "10px 8px",
                      fontWeight: 500,
                      fontSize: 14,
                      marginBottom: 20,
                      wordBreak: "break-all",
                    }}
                  >
                    QR Code Data:{" "}
                    <span style={{ fontFamily: "monospace", fontSize: 12 }}>{qr.data}</span>
                  </div>
                  <button
                    onClick={stopQR}
                    style={{
                      background: "#d32f2f",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 24px",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(211, 47, 47, 0.2)",
                      transition: "background 0.2s",
                    }}
                  >
                    Stop Display
                  </button>
                </>
              ) : (
                <div>
                  <p style={{ color: RED, fontWeight: 500 }}>Loading QR...</p>
                  <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
                    If QR doesn't load, check if Flask API is running and accessible
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {/* Full Screen QR Overlay */}
      {isFullScreen && qr && (
        <div
          style={{
            position: "fixed",
            zIndex: 9999,
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setIsFullScreen(false)}
        >
          <button
            onClick={() => setIsFullScreen(false)}
            style={{
              position: "fixed",
              top: 24,
              right: 32,
              background: "#fff",
              color: "#b71c1c",
              border: "none",
              borderRadius: "50%",
              width: 40,
              height: 40,
              fontSize: 22,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000
            }}
            title="Close Full Screen"
          >
            ×
          </button>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src={qr.image}
              alt="QR Code"
              width={340}
              height={340}
              style={{
                borderRadius: 18,
                border: "4px solid #fff",
                background: "#fff",
                display: "block",
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)"
              }}
            />
          </div>
        </div>
      )}
      <footer
        style={{
          width: "100vw",
          background: RED,
          color: "#fff",
          textAlign: "center",
          padding: "8px 0 6px 0",
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: 1,
          marginTop: 20,
        }}
      >
        &copy; {new Date().getFullYear()} KL University | All Rights Reserved
      </footer>
    </div>
  );
}