import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

export default function FacultyPage() {
  const [qr, setQr] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  // Get API URL based on environment
  const getApiUrl = () => {
    // Check if we're in production (Render)
    if (window.location.hostname.includes('.onrender.com')) {
      return window.location.origin;
    }
    
    // Check environment variable
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && !envUrl.includes('/api')) {
      return envUrl;
    }
    
    // Fallback for local development
    return 'http://localhost:5000';
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
        // If the response is a file, download it
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
        // If there's an error, handle JSON response
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
        console.log(`Fetching QR from: ${API_BASE_URL}/qr`);
        
        const res = await fetch(`${API_BASE_URL}/qr`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const json = await res.json();
        console.log("QR Response:", json);
        setQr(json);
      } catch (err) {
        console.error("Failed to fetch QR:", err);
        
        // Show user-friendly error message
        if (err.message.includes('Failed to fetch')) {
          console.error("Network error - check if Flask API is accessible");
        }
      }
    };

    fetchQR();
    const qrInterval = setInterval(fetchQR, 3000);

    return () => {
      clearInterval(countdown);
      clearInterval(qrInterval);
    };
  }, [running]);

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "Segoe UI, Arial, sans-serif",
        margin: 0,
        padding: 0,
      }}
    >
      <header
        style={{
          width: "100vw",
          background: "#b71c1c",
          color: "#fff",
          padding: "0 0 0 0",
          textAlign: "center",
          boxShadow: "0 2px 16px rgba(183, 28, 28, 0.13)",
          position: "relative",
          minHeight: 90,
          display: "flex",
          alignItems: "center",
        }}
      >
        <img
          src="/Lg.png"
          alt="KL University Logo"
          style={{
            height: 100,
            marginLeft: 32,
            marginRight: 24,
            marginTop: 10,
            marginBottom: 10,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(183,28,28,0.08)",
            objectFit: "contain",
            display: "block",
          }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 44, letterSpacing: 2, fontWeight: 500, textTransform: "uppercase" }}>
            attendu
          </h1>
          <div style={{ fontSize: 20, letterSpacing: 1, marginTop: 4, fontWeight: 500 }}>
            faculty portal - <span style={{ color: "#b71c1c", background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>KL University</span>
          </div>
        </div>
      </header>

      <nav style={{
        background: "#f5f5f5",
        padding: "12px 0",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
        width: "100%",
        marginBottom: 20,
      }}>
        <Link to="/" style={{ color: "#666", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>
          Home
        </Link>
        <Link to="/faculty" style={{ color: "#b71c1c", textDecoration: "none", margin: "0 16px", fontWeight: 600 }}>
          Faculty
        </Link>
        <Link to="/student" style={{ color: "#1976d2", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>
          Student
        </Link>
      </nav>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          background: "#fff",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 32px rgba(183, 28, 28, 0.13)",
            padding: "48px 36px",
            minWidth: 340,
            maxWidth: 400,
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#b71c1c", marginBottom: 24, fontWeight: 600 }}>
            Attendance QR Code Display
          </h2>

          {!running && !downloadReady ? (
            <>
              <label
                style={{
                  color: "#b71c1c",
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
                    color: "#b71c1c",
                    background: "#fff5f5",
                    marginTop: 8,
                  }}
                />
              </label>
              <button
                onClick={startQR}
                style={{
                  marginTop: 28,
                  background: "#b71c1c",
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
              <p style={{ color: "#b71c1c", marginBottom: 20, fontWeight: 500 }}>
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
                  background: "#b71c1c",
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
                  color: "#b71c1c",
                  fontWeight: 600,
                  marginBottom: 18,
                  fontSize: 22,
                }}
              >
                Time Left: {timeLeft}s
              </h3>
              {qr ? (
                <>
                  <img
                    src={qr.image}
                    alt="QR Code"
                    width="200"
                    height="200"
                    style={{
                      marginTop: 10,
                      marginBottom: 18,
                      borderRadius: 12,
                      border: "2px solid #b71c1c",
                      background: "#fff5f5",
                    }}
                  />
                  <div
                    style={{
                      background: "#fff5f5",
                      color: "#b71c1c",
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
                  <p style={{ color: "#b71c1c", fontWeight: 500 }}>Loading QR...</p>
                  <p style={{ color: "#666", fontSize: 12, marginTop: 8 }}>
                    If QR doesn't load, check if Flask API is running and accessible
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <footer
        style={{
          width: "100vw",
          background: "#b71c1c",
          color: "#fff",
          textAlign: "center",
          padding: "16px 0 10px 0",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: 1,
          marginTop: 40,
        }}
      >
        &copy; {new Date().getFullYear()} KL University | All Rights Reserved
      </footer>
    </div>
  );
}