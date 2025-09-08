import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import QrScanner from "qr-scanner";

const RED = "#b71c1c";
const RED_DARK = "#a0171b";
const RED_LIGHT = "#fff3f3";
const WHITE = "#fff";

export default function StudentPage() {
  // Attendance / scanner states
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentZoom, setCurrentZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(10);

  // Add state for full screen
  const [isFullScreen, setIsFullScreen] = useState(false);

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

    setIsLoading(true);
    setMessage("Marking attendance...");

    const API_BASE = resolveApiBase();

    // Primary assumed payload (most backends need all three fields)
    const basePayload = {
      qr_code: qrCode,
      student_id: "2410080001", // Use a default or dummy student ID
      student_name: "Student 001" // Use a default or dummy student name
    };

    // Fallback key variants if first returns 400
    const variantPayloads = [
      basePayload,
      { qr: qrCode, student_id: "2410080001", student_name: "Student 001" },
      { code: qrCode, student_id: "2410080001", student_name: "Student 001" }
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

  // --- Fullscreen handler ---
  const openFullScreen = () => setIsFullScreen(true);
  const closeFullScreen = () => {
    setIsFullScreen(false);
    stopScanning();
  };

  // --- Pinch/scroll zoom handlers ---
  useEffect(() => {
    if (!isFullScreen) return;
    const handleWheel = (e) => {
      if (!isScanning) return;
      e.preventDefault();
      let next = currentZoom + (e.deltaY < 0 ? 0.2 : -0.2);
      next = Math.max(1, Math.min(10, next));
      handleZoom(Number(next.toFixed(1)));
    };
    let pinchStart = null;
    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && pinchStart) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const pinchNow = Math.sqrt(dx * dx + dy * dy);
        let diff = (pinchNow - pinchStart) / 100;
        let next = currentZoom + diff;
        next = Math.max(1, Math.min(10, next));
        handleZoom(Number(next.toFixed(1)));
        pinchStart = pinchNow;
      }
    };
    const el = document.getElementById("fullscreen-scanner");
    if (el) {
      el.addEventListener("wheel", handleWheel, { passive: false });
      el.addEventListener("touchstart", handleTouchStart, { passive: false });
      el.addEventListener("touchmove", handleTouchMove, { passive: false });
    }
    return () => {
      if (el) {
        el.removeEventListener("wheel", handleWheel);
        el.removeEventListener("touchstart", handleTouchStart);
        el.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [isFullScreen, isScanning, currentZoom]);

  // -------- Main Student Dashboard --------
  return (
    <div style={{
      minHeight: "100vh",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "Segoe UI, Arial, sans-serif",
      width: "100vw",
      overflowX: "hidden"
    }}>
      {/* Header */}
      <header style={{
        width: "100vw",
        background: RED,
        color: WHITE,
        padding: 0,
        textAlign: "center",
        boxShadow: "0 2px 16px rgba(183,28,28,0.13)",
        minHeight: 90,
        display: "flex",
        alignItems: "center",
        position: "relative"
      }}>
        <img src="/Lg.png" alt="KL University Logo" style={{
          height: 90,
          marginLeft: 32,
          marginRight: 24,
          marginTop: 10,
          marginBottom: 10,
          background: WHITE,
          borderRadius: "50%",
          boxShadow: "0 2px 8px rgba(183,28,28,0.08)",
          objectFit: "contain"
        }} />
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{
            margin: 0,
            fontSize: 44,
            letterSpacing: 2,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em"
          }}>MARKMEE</h1>
          <div style={{
            fontSize: 20,
            letterSpacing: 1,
            marginTop: 4,
            fontWeight: 500
          }}>
            Student Portal <span style={{
              color: RED,
              background: WHITE,
              padding: "2px 8px",
              borderRadius: 6,
              fontWeight: 700
            }}>DEPARTMENT OF AI&DS</span>
          </div>
        </div>
      </header>

      <main style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100vw",
        padding: 20,
        overflowX: "hidden"
      }}>
        <div style={{
          background: WHITE,
          borderRadius: 20,
          boxShadow: "0 4px 32px rgba(25,118,210,0.13)",
          padding: "32px 24px",
          minWidth: 340,
          maxWidth: 480,
          width: "100%",
          textAlign: "center"
        }}>
          {/* Removed the heading here */}
          <div style={{
            background: "#e3f2fd",
            border: "2px solid #1976d2",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            textAlign: "left"
          }}>
            <div style={{
              fontSize: 14,
              color: "#1976d2",
              fontWeight: 600,
              marginBottom: 8
            }}>👤 Logged in as:</div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#1976d2",
              marginBottom: 4
            }}>Student 001</div>
            <div style={{
              fontSize: 14,
              color: "#666"
            }}>
              ID: 2410080001 | AI&DS - 2024
            </div>
          </div>

          {cameraError && (
            <div style={{
              background: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
              color: "#856404",
              fontSize: 14
            }}>
              <strong>⚠️ Camera Issue:</strong><br />{cameraError}
              <br /><small>You can still try the buttons below.</small>
            </div>
          )}

            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div style={{
                background: "#f8f9fa",
                border: "2px dashed #1976d2",
                borderRadius: 12,
                padding: 20,
                marginBottom: 16
              }}>
                {/* ...existing scanner state UI... */}
                {isScanning && (
                  <div>
                    <div style={{
                      position: "relative",
                      display: "inline-block",
                      marginBottom: 12,
                      overflow: "hidden",
                      borderRadius: 8
                    }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                          width: "100%",
                          maxWidth: 320,
                          height: 240,
                          border: "3px solid #4caf50",
                          borderRadius: 8,
                          background: "#000",
                          objectFit: "cover",
                          transition: "transform 0.3s ease"
                        }}
                        onError={(e) => {
                          setCameraError("Video playback error.");
                        }}
                      />
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                        width: "60%",
                        height: "60%",
                        border: "2px solid #4caf50",
                        borderRadius: 8,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
                        pointerEvents: "none"
                      }} />
                      <div style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600
                      }}>🔍 {currentZoom.toFixed(1)}x</div>
                    </div>

                    {/* Improved Zoom Controls */}
                    <div style={{
                      background: "#fff3f3",
                      border: `1.5px solid ${RED}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      marginTop: 8
                    }}>
                      <div style={{
                        fontSize: 13,
                        color: RED,
                        fontWeight: 600,
                        marginBottom: 8
                      }}>Zoom</div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={0.1}
                        value={currentZoom}
                        onChange={e => handleZoom(Number(e.target.value))}
                        style={{
                          width: "80%",
                          accentColor: RED,
                          marginBottom: 6
                        }}
                      />
                      <div style={{
                        fontSize: 12,
                        color: "#333",
                        marginBottom: 4
                      }}>
                        Current: <b>{currentZoom.toFixed(1)}x</b>
                        <button
                          type="button"
                          onClick={() => handleZoom(1)}
                          style={{
                            marginLeft: 16,
                            background: RED,
                            color: WHITE,
                            border: "none",
                            borderRadius: 6,
                            padding: "2px 10px",
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                        >Reset</button>
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: "#888"
                      }}>Drag slider for smooth zoom (1x–10x)</div>
                    </div>
                    {/* ...rest of scanner controls... */}
                  </div>
                )}

                {!isScanning && !scannedCode && !isLoading && (
                  <div>
                    <div style={{
                      fontSize: 48,
                      marginBottom: 12
                    }}>📷</div>
                    <p style={{
                      color: "#666",
                      marginBottom: 16,
                      fontSize: 14
                    }}>
                      {window.isSecureContext ? "Scan QR code to mark attendance" : "HTTPS required for camera access"}
                    </p>
                    {(window.isSecureContext || window.location.hostname === "localhost") ? (
                      <div style={{ marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={() => { openFullScreen(); startScanning(); }}
                          style={{
                            background: "#b71c1c",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "14px 28px",
                            fontSize: 16,
                            fontWeight: 700,
                            cursor: "pointer",
                            marginRight: 8,
                            marginBottom: 8
                          }}
                        >
                          🎯 Start Scanner (Full Screen)
                        </button>
                        <button
                          type="button"
                          onClick={testCameraDirectly}
                          style={{
                            background: "#ff9800",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginBottom: 8
                          }}
                        >
                          🔧 Test Camera
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: "#ffebee",
                        border: "1px solid #f44336",
                        borderRadius: 8,
                        padding: 12,
                        color: "#c62828",
                        fontSize: 14
                      }}>
                        ⚠️ Use HTTPS for camera access.
                      </div>
                    )}
                  </div>
                )}

                {isLoading && (
                  <div>
                    <div style={{
                      fontSize: 48,
                      color: "#ff9800",
                      marginBottom: 12
                    }}>⏳</div>
                    <div style={{
                      background: "#fff3cd",
                      border: "2px solid #ffc107",
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      color: "#856404",
                      fontWeight: 600
                    }}>
                      📤 Marking attendance...
                    </div>
                  </div>
                )}

                {!isScanning && !isLoading && message && (
                  <div>
                    <div style={{
                      fontSize: 48,
                      color: isSuccess ? "#4caf50" : "#f44336",
                      marginBottom: 12
                    }}>
                      {isSuccess ? "✅" : "❌"}
                    </div>
                    <div style={{
                      background: isSuccess ? "#e8f5e8" : "#ffebee",
                      border: `2px solid ${isSuccess ? "#4caf50" : "#f44336"}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      color: isSuccess ? "#2e7d32" : "#c62828",
                      fontWeight: 600
                    }}>
                      {message}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMessage("");
                        setIsSuccess(false);
                        setScannedCode("");
                      }}
                      style={{
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 14,
                        cursor: "pointer"
                      }}
                    >
                      🔄 Scan Another
                    </button>
                  </div>
                )}
              </div>
            </div>

          {/* Remove this instructions block */}
          {/* <div style={{
            marginTop: 20,
            padding: 12,
            background: "#f3f9ff",
            borderRadius: 8,
            fontSize: 12,
            color: "#1976d2",
            textAlign: "left"
          }}>
            <strong>📋 Instructions:</strong>
            <ol style={{
              margin: "6px 0",
              paddingLeft: 16,
              fontSize: 11
            }}>
              <li>Login with your ID and password</li>
              <li>Click Start QR Scanner</li>
              <li>Align QR inside the frame</li>
              <li>Use zoom buttons if distant</li>
              <li>Wait for automatic marking</li>
              <li>If 400 errors persist, refresh and retry</li>
            </ol>
            <em>QR codes expire quickly. One scan per session.</em>
          </div> */}
        </div>
      </main>

      {/* Fullscreen Scanner Overlay */}
      {isFullScreen && isScanning && (
        <div
          id="fullscreen-scanner"
          style={{
            position: "fixed",
            zIndex: 9999,
            top: 0, left: 0, right: 0, bottom: 0,
            background: "#000c",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <button
            onClick={closeFullScreen}
            style={{
              position: "absolute",
              top: 24,
              right: 32,
              background: "#b71c1c",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: 44,
              height: 44,
              fontSize: 28,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(183,28,28,0.13)"
            }}
            aria-label="Close Scanner"
          >✖</button>
          <div style={{
            background: "#222",
            borderRadius: 16,
            padding: 16,
            boxShadow: "0 4px 32px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "90vw",
                maxWidth: 600,
                height: "60vh",
                border: "4px solid #b71c1c",
                borderRadius: 12,
                background: "#000",
                objectFit: "cover",
                transition: "transform 0.3s ease"
              }}
            />
            <div style={{
              position: "relative",
              width: "90vw",
              maxWidth: 600,
              marginTop: 12
            }}>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={currentZoom}
                onChange={e => handleZoom(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: RED,
                  marginBottom: 6
                }}
              />
              <div style={{
                color: "#fff",
                fontSize: 16,
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                Zoom: <b style={{ margin: "0 8px" }}>{currentZoom.toFixed(1)}x</b>
                <button
                  type="button"
                  onClick={() => handleZoom(1)}
                  style={{
                    marginLeft: 16,
                    background: "#b71c1c",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "2px 14px",
                    fontSize: 14,
                    cursor: "pointer"
                  }}
                >Reset</button>
              </div>
              <div style={{
                fontSize: 11,
                color: "#eee",
                marginTop: 2,
                textAlign: "center"
              }}>Pinch or scroll to zoom (1x–10x)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Navigation link with animated underline and color
function NavLink({ to, label, active }) {
  return (
    <Link
      to={to}
      style={{
        color: active ? "#fff" : RED,
        background: active ? RED : WHITE,
        borderRadius: 8,
        padding: "6px 18px",
        textDecoration: "none",
        position: "relative",
        transition: "background 0.2s, color 0.2s",
        boxShadow: active ? "0 2px 8px rgba(183,28,28,0.13)" : "none"
      }}
      onMouseOver={e => {
        if (!active) e.currentTarget.style.background = RED_LIGHT;
      }}
      onMouseOut={e => {
        if (!active) e.currentTarget.style.background = WHITE;
      }}
    >
      {label}
      {active && (
        <span style={{
          display: "block",
          height: 3,
          background: WHITE,
          borderRadius: 2,
          width: "80%",
          margin: "4px auto 0 auto",
          transition: "width 0.2s"
        }} />
      )}
    </Link>
  );
}

// Form field with floating label effect
function FormField({ label, value, onChange, placeholder, disabled, type }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{
        display: "block",
        color: RED,
        fontWeight: 600,
        marginBottom: 8,
        fontSize: 15
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        required
        disabled={disabled}
        style={{
          width: "100%",
          padding: "14px 16px",
          border: `2px solid ${RED}`,
          borderRadius: 8,
          fontSize: 16,
          background: disabled ? "#f5f5f5" : WHITE,
          color: "#000",
          outline: "none",
          transition: "border-color 0.2s",
          boxShadow: "0 2px 8px rgba(183,28,28,0.06)"
        }}
        placeholder={placeholder}
        onFocus={e => e.target.style.borderColor = RED_DARK}
        onBlur={e => e.target.style.borderColor = RED}
      />
    </div>
  );
}