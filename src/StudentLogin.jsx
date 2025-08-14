import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import QrScanner from "qr-scanner";

export default function StudentPage() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentCredentials, setStudentCredentials] = useState({});
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  // Scanner / attendance states
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentZoom, setCurrentZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(10);

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const streamRef = useRef(null);

  // -------- Helpers --------
  const resolveApiBase = () => {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      // Use proxy defined in vite.config.js
      return "/api";
    }
    if (window.location.hostname.includes(".onrender.com")) {
      return window.location.origin;
    }
    return "https://py-lq4p.onrender.com";
  };

  // -------- Load student credentials --------
  useEffect(() => {
    const loadStudentCredentials = async () => {
      try {
        const response = await fetch("/pass.s.txt");
        if (!response.ok) throw new Error("Failed to load student credentials file");
        const text = await response.text();
        const creds = {};
        text.split("\n").forEach(line => {
          const trimmed = line.trim();
          if (trimmed && trimmed.includes(":")) {
            const [id, pass] = trimmed.split(":");
            if (id && pass) {
              const sid = id.trim();
              creds[sid] = {
                id: sid,
                password: pass.trim(),
                name: `Student ${sid.slice(-3)}`,
                department: "AI&DS",
                year: "2024"
              };
            }
          }
        });
        setStudentCredentials(creds);
        setCredentialsLoaded(true);
        console.log("Student credentials loaded:", Object.keys(creds).length);
      } catch (err) {
        console.error("Credential load error:", err);
        setLoginError("Failed to load student authentication system. Contact faculty.");
        setCredentialsLoaded(true);
      }
    };
    loadStudentCredentials();
  }, []);

  // -------- Auth --------
  const handleLogin = (e) => {
    e.preventDefault();
    if (!credentialsLoaded) {
      setLoginError("Authentication system not ready. Try again.");
      return;
    }
    const id = loginId.trim();
    const pwd = loginPassword.trim();
    if (!id || !pwd) {
      setLoginError("Please enter both Student ID and password");
      return;
    }
    if (studentCredentials[id] && studentCredentials[id].password === pwd) {
      setCurrentStudent(studentCredentials[id]);
      setIsLoggedIn(true);
      setLoginError("");
      setLoginId("");
      setLoginPassword("");
      console.log("Student logged in:", id);
    } else {
      setLoginError("Invalid Student ID or password.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentStudent(null);
    setLoginId("");
    setLoginPassword("");
    setLoginError("");
    setScannedCode("");
    setMessage("");
    setIsSuccess(false);
    stopScanning();
  };

  // -------- Scanner control --------
  const stopScanning = () => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setIsScanning(false);
      setMessage("");
      setCurrentZoom(1);
      console.log("Scanner stopped");
    } catch (err) {
      console.error("Stop scanner error:", err);
    }
  };

  const handleZoom = async (zoomLevel) => {
    try {
      if (!streamRef.current) return;
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;
      const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
      if (caps.zoom) {
        const maxNative = caps.zoom.max;
        const actual = Math.min(zoomLevel, maxNative);
        await videoTrack.applyConstraints({ advanced: [{ zoom: actual }] });
        setCurrentZoom(zoomLevel);
        if (zoomLevel > maxNative && videoRef.current) {
          const additional = zoomLevel / maxNative;
          videoRef.current.style.transform = `scale(${additional})`;
        } else if (videoRef.current) {
          videoRef.current.style.transform = "scale(1)";
        }
      } else if (videoRef.current) {
        videoRef.current.style.transform = `scale(${zoomLevel})`;
        setCurrentZoom(zoomLevel);
      }
    } catch (err) {
      console.error("Zoom error:", err);
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${zoomLevel})`;
        setCurrentZoom(zoomLevel);
      }
    }
  };

  // -------- Camera availability --------
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Camera API not supported");
          return;
        }
        const secure = window.isSecureContext;
        const local = ["localhost", "127.0.0.1"].includes(window.location.hostname);
        if (!secure && !local) {
            setCameraError("Camera requires HTTPS for remote access.");
            return;
        }
        let has = false;
        try {
          has = await QrScanner.hasCamera();
        } catch {
          has = true; // fallback
        }
        setHasCamera(has);
        if (!has) {
          setCameraError("No camera found");
          return;
        }
        try {
          const test = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: { ideal: "environment" }
            }
          });
          const track = test.getVideoTracks()[0];
            if (track?.getCapabilities()?.zoom) {
              setMaxZoom(Math.min(track.getCapabilities().zoom.max, 10));
            }
          test.getTracks().forEach(t => t.stop());
          setCameraError("");
        } catch (permErr) {
          if (permErr.name === "NotAllowedError") setCameraError("Permission denied. Allow camera and refresh.");
          else if (permErr.name === "NotFoundError") setCameraError("No camera device found.");
          else setCameraError(`Camera error: ${permErr.message}`);
        }
      } catch (err) {
        console.error("Camera check error:", err);
        setCameraError("Camera check failed. You may still try scanning.");
        setHasCamera(true);
      }
    };
    checkCamera();
  }, []);

  // -------- Start scanning --------
  const startScanning = async () => {
    try {
      setCameraError("");
      setMessage("Starting camera...");
      setIsScanning(true);
      setCurrentZoom(1);
      await new Promise(r => setTimeout(r, 150));
      if (!videoRef.current) throw new Error("Video element not ready");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: "environment" } }
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.style.transform = "scale(1)";

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        async (res) => {
          console.log("QR detected:", res.data);
          setScannedCode(res.data);
          stopScanning();
          setMessage("QR scanned. Marking attendance...");
          setIsSuccess(true);
          await submitAttendance(res.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 3,
          calculateScanRegion: (video) => {
            try {
              if (!video.videoWidth || !video.videoHeight) return { x: 50, y: 50, width: 200, height: 200 };
              const size = Math.min(video.videoWidth, video.videoHeight);
              const scanSize = Math.round(size * 0.6);
              return {
                x: Math.round((video.videoWidth - scanSize) / 2),
                y: Math.round((video.videoHeight - scanSize) / 2),
                width: scanSize,
                height: scanSize
              };
            } catch {
              return { x: 50, y: 50, width: 200, height: 200 };
            }
          }
        }
      );
      qrScannerRef.current.onError = err => {
        console.error("Scanner error:", err);
        setCameraError(`Scanner error: ${err.message}`);
        setIsScanning(false);
      };
      await qrScannerRef.current.start();
      setMessage("Camera started. Point at QR code.");
    } catch (err) {
      console.error("Start scan error:", err);
      setIsScanning(false);
      setCameraError(err.name === "NotAllowedError"
        ? "Allow camera access and retry."
        : err.message);
      setIsSuccess(false);
    }
  };

  // -------- Attendance submission with 400 recovery --------
  const submitAttendance = async (qrCode) => {
    if (!qrCode) {
      setMessage("No QR code to process");
      setIsSuccess(false);
      return;
    }
    if (!currentStudent) {
      setMessage("Error: No student logged in");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage("Marking attendance...");

    const API_BASE = resolveApiBase();

    // Primary assumed payload (most backends need all three fields)
    const basePayload = {
      qr_code: qrCode,
      student_id: currentStudent.id,
      student_name: currentStudent.name
    };

    // Fallback key variants if first returns 400
    const variantPayloads = [
      basePayload,
      { qr: qrCode, student_id: currentStudent.id, student_name: currentStudent.name },
      { code: qrCode, student_id: currentStudent.id, student_name: currentStudent.name }
    ];

    let success = false;
    let lastError = "";

    for (let i = 0; i < variantPayloads.length && !success; i++) {
      const payload = variantPayloads[i];
      console.log(`Attempt ${i + 1} -> POST ${API_BASE}/validate`, payload);
      try {
        const res = await fetch(`${API_BASE}/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const raw = await res.text();
        let data;
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = { parse_error: true, raw }; }

        console.log(`Attempt ${i + 1} status: ${res.status}`, data);

        if (!res.ok) {
          lastError = data.message || data.error || raw || `HTTP ${res.status}`;
          // Retry only for validation-style errors
          if (![400, 422].includes(res.status)) break;
          continue;
        }

        // HTTP OK
        if (data.valid) {
          setIsSuccess(true);
          setMessage(`✅ ${data.message || "Attendance marked"}`);
        } else {
          setIsSuccess(false);
          setMessage(`❌ ${data.message || "Invalid / expired QR"}`);
        }
        success = true;
      } catch (e) {
        console.error(`Network error attempt ${i + 1}:`, e);
        lastError = e.message;
      }
    }

    if (!success) {
      setIsSuccess(false);
      setMessage(`❌ Attendance failed: ${lastError || "Unknown error"}`);
    }

    setScannedCode("");
    setTimeout(() => { if (!isScanning) setMessage(""); }, success ? 3000 : 5000);
    setIsLoading(false);
  };

  // Cleanup
  useEffect(() => () => stopScanning(), []);

  // Camera quick test
  const testCameraDirectly = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: { ideal: "environment" } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        setMessage("Camera test active (5s)...");
      }
      setTimeout(() => {
        stream.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsScanning(false);
        setMessage("");
      }, 5000);
    } catch (err) {
      alert(`Camera test failed: ${err.message}`);
    }
  };

  // -------- Login Screen --------
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Segoe UI, Arial, sans-serif" }}>
        <header style={{ width: "100vw", background: "#1976d2", color: "#fff", padding: 0, textAlign: "center", boxShadow: "0 2px 16px rgba(25,118,210,0.13)", minHeight: 90, display: "flex", alignItems: "center", position: "relative" }}>
          <div style={{ position: "absolute", top: 8, left: 16, background: "rgba(255,255,255,0.15)", color: "#fff", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: 1, border: "1px solid rgba(255,255,255,0.3)" }}>AI&DS</div>
          <img src="/Lg.png" alt="KL University Logo" style={{ height: 100, marginLeft: 32, marginRight: 24, marginTop: 10, marginBottom: 10, background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(25,118,210,0.08)", objectFit: "contain" }} />
          <div style={{ flex: 1, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 44, letterSpacing: 2, fontWeight: 500, textTransform: "uppercase" }}>MARKMEE</h1>
            <div style={{ fontSize: 20, letterSpacing: 1, marginTop: 4, fontWeight: 500 }}>
              student login - <span style={{ color: "#1976d2", background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>DEPARTMENT OF AI&DS</span>
            </div>
          </div>
        </header>

        <nav style={{ background: "#f5f5f5", padding: "12px 0", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", width: "100%", marginBottom: 20 }}>
          <Link to="/" style={{ color: "#666", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>Home</Link>
          <Link to="/faculty" style={{ color: "#b71c1c", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>Faculty</Link>
          <Link to="/student" style={{ color: "#1976d2", textDecoration: "none", margin: "0 16px", fontWeight: 600 }}>Student</Link>
        </nav>

        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100vw", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 32px rgba(25,118,210,0.13)", padding: "48px 32px", minWidth: 380, maxWidth: 420, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 64, marginBottom: 20, color: "#1976d2" }}>🎓</div>
            <h2 style={{ color: "#1976d2", marginBottom: 24, fontWeight: 600, fontSize: 24 }}>Student Login</h2>
            <p style={{ color: "#666", marginBottom: 32, fontSize: 16, lineHeight: 1.5 }}>
              Enter your Student ID and password to access the QR attendance system
            </p>

            {!credentialsLoaded && (
              <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 20, color: "#856404", fontSize: 14 }}>
                🔄 Loading student authentication system...
              </div>
            )}

            <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: "#1976d2", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Student ID:</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  disabled={!credentialsLoaded}
                  style={{ width: "100%", padding: "14px 16px", border: "2px solid #bbdefb", borderRadius: 8, fontSize: 16, background: credentialsLoaded ? "#f3f9ff" : "#f5f5f5", color: "#000", outline: "none" }}
                  placeholder="2410080001"
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", color: "#1976d2", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>Password:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={!credentialsLoaded}
                  style={{ width: "100%", padding: "14px 16px", border: "2px solid #bbdefb", borderRadius: 8, fontSize: 16, background: credentialsLoaded ? "#f3f9ff" : "#f5f5f5", color: "#000", outline: "none" }}
                  placeholder="student001"
                />
              </div>
              {loginError && (
                <div style={{ background: "#ffebee", border: "1px solid #f44336", borderRadius: 8, padding: 12, marginBottom: 24, color: "#c62828", fontSize: 14, textAlign: "center" }}>
                  <strong>⚠️ Login Failed:</strong><br />{loginError}
                </div>
              )}
              <button
                type="submit"
                disabled={!credentialsLoaded}
                style={{
                  width: "100%", background: credentialsLoaded ? "#1976d2" : "#ccc", color: "#fff",
                  border: "none", borderRadius: 8, padding: 16, fontSize: 16, fontWeight: 600,
                  cursor: credentialsLoaded ? "pointer" : "not-allowed"
                }}
              >
                {credentialsLoaded ? "🔑 Login to Attendance System" : "Loading..."}
              </button>
            </form>

            <div style={{ marginTop: 32, padding: 16, background: "#f3f9ff", borderRadius: 8, fontSize: 12, color: "#1976d2", textAlign: "left" }}>
              <strong>📋 Info:</strong>
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.4 }}>
                • IDs: 2410080001 - 2410080085<br />
                • Password: studentNNN (last 3 digits)<br />
                • {credentialsLoaded ? `${Object.keys(studentCredentials).length} accounts loaded` : "Loading..."}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------- Attendance Screen --------
  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Segoe UI, Arial, sans-serif" }}>
      <header style={{ width: "100vw", background: "#1976d2", color: "#fff", padding: 0, textAlign: "center", boxShadow: "0 2px 16px rgba(25,118,210,0.13)", minHeight: 90, display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 8, left: 16, background: "rgba(255,255,255,0.15)", color: "#fff", padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, letterSpacing: 1, border: "1px solid rgba(255,255,255,0.3)" }}>AI&DS</div>
        <img src="/Lg.png" alt="KL University Logo" style={{ height: 100, marginLeft: 32, marginRight: 24, marginTop: 10, marginBottom: 10, background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(25,118,210,0.08)", objectFit: "contain" }} />
        <div style={{ flex: 1, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 44, letterSpacing: 2, fontWeight: 500, textTransform: "uppercase" }}>MARKMEE</h1>
          <div style={{ fontSize: 20, letterSpacing: 1, marginTop: 4, fontWeight: 500 }}>
            student portal - <span style={{ color: "#1976d2", background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>DEPARTMENT OF AI&DS</span>
          </div>
        </div>
      </header>

      <nav style={{ background: "#f5f5f5", padding: "12px 0", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.1)", width: "100%", marginBottom: 20 }}>
        <Link to="/" style={{ color: "#666", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>Home</Link>
        <Link to="/faculty" style={{ color: "#b71c1c", textDecoration: "none", margin: "0 16px", fontWeight: 500 }}>Faculty</Link>
        <span style={{ color: "#1976d2", margin: "0 16px", fontWeight: 600 }}>Student ({currentStudent.id})</span>
        <button onClick={handleLogout} style={{ background: "#f44336", color: "#fff", border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12, cursor: "pointer", marginLeft: 8 }}>Logout</button>
      </nav>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100vw", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 20, boxShadow: "0 4px 32px rgba(25,118,210,0.13)", padding: "32px 24px", minWidth: 340, maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "#1976d2", marginBottom: 16, fontWeight: 600 }}>📱 QR Code Attendance Scanner</h2>

          <div style={{ background: "#e3f2fd", border: "2px solid #1976d2", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 14, color: "#1976d2", fontWeight: 600, marginBottom: 8 }}>👤 Logged in as:</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1976d2", marginBottom: 4 }}>{currentStudent.name}</div>
            <div style={{ fontSize: 14, color: "#666" }}>
              ID: {currentStudent.id} | {currentStudent.department} - {currentStudent.year}
            </div>
          </div>

          <div
            style={{
              background: window.isSecureContext ? "#e8f5e8" : "#fff3cd",
              border: `1px solid ${window.isSecureContext ? "#4caf50" : "#ffc107"}`,
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 20,
              fontSize: 12,
              color: window.isSecureContext ? "#2e7d32" : "#856404"
            }}
          >
            🔒 {window.isSecureContext
              ? "Secure HTTPS Connection"
              : window.location.hostname === "localhost"
                ? "HTTP (localhost) - Camera may work"
                : "HTTP - Camera needs HTTPS remotely"}
          </div>

          {cameraError && (
            <div style={{ background: "#fff3cd", border: "1px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 20, color: "#856404", fontSize: 14 }}>
              <strong>⚠️ Camera Issue:</strong><br />{cameraError}
              <br /><small>You can still try the buttons below.</small>
            </div>
          )}

            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{ background: "#f8f9fa", border: "2px dashed #1976d2", borderRadius: 12, padding: 20, marginBottom: 16 }}>
                {!isScanning && !scannedCode && !isLoading && (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    <p style={{ color: "#666", marginBottom: 16, fontSize: 14 }}>
                      {window.isSecureContext ? "Scan QR code to mark attendance" : "HTTPS required for camera access"}
                    </p>
                    {(window.isSecureContext || window.location.hostname === "localhost") ? (
                      <div style={{ marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={startScanning}
                          style={{ background: "#4caf50", color: "#fff", border: "none", borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginRight: 8, marginBottom: 8 }}
                        >
                          🎯 Start QR Scanner
                        </button>
                        <button
                          type="button"
                          onClick={testCameraDirectly}
                          style={{ background: "#ff9800", color: "#fff", border: "none", borderRadius: 8, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
                        >
                          🔧 Test Camera
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: "#ffebee", border: "1px solid #f44336", borderRadius: 8, padding: 12, color: "#c62828", fontSize: 14 }}>
                        ⚠️ Use HTTPS for camera access.
                      </div>
                    )}
                  </div>
                )}

                {isScanning && (
                  <div>
                    <div style={{ position: "relative", display: "inline-block", marginBottom: 12, overflow: "hidden", borderRadius: 8 }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{ width: "100%", maxWidth: 320, height: 240, border: "3px solid #4caf50", borderRadius: 8, background: "#000", objectFit: "cover", transition: "transform 0.3s ease" }}
                        onError={(e) => {
                          console.error("Video error:", e);
                          setCameraError("Video playback error.");
                        }}
                      />
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "60%", border: "2px solid #4caf50", borderRadius: 8, boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
                      <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>🔍 {currentZoom}x</div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ background: "#e3f2fd", border: "1px solid #2196f3", borderRadius: 6, padding: 8, marginBottom: 8 }}>
                        <div style={{ fontSize: 12, color: "#1976d2", fontWeight: 600, marginBottom: 4 }}>🔍 Zoom Controls (Current {currentZoom}x)</div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 4 }}>
                          {[1, 1.5, 2, 2.5, 3].map(z => (
                            <button key={z} type="button" onClick={() => handleZoom(z)}
                              style={{ background: currentZoom === z ? "#1976d2" : "#2196f3", color: "#fff", border: "none", borderRadius: 4, padding: "4px 6px", fontSize: 10, cursor: "pointer", minWidth: 28 }}>
                              {z}x
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 6 }}>
                          {[4, 5, 6, 7, 8].map(z => (
                            <button key={z} type="button" onClick={() => handleZoom(z)}
                              style={{ background: currentZoom === z ? "#1976d2" : "#2196f3", color: "#fff", border: "none", borderRadius: 4, padding: "4px 6px", fontSize: 10, cursor: "pointer", minWidth: 28 }}>
                              {z}x
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 6 }}>
                          {[9, 10].map(z => (
                            <button key={z} type="button" onClick={() => handleZoom(z)}
                              style={{ background: currentZoom === z ? "#1976d2" : "#ff5722", color: "#fff", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 10, cursor: "pointer", minWidth: 32 }}>
                              {z}x
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 10, color: "#666", textAlign: "center" }}>High zoom (6x+) may reduce clarity.</div>
                      </div>
                    </div>

                    <div style={{ background: "#e8f5e8", color: "#2e7d32", padding: "8px 12px", borderRadius: 6, fontSize: 14, border: "1px solid #4caf50", marginBottom: 12 }}>
                      Scanning... Point at QR code.
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <button type="button" onClick={stopScanning} style={{ background: "#f44336", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 14, cursor: "pointer", marginRight: 8 }}>
                        ⏹️ Stop
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopScanning();
                          setTimeout(() => startScanning(), 400);
                        }}
                        style={{ background: "#ff9800", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
                      >
                        🔄 Retry
                      </button>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <div>
                    <div style={{ fontSize: 48, color: "#ff9800", marginBottom: 12 }}>⏳</div>
                    <div style={{ background: "#fff3cd", border: "2px solid #ffc107", borderRadius: 8, padding: 12, marginBottom: 12, color: "#856404", fontWeight: 600 }}>
                      📤 Marking attendance...
                    </div>
                  </div>
                )}

                {!isScanning && !isLoading && message && (
                  <div>
                    <div style={{ fontSize: 48, color: isSuccess ? "#4caf50" : "#f44336", marginBottom: 12 }}>
                      {isSuccess ? "✅" : "❌"}
                    </div>
                    <div style={{ background: isSuccess ? "#e8f5e8" : "#ffebee", border: `2px solid ${isSuccess ? "#4caf50" : "#f44336"}`, borderRadius: 8, padding: 12, marginBottom: 12, color: isSuccess ? "#2e7d32" : "#c62828", fontWeight: 600 }}>
                      {message}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setIsSuccess(false);
                        setScannedCode("");
                      }}
                      style={{ background: "#1976d2", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 14, cursor: "pointer" }}
                    >
                      🔄 Scan Another
                    </button>
                  </div>
                )}
              </div>
            </div>

          <div style={{ marginTop: 20, padding: 12, background: "#f3f9ff", borderRadius: 8, fontSize: 12, color: "#1976d2", textAlign: "left" }}>
            <strong>📋 Instructions:</strong>
            <ol style={{ margin: "6px 0", paddingLeft: 16, fontSize: 11 }}>
              <li>Login with your ID and password</li>
              <li>Click Start QR Scanner</li>
              <li>Align QR inside the frame</li>
              <li>Use zoom buttons if distant</li>
              <li>Wait for automatic marking</li>
              <li>If 400 errors persist, refresh and retry</li>
            </ol>
            <em>QR codes expire quickly. One scan per session.</em>
          </div>
        </div>
      </main>
    </div>
  );
}