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
        // Check if we have basic media devices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera API not supported in this browser");
          return;
        }

        // More lenient check - allow camera attempt even on HTTP if localhost
        const isSecureContext = window.isSecureContext;
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        if (!isSecureContext && !isLocalhost) {
          setCameraError("Camera requires HTTPS connection for remote access. Use manual input below.");
          return;
        }

        // Try to check camera availability
        try {
          const hasCamera = await QrScanner.hasCamera();
          setHasCamera(hasCamera);

          if (!hasCamera) {
            setCameraError("No camera found on this device");
          } else {
            // Test camera permissions
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                  width: { ideal: 640 }, 
                  height: { ideal: 480 },
                  facingMode: { ideal: 'environment' }
                } 
              });
              stream.getTracks().forEach(track => track.stop()); // Stop test stream
              setCameraError("");
              console.log("Camera test successful!");
            } catch (permError) {
              console.error("Camera permission error:", permError);
              if (permError.name === 'NotAllowedError') {
                setCameraError("Camera permission denied. Please allow camera access and refresh the page.");
              } else if (permError.name === 'NotFoundError') {
                setCameraError("No camera device found.");
              } else {
                setCameraError(`Camera error: ${permError.message}`);
              }
            }
          }
        } catch (error) {
          console.log("QrScanner.hasCamera() failed, trying direct approach");
          setHasCamera(true);
          setCameraError("");
        }
      } catch (error) {
        console.error("Camera check error:", error);
        setHasCamera(true);
        setCameraError("Camera check failed, but you can still try scanning");
      }
    };

    checkCamera();
  }, []);

  // Start QR Scanner
  const startScanning = async () => {
    try {
      setCameraError("");
      setMessage("Starting camera...");
      setIsScanning(true);

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      // Create QR Scanner
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
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight);
            const scanSize = Math.round(0.7 * size);
            return {
              x: Math.round((video.videoWidth - scanSize) / 2),
              y: Math.round((video.videoHeight - scanSize) / 2),
              width: scanSize,
              height: scanSize,
            };
          },
        }
      );

      // Start the scanner
      await qrScannerRef.current.start();
      setMessage("Camera started. Point at QR code to scan.");
      console.log("QR Scanner started successfully");

    } catch (error) {
      console.error("Error starting QR scanner:", error);
      setIsScanning(false);
      
      let errorMessage = "Camera issue: ";

      if (error.name === 'NotAllowedError') {
        errorMessage += "Please allow camera access and try again.";
      } else if (error.name === 'NotFoundError') {
        errorMessage += "No camera found. Try connecting a camera.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage += "Camera not supported. Try a different browser.";
      } else if (error.name === 'NotReadableError') {
        errorMessage += "Camera busy. Close other apps using camera.";
      } else {
        errorMessage += `${error.message}. Try the manual input below.`;
      }

      setCameraError(errorMessage);
      setIsSuccess(false);
    }
  };

  // Basic camera stream
  const startBasicCamera = async () => {
    try {
      console.log("Starting basic camera...");
      setIsScanning(true);
      setCameraError("");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: { ideal: 'environment' }
        } 
      });
      
      console.log("Got camera stream:", stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("Video source set");
      }
      
      setMessage("Basic camera started! You can manually enter QR codes below.");
      
    } catch (error) {
      console.error("Basic camera failed:", error);
      setIsScanning(false);
      setCameraError(`Basic camera failed: ${error.message}`);
    }
  };

  // Stop QR Scanner
  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
    
    // Also stop any basic camera stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setMessage("");
  };

  // Submit attendance
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!scannedCode) {
      setMessage("Please scan a QR code first or enter it manually");
      setIsSuccess(false);
      return;
    }

    setIsLoading(true);
    setMessage("Submitting attendance...");

    try {
      // Use environment variable for API base URL
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_BASE_URL}/validate`, {
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
      setMessage("Network error. Please check connection and try again.");
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

  // Test camera directly
  const testCameraDirectly = async () => {
    try {
      console.log("Testing camera directly...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: 'environment' }
        }
      });
      console.log("Direct camera test successful:", stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsScanning(true);
        setMessage("Camera test successful! Stream active for 5 seconds.");
      }
      
      // Stop after 5 seconds
      setTimeout(() => {
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsScanning(false);
        setMessage("");
      }, 5000);
      
    } catch (error) {
      console.error("Direct camera test failed:", error);
      alert(`Camera test failed: ${error.message}`);
    }
  };

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

          {/* Security Status */}
          <div
            style={{
              background: window.isSecureContext ? "#e8f5e8" : "#fff3cd",
              border: `1px solid ${window.isSecureContext ? "#4caf50" : "#ffc107"}`,
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 20,
              fontSize: 12,
              color: window.isSecureContext ? "#2e7d32" : "#856404",
            }}
          >
            🔒 {window.isSecureContext 
              ? "Secure HTTPS Connection" 
              : window.location.hostname === 'localhost' 
                ? "HTTP Connection (localhost) - Camera may work"
                : "HTTP Connection - Camera requires HTTPS for remote access"
            }
          </div>

          {/* Camera Error Alert */}
          {cameraError && (
            <div
              style={{
                background: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: 8,
                padding: "12px",
                marginBottom: 20,
                color: "#856404",
                fontSize: 14,
              }}
            >
              <strong>⚠️ Camera Issue:</strong><br />
              {cameraError}
              <br />
              <small>
                You can still try the camera buttons below or enter QR codes manually.
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

            {/* QR Scanner Section */}
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
                {!isScanning && !scannedCode && (
                  <div>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    <p
                      style={{
                        color: "#666",
                        marginBottom: 16,
                        fontSize: 14,
                      }}
                    >
                      {window.isSecureContext 
                        ? "Try camera scanning or enter QR code manually" 
                        : "HTTPS required for camera. Use manual input below."}
                    </p>
                    
                    {/* Camera buttons */}
                    {window.isSecureContext || window.location.hostname === 'localhost' ? (
                      <div style={{ marginBottom: 16 }}>
                        <button
                          type="button"
                          onClick={startScanning}
                          style={{
                            background: "#4caf50",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                        >
                          🎯 QR Scanner
                        </button>
                        
                        <button
                          type="button"
                          onClick={startBasicCamera}
                          style={{
                            background: "#2196f3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 8,
                            padding: "12px 20px",
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                        >
                          📹 Basic Camera
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
                            marginBottom: 8,
                          }}
                        >
                          🔧 Test Camera
                        </button>
                      </div>
                    ) : null}
                    
                    {/* Manual QR input */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          color: "#666",
                          fontWeight: 500,
                          marginBottom: 6,
                          fontSize: 12,
                        }}
                      >
                        {window.isSecureContext ? "Or enter QR code manually:" : "Enter QR code manually:"}
                      </label>
                      <input
                        type="text"
                        value={scannedCode}
                        onChange={(e) => setScannedCode(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px",
                          border: "1px solid #ddd",
                          borderRadius: 4,
                          fontSize: 12,
                          fontFamily: "monospace",
                        }}
                        placeholder="Paste QR code here..."
                      />
                    </div>
                  </div>
                )}

                {isScanning && (
                  <div>
                    <div style={{ 
                      position: "relative", 
                      display: "inline-block",
                      marginBottom: 12,
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
                        }}
                      />
                      <div style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "70%",
                        height: "70%",
                        border: "2px solid #4caf50",
                        borderRadius: 8,
                        boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
                        pointerEvents: "none",
                      }} />
                    </div>
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

                {scannedCode && !isScanning && (
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
                        QR Code Ready!
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
                      🔄 Clear & Try Again
                    </button>
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
              <li>For camera access, HTTPS connection is required</li>
              <li>Try "QR Scanner" button first on HTTPS</li>
              <li>If camera issues, try "Basic Camera" or "Test Camera"</li>
              <li>You can also manually enter/paste QR codes</li>
              <li>Submit to mark your attendance</li>
            </ol>
            <em>⏱️ QR codes expire after 30 seconds</em>
          </div>
        </div>
      </main>
    </div>
  );
}