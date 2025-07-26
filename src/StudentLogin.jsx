import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import QrScanner from "qr-scanner";

export default function StudentPage() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Check if camera is available
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const hasCamera = await QrScanner.hasCamera();
        setHasCamera(hasCamera);

        if (!hasCamera) {
          setCameraError("No camera found on this device");
        } else {
          // Test camera permissions
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop test stream
            setCameraError("");
          } catch (permError) {
            setCameraError("Camera permission denied. Please allow camera access and refresh the page.");
          }
        }
      } catch (error) {
        console.error("Camera check error:", error);
        setCameraError("Error checking camera availability");
      }
    };

    checkCamera();
  }, []);

  // Start QR Scanner with better error handling
  const startScanning = async () => {
    if (!hasCamera || !videoRef.current) {
      setCameraError("Camera not available");
      return;
    }

    try {
      setCameraError("");
      setMessage("Starting camera...");

      // Request camera permission first
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      }).then(stream => {
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
      });

      // Create QR Scanner instance
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log("QR Code detected:", result.data);
          setScannedCode(result.data);
          stopScanning();
          setMessage("QR Code scanned successfully!");
          setIsSuccess(true);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 5,
        }
      );

      await qrScannerRef.current.start();
      setIsScanning(true);
      setMessage("Camera started. Point at QR code to scan.");

    } catch (error) {
      console.error("Error starting QR scanner:", error);
      let errorMessage = "Failed to start camera. ";

      if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow camera permissions and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage += "No camera found on this device.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage += "Camera not supported in this browser.";
      } else {
        errorMessage += "Please check camera permissions.";
      }

      setCameraError(errorMessage);
      setIsSuccess(false);
    }
  };

  // Stop QR Scanner
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    setIsScanning(false);
    setMessage("");
  };

  // Submit attendance
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!scannedCode) {
      setMessage("Please scan a QR code first");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage("Submitting attendance...");

    try {
      const response = await fetch("http://localhost:5000/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_code: scannedCode,
          student_id: studentId.trim(),
          student_name: studentName.trim(),
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsSuccess(true);
        setMessage(data.message);
        setScannedCode("");
        setStudentId("");
        setStudentName("");
      } else {
        setIsSuccess(false);
        setMessage(data.message);
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage("Network error. Please try again.");
      console.error("Validation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          width: "100vw",
          background: "#1976d2",
          color: "#fff",
          padding: "0",
          textAlign: "center",
          boxShadow: "0 2px 16px rgba(25, 118, 210, 0.13)",
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
            boxShadow: "0 2px 8px rgba(25,118,210,0.08)",
            objectFit: "contain",
          }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1
            style={{
              margin: 0,
              fontSize: 44,
              letterSpacing: 2,
              fontWeight: 500,
              textTransform: "uppercase",
            }}
          >
            attendu
          </h1>
          <div
            style={{
              fontSize: 20,
              letterSpacing: 1,
              marginTop: 4,
              fontWeight: 500,
            }}
          >
            student portal -{" "}
            <span
              style={{
                color: "#1976d2",
                background: "#fff",
                padding: "2px 8px",
                borderRadius: 6,
                fontWeight: 700,
              }}
            >
              KL University
            </span>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav
        style={{
          background: "#f5f5f5",
          padding: "12px 0",
          textAlign: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
          width: "100%",
          marginBottom: 20,
        }}
      >
        <Link
          to="/"
          style={{
            color: "#666",
            textDecoration: "none",
            margin: "0 16px",
            fontWeight: 500,
          }}
        >
          Home
        </Link>
        <Link
          to="/faculty"
          style={{
            color: "#b71c1c",
            textDecoration: "none",
            margin: "0 16px",
            fontWeight: 500,
          }}
        >
          Faculty
        </Link>
        <Link
          to="/student"
          style={{
            color: "#1976d2",
            textDecoration: "none",
            margin: "0 16px",
            fontWeight: 600,
          }}
        >
          Student
        </Link>
      </nav>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 4px 32px rgba(25, 118, 210, 0.13)",
            padding: "32px 24px",
            minWidth: 340,
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              color: "#1976d2",
              marginBottom: 24,
              fontWeight: 600,
            }}
          >
            📱 QR Code Attendance Scanner
          </h2>

          {/* Camera Error Alert */}
          {cameraError && (
            <div
              style={{
                background: "#ffebee",
                border: "1px solid #f44336",
                borderRadius: 8,
                padding: "12px",
                marginBottom: 20,
                color: "#c62828",
                fontSize: 14,
              }}
            >
              <strong>⚠️ Camera Issue:</strong><br />
              {cameraError}
              <br />
              <small>
                Make sure you're using HTTPS or localhost, and allow camera permissions when prompted.
              </small>
            </div>
          )}

          {/* Student Information Form */}
          <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  color: "#1976d2",
                  fontWeight: 500,
                  marginBottom: 6,
                  fontSize: 14,
                }}
              >
                Student ID:
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #bbdefb",
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  background: "#f3f9ff",
                }}
                placeholder="Enter your student ID"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  color: "#1976d2",
                  fontWeight: 500,
                  marginBottom: 6,
                  fontSize: 14,
                }}
              >
                Full Name:
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #bbdefb",
                  borderRadius: 6,
                  fontSize: 14,
                  outline: "none",
                  background: "#f3f9ff",
                }}
                placeholder="Enter your full name"
              />
            </div>

            {/* QR Scanner Section - Remove manual input fallback */}
            <div style={{ marginBottom: 20, textAlign: "center" }}>
              <div
                style={{
                  background: "#f8f9fa",
                  border: "2px dashed #1976d2",
                  borderRadius: 12,
                  padding: "20px",
                  marginBottom: 16,
                }}
              >
                {!isScanning && !scannedCode && hasCamera && !cameraError && (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    <p
                      style={{
                        color: "#666",
                        marginBottom: 16,
                        fontSize: 14,
                      }}
                    >
                      Position the QR code within the camera frame
                    </p>
                    <button
                      type="button"
                      onClick={startScanning}
                      style={{
                        background: "#4caf50",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "12px 24px",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
                      }}
                    >
                      🎯 Start Camera Scanner
                    </button>
                  </div>
                )}

                {isScanning && (
                  <div>
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
                        marginBottom: 12,
                        background: "#000",
                      }}
                    />
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          background: "#e8f5e8",
                          color: "#2e7d32",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 14,
                          marginBottom: 12,
                          border: "1px solid #4caf50",
                        }}
                      >
                        🔍 Scanning... Point camera at QR code
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopScanning}
                      style={{
                        background: "#f44336",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      ⏹️ Stop Scanner
                    </button>
                  </div>
                )}

                {scannedCode && (
                  <div>
                    <div
                      style={{
                        fontSize: 48,
                        color: "#4caf50",
                        marginBottom: 12,
                      }}
                    >
                      ✅
                    </div>
                    <div
                      style={{
                        background: "#e8f5e8",
                        border: "2px solid #4caf50",
                        borderRadius: 8,
                        padding: "12px",
                        marginBottom: 12,
                      }}
                    >
                      <div
                        style={{
                          color: "#2e7d32",
                          fontWeight: 600,
                          marginBottom: 8,
                        }}
                      >
                        QR Code Captured!
                      </div>
                      <div
                        style={{
                          fontFamily: "monospace",
                          fontSize: 12,
                          color: "#1976d2",
                          wordBreak: "break-all",
                          background: "#fff",
                          padding: "6px",
                          borderRadius: 4,
                          border: "1px solid #e0e0e0",
                        }}
                      >
                        {scannedCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScannedCode("");
                        setMessage("");
                        startScanning();
                      }}
                      style={{
                        background: "#1976d2",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      🔄 Scan Again
                    </button>
                  </div>
                )}

                {/* Show error message if no camera available */}
                {(!hasCamera || cameraError) && (
                  <div>
                    <div
                      style={{
                        fontSize: 48,
                        color: "#f44336",
                        marginBottom: 12,
                      }}
                    >
                      📵
                    </div>
                    <div
                      style={{
                        color: "#c62828",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {cameraError || "Camera not available on this device"}
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: 12,
                        marginTop: 8,
                      }}
                    >
                      Please ensure:
                      <ul style={{ textAlign: "left", marginTop: 8 }}>
                        <li>Camera permissions are allowed</li>
                        <li>No other apps are using the camera</li>
                        <li>Using HTTPS or localhost</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !scannedCode}
              style={{
                width: "100%",
                background: isLoading || !scannedCode ? "#ccc" : "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "14px",
                fontSize: 16,
                fontWeight: 600,
                cursor: isLoading || !scannedCode ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(25, 118, 210, 0.3)",
                transition: "background 0.2s",
              }}
            >
              {isLoading ? "📤 Submitting..." : "✅ Mark Attendance"}
            </button>
          </form>

          {message && (
            <div
              style={{
                marginTop: 20,
                padding: "12px",
                borderRadius: 8,
                background: isSuccess ? "#e8f5e8" : "#ffebee",
                color: isSuccess ? "#2e7d32" : "#c62828",
                fontWeight: 500,
                border: `1px solid ${isSuccess ? "#c8e6c9" : "#ffcdd2"}`,
                fontSize: 14,
              }}
            >
              {message}
            </div>
          )}

          <div
            style={{
              marginTop: 20,
              padding: "12px",
              background: "#f3f9ff",
              borderRadius: 8,
              fontSize: 12,
              color: "#1976d2",
              textAlign: "left",
            }}
          >
            <strong>📋 Instructions:</strong>
            <ol
              style={{
                margin: "6px 0",
                paddingLeft: 16,
                fontSize: 11,
              }}
            >
              <li>Fill in your student details above</li>
              <li>Click "Start Camera Scanner" to open camera</li>
              <li>Allow camera permissions when prompted</li>
              <li>Point camera at the QR code on faculty screen</li>
              <li>Wait for automatic detection</li>
              <li>Submit to mark your attendance</li>
            </ol>
            <em>⏱️ QR codes expire after 30 seconds</em>
          </div>
        </div>
      </main>
    </div>
  );
}