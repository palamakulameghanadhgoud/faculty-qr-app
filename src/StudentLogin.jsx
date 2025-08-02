import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import QrScanner from "qr-scanner";

export default function StudentPage() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentStudent, setCurrentStudent] = useState(null);

  // Existing states
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Predefined student database (2410080001 to 2410080085)
  const studentDatabase = {};
  for (let i = 1; i <= 85; i++) {
    const id = `2410080${i.toString().padStart(3, '0')}`;
    studentDatabase[id] = {
      id: id,
      name: `Student ${i.toString().padStart(3, '0')}`,
      department: "AIDS",
      year: "2024"
    };
  }

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    const trimmedId = loginId.trim();
    
    if (!trimmedId) {
      setLoginError("Please enter your Student ID");
      return;
    }

    if (studentDatabase[trimmedId]) {
      setCurrentStudent(studentDatabase[trimmedId]);
      setIsLoggedIn(true);
      setLoginError("");
      setLoginId("");
      console.log(`Student logged in: ${studentDatabase[trimmedId].name} (${trimmedId})`);
    } else {
      setLoginError("Invalid Student ID. Please check your ID and try again.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentStudent(null);
    setScannedCode("");
    setMessage("");
    setIsSuccess(false);
    stopScanning();
  };

  // Stop scanning function - ADDED
  const stopScanning = () => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      setIsScanning(false);
      setMessage("");
      console.log("QR Scanner stopped");
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  };

  // Handle zoom function - ADDED
  const handleZoom = async (zoomLevel) => {
    try {
      if (qrScannerRef.current) {
        await qrScannerRef.current.setCamera('environment');
        // Note: Zoom is not directly supported by qr-scanner library
        // This is a placeholder for zoom functionality
        console.log(`Zoom set to: ${zoomLevel}x`);
      }
    } catch (error) {
      console.error("Zoom error:", error);
    }
  };

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
          setCameraError("Camera requires HTTPS connection for remote access.");
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

  // Start QR Scanner with zoom functionality
  const startScanning = async () => {
    try {
      setCameraError("");
      setMessage("Starting camera...");
      setIsScanning(true);

      // Wait for video element to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      // Ensure video element is properly mounted in DOM
      if (!document.contains(videoRef.current)) {
        throw new Error("Video element not in DOM");
      }

      // Set initial video properties to prevent undefined errors
      videoRef.current.style.width = "100%";
      videoRef.current.style.height = "240px";
      videoRef.current.style.objectFit = "cover";

      // Create QR Scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        async (result) => {
          console.log("QR Code detected:", result.data);
          setScannedCode(result.data);
          stopScanning();
          setMessage("QR Code scanned! Marking attendance...");
          setIsSuccess(true);
          
          // Automatically submit attendance when QR is scanned
          await submitAttendance(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 3,
          // Simplified scan region calculation
          calculateScanRegion: (video) => {
            try {
              if (!video || !video.videoWidth || !video.videoHeight) {
                return {
                  x: 50,
                  y: 50,
                  width: 200,
                  height: 200,
                };
              }
              
              const size = Math.min(video.videoWidth, video.videoHeight);
              const scanSize = Math.round(0.6 * size);
              return {
                x: Math.round((video.videoWidth - scanSize) / 2),
                y: Math.round((video.videoHeight - scanSize) / 2),
                width: scanSize,
                height: scanSize,
              };
            } catch (error) {
              console.warn("Scan region calculation failed:", error);
              return {
                x: 50,
                y: 50,
                width: 200,
                height: 200,
              };
            }
          }
        }
      );

      // Add error handler to QR scanner
      qrScannerRef.current.onError = (error) => {
        console.error("QR Scanner error:", error);
        setCameraError(`Scanner error: ${error.message}`);
        setIsScanning(false);
      };

      // Start the scanner
      await qrScannerRef.current.start();
      
      setMessage("Camera started. Point at QR code to scan. Attendance will be marked automatically.");
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
      } else if (error.message.includes("Video element")) {
        errorMessage += "Video element issue. Please try again in a moment.";
      } else {
        errorMessage += `${error.message}. Please try again.`;
      }

      setCameraError(errorMessage);
      setIsSuccess(false);
    }
  };

  // Submit attendance - extracted as separate function for automatic calling
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

    try {
      // Use the correct API URL
      const API_BASE_URL = window.location.hostname.includes('.onrender.com') 
        ? window.location.origin 
        : 'https://py-lq4p.onrender.com';
      console.log(`Attempting to connect to: ${API_BASE_URL}/validate`);
      
      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          qr_code: qrCode,
          student_id: currentStudent.id,
          student_name: currentStudent.name,
        }),
      });

      console.log(`Response status: ${response.status}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Response data:", data);

      if (data.valid) {
        setIsSuccess(true);
        setMessage(`✅ ${data.message}`);
        setScannedCode("");
        
        // Auto-clear message after 3 seconds and allow new scan
        setTimeout(() => {
          setMessage("");
          setIsSuccess(false);
        }, 3000);
      } else {
        setIsSuccess(false);
        setMessage(`❌ ${data.message}`);
        setScannedCode("");
        
        // Auto-clear error message after 3 seconds
        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      setIsSuccess(false);
      console.error("Detailed validation error:", error);
      
      // More specific error messages
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage("❌ Cannot connect to server. Make sure the Flask API is running.");
      } else if (error.message.includes('CORS')) {
        setMessage("❌ CORS error. Check server configuration.");
      } else if (error.message.includes('HTTP error')) {
        setMessage(`❌ Server error: ${error.message}. Check server logs.`);
      } else {
        setMessage("❌ Network error. Please check connection and try again.");
      }
      
      setScannedCode("");
      
      // Auto-clear error message after 5 seconds
      setTimeout(() => {
        setMessage("");
      }, 5000);
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

  // LOGIN SCREEN
  if (!isLoggedIn) {
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
              student login -{" "}
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

        {/* Main Login Content */}
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
              padding: "48px 32px",
              minWidth: 380,
              maxWidth: 420,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                marginBottom: 20,
                color: "#1976d2",
              }}
            >
              🎓
            </div>

            <h2
              style={{
                color: "#1976d2",
                marginBottom: 24,
                fontWeight: 600,
                fontSize: 24,
              }}
            >
              Student Login
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: 32,
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              Enter your Student ID to access the QR attendance system
            </p>

            <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    color: "#1976d2",
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: 14,
                  }}
                >
                  Student ID:
                </label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #bbdefb",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: "#f3f9ff",
                    transition: "border-color 0.2s",
                  }}
                  placeholder="Enter your student ID (e.g., 2410080001)"
                  onFocus={(e) => {
                    e.target.style.borderColor = "#1976d2";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#bbdefb";
                  }}
                />
              </div>

              {loginError && (
                <div
                  style={{
                    background: "#ffebee",
                    border: "1px solid #f44336",
                    borderRadius: 8,
                    padding: "12px",
                    marginBottom: 24,
                    color: "#c62828",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  <strong>⚠️ Login Failed:</strong><br />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                style={{
                  width: "100%",
                  background: "#1976d2",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.3)",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "#1565c0";
                  e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "#1976d2";
                  e.target.style.transform = "translateY(0)";
                }}
              >
                🔑 Login to Attendance System
              </button>
            </form>

            <div
              style={{
                marginTop: 32,
                padding: "16px",
                background: "#f3f9ff",
                borderRadius: 8,
                fontSize: 12,
                color: "#1976d2",
                textAlign: "left",
              }}
            >
              <strong>📋 Valid Student IDs:</strong>
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.4 }}>
                • IDs range from <strong>2410080001</strong> to <strong>2410080085</strong><br />
                • Contact faculty if your ID is not working<br />
                • Make sure to enter the complete 10-digit ID<br />
                • No spaces or special characters allowed
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // MAIN ATTENDANCE SCREEN (after login)
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

      {/* Navigation with logout */}
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
        <span
          style={{
            color: "#1976d2",
            margin: "0 16px",
            fontWeight: 600,
          }}
        >
          Student ({currentStudent.id})
        </span>
        <button
          onClick={handleLogout}
          style={{
            background: "#f44336",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            padding: "4px 12px",
            fontSize: 12,
            cursor: "pointer",
            marginLeft: 8,
          }}
        >
          Logout
        </button>
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
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            📱 QR Code Attendance Scanner
          </h2>

          {/* Student Info Display */}
          <div
            style={{
              background: "#e3f2fd",
              border: "2px solid #1976d2",
              borderRadius: 12,
              padding: "16px",
              marginBottom: 24,
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 14, color: "#1976d2", fontWeight: 600, marginBottom: 8 }}>
              👤 Logged in as:
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1976d2", marginBottom: 4 }}>
              {currentStudent.name}
            </div>
            <div style={{ fontSize: 14, color: "#666" }}>
              ID: {currentStudent.id} | {currentStudent.department} - {currentStudent.year}
            </div>
          </div>

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
                You can still try the camera buttons below.
              </small>
            </div>
          )}

          {/* QR Scanner Section - Remove the form wrapper */}
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
              {!isScanning && !scannedCode && !isLoading && (
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
                      ? "Scan QR code to mark attendance automatically" 
                      : "HTTPS required for camera access"}
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
                        🎯 Start QR Scanner
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
                  ) : (
                    <div
                      style={{
                        background: "#ffebee",
                        border: "1px solid #f44336",
                        borderRadius: 8,
                        padding: "12px",
                        color: "#c62828",
                        fontSize: 14,
                      }}
                    >
                      ⚠️ Camera requires HTTPS connection for security.<br />
                      Please use HTTPS or contact faculty for assistance.
                    </div>
                  )}
                </div>
              )}

              {isScanning && (
                <div>
                  <div style={{
                    position: "relative",
                    display: "inline-block",
                    marginBottom: 12,
                    overflow: "hidden",
                    borderRadius: 8,
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
                        transition: "transform 0.3s ease",
                      }}
                      onLoadedMetadata={() => {
                        console.log("Video metadata loaded");
                      }}
                      onError={(e) => {
                        console.error("Video error:", e);
                        setCameraError("Video playback error. Try a different camera button.");
                      }}
                    />
                    <div style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "60%",
                      height: "60%",
                      border: "2px solid #4caf50",
                      borderRadius: 8,
                      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.3)",
                      pointerEvents: "none",
                    }} />
                    
                    {/* Zoom indicator */}
                    <div style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      🔍 Zoom Available
                    </div>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        background: "#e3f2fd",
                        border: "1px solid #2196f3",
                        borderRadius: 6,
                        padding: "8px",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#1976d2", fontWeight: 600, marginBottom: 4 }}>
                        🔍 Zoom Controls:
                      </div>
                      <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                        <button
                          type="button"
                          onClick={() => handleZoom(1)}
                          style={{
                            background: "#2196f3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          1x
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZoom(1.5)}
                          style={{
                            background: "#2196f3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          1.5x
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZoom(2)}
                          style={{
                            background: "#2196f3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          2x
                        </button>
                        <button
                          type="button"
                          onClick={() => handleZoom(2.5)}
                          style={{
                            background: "#2196f3",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            padding: "4px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          2.5x
                        </button>
                      </div>
                    </div>
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
                      🔍 Scanning... Point camera at QR code. Attendance will be marked automatically.
                    </div>
                  </div>
                  <div style={{ marginBottom: 12 }}>
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
                        marginRight: 8,
                      }}
                    >
                      ⏹️ Stop Scanner
                    </button>
                    
                    {/* Retry button when scanning */}
                    <button
                      type="button"
                      onClick={() => {
                        stopScanning();
                        setTimeout(() => startScanning(), 500);
                      }}
                      style={{
                        background: "#ff9800",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "8px 16px",
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      🔄 Retry
                    </button>
                  </div>
                </div>
              )}

              {isLoading && (
                <div>
                  <div
                    style={{
                      fontSize: 48,
                      color: "#ff9800",
                      marginBottom: 12,
                    }}
                  >
                    ⏳
                  </div>
                  <div
                    style={{
                      background: "#fff3cd",
                      border: "2px solid #ffc107",
                      borderRadius: 8,
                      padding: "12px",
                      marginBottom: 12,
                      color: "#856404",
                      fontWeight: 600,
                    }}
                  >
                    📤 Marking attendance... Please wait.
                  </div>
                </div>
              )}

              {!isScanning && !isLoading && message && (
                <div>
                  <div
                    style={{
                      fontSize: 48,
                      color: isSuccess ? "#4caf50" : "#f44336",
                      marginBottom: 12,
                    }}
                  >
                    {isSuccess ? "✅" : "❌"}
                  </div>
                  <div
                    style={{
                      background: isSuccess ? "#e8f5e8" : "#ffebee",
                      border: `2px solid ${isSuccess ? "#4caf50" : "#f44336"}`,
                      borderRadius: 8,
                      padding: "12px",
                      marginBottom: 12,
                      color: isSuccess ? "#2e7d32" : "#c62828",
                      fontWeight: 600,
                    }}
                  >
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
                      cursor: "pointer",
                    }}
                  >
                    🔄 Scan Another QR Code
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status message display (if needed for other states) */}
          {message && isScanning && (
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
              <li>Your student details are automatically filled</li>
              <li>HTTPS connection is required for camera access</li>
              <li>Click "Start QR Scanner" to activate camera</li>
              <li>Point camera directly at the QR code</li>
              <li>Attendance will be marked automatically when QR is detected</li>
            </ol>
            <em>⏱️ QR codes expire after 30 seconds. Scan immediately after generation.</em>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper function to get the correct API URL
const getApiUrl = () => {
  // Check if we're in production (Render)
  if (window.location.hostname.includes('.onrender.com')) {
    return window.location.origin;
  }
  
  // Use your specific backend URL
  return 'https://py-lq4p.onrender.com';
};