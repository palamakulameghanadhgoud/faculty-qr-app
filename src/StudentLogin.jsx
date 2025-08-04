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

  // Existing states
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentZoom, setCurrentZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(10); // Updated to 10x

  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const streamRef = useRef(null);

  // Load student credentials from pass.s.txt file
  useEffect(() => {
    const loadStudentCredentials = async () => {
      try {
        const response = await fetch('/pass.s.txt');
        if (!response.ok) {
          throw new Error('Failed to load student credentials file');
        }
        const text = await response.text();
        const credentials = {};
        
        // Parse the file content
        text.split('\n').forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes(':')) {
            const [studentId, password] = trimmedLine.split(':');
            if (studentId && password) {
              const id = studentId.trim();
              credentials[id] = {
                id: id,
                password: password.trim(),
                name: `Student ${id.slice(-3)}`, // Extract last 3 digits for name
                department: "AI&DS",
                year: "2024"
              };
            }
          }
        });
        
        setStudentCredentials(credentials);
        setCredentialsLoaded(true);
        console.log('Student credentials loaded:', Object.keys(credentials).length, 'students');
      } catch (error) {
        console.error('Error loading student credentials:', error);
        setLoginError('Failed to load student authentication system. Please contact faculty.');
        setCredentialsLoaded(true);
      }
    };

    loadStudentCredentials();
  }, []);

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!credentialsLoaded) {
      setLoginError("Authentication system not ready. Please wait and try again.");
      return;
    }

    const trimmedId = loginId.trim();
    const trimmedPassword = loginPassword.trim();
    
    if (!trimmedId || !trimmedPassword) {
      setLoginError("Please enter both Student ID and password");
      return;
    }

    if (studentCredentials[trimmedId] && studentCredentials[trimmedId].password === trimmedPassword) {
      setCurrentStudent(studentCredentials[trimmedId]);
      setIsLoggedIn(true);
      setLoginError("");
      setLoginId("");
      setLoginPassword("");
      console.log(`Student logged in: ${studentCredentials[trimmedId].name} (${trimmedId})`);
    } else {
      setLoginError("Invalid Student ID or password. Please check your credentials and try again.");
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

  // Stop scanning function
  const stopScanning = () => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsScanning(false);
      setMessage("");
      setCurrentZoom(1);
      console.log("QR Scanner stopped");
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  };

  // Handle zoom function - ENHANCED to support up to 10x zoom
  const handleZoom = async (zoomLevel) => {
    try {
      if (!streamRef.current) {
        console.warn("No active stream for zoom");
        return;
      }

      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        console.warn("No video track found");
        return;
      }

      // Check if zoom is supported
      const capabilities = videoTrack.getCapabilities();
      console.log("Camera capabilities:", capabilities);

      if (capabilities.zoom) {
        // Use native zoom if available
        const maxNativeZoom = capabilities.zoom.max;
        const actualZoom = Math.min(zoomLevel, maxNativeZoom);
        
        const constraints = {
          advanced: [{ zoom: actualZoom }]
        };
        await videoTrack.applyConstraints(constraints);
        setCurrentZoom(zoomLevel);
        console.log(`Native zoom applied: ${actualZoom}x (requested: ${zoomLevel}x, max: ${maxNativeZoom}x)`);
        
        // If requested zoom is higher than native zoom, apply additional CSS zoom
        if (zoomLevel > maxNativeZoom && videoRef.current) {
          const additionalZoom = zoomLevel / maxNativeZoom;
          videoRef.current.style.transform = `scale(${additionalZoom})`;
          videoRef.current.style.transformOrigin = 'center center';
          console.log(`Additional CSS zoom applied: ${additionalZoom}x`);
        } else if (videoRef.current) {
          videoRef.current.style.transform = 'scale(1)';
        }
      } else {
        // Fallback to CSS transform zoom only
        if (videoRef.current) {
          videoRef.current.style.transform = `scale(${zoomLevel})`;
          videoRef.current.style.transformOrigin = 'center center';
          setCurrentZoom(zoomLevel);
          console.log(`CSS zoom applied: ${zoomLevel}x`);
        }
      }
    } catch (error) {
      console.error("Zoom error:", error);
      // Fallback to CSS zoom if constraints fail
      if (videoRef.current) {
        videoRef.current.style.transform = `scale(${zoomLevel})`;
        videoRef.current.style.transformOrigin = 'center center';
        setCurrentZoom(zoomLevel);
        console.log(`Fallback CSS zoom applied: ${zoomLevel}x`);
      }
    }
  };

  // Check if camera is available
  useEffect(() => {
    const checkCamera = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError("Camera API not supported in this browser");
          return;
        }

        const isSecureContext = window.isSecureContext;
        const isLocalhost = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
        
        if (!isSecureContext && !isLocalhost) {
          setCameraError("Camera requires HTTPS connection for remote access.");
          return;
        }

        try {
          const hasCamera = await QrScanner.hasCamera();
          setHasCamera(hasCamera);

          if (!hasCamera) {
            setCameraError("No camera found on this device");
          } else {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                  width: { ideal: 640 }, 
                  height: { ideal: 480 },
                  facingMode: { ideal: 'environment' }
                } 
              });
              
              // Check zoom capabilities
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                const capabilities = videoTrack.getCapabilities();
                if (capabilities.zoom) {
                  setMaxZoom(Math.min(capabilities.zoom.max, 10)); // Cap at 10x but check native support
                  console.log(`Camera supports native zoom up to ${capabilities.zoom.max}x, capped at 10x`);
                }
              }
              
              stream.getTracks().forEach(track => track.stop());
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
      setCurrentZoom(1);

      await new Promise(resolve => setTimeout(resolve, 200));

      if (!videoRef.current) {
        throw new Error("Video element not ready");
      }

      if (!document.contains(videoRef.current)) {
        throw new Error("Video element not in DOM");
      }

      // Get camera stream first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: { ideal: 'environment' }
        }
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Set video properties
      videoRef.current.style.width = "100%";
      videoRef.current.style.height = "240px";
      videoRef.current.style.objectFit = "cover";
      videoRef.current.style.transform = "scale(1)";

      // Create QR Scanner
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        async (result) => {
          console.log("QR Code detected:", result.data);
          setScannedCode(result.data);
          stopScanning();
          setMessage("QR Code scanned! Marking attendance...");
          setIsSuccess(true);
          
          await submitAttendance(result.data);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: "environment",
          maxScansPerSecond: 3,
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

      qrScannerRef.current.onError = (error) => {
        console.error("QR Scanner error:", error);
        setCameraError(`Scanner error: ${error.message}`);
        setIsScanning(false);
      };

      // Start scanning (but don't start camera again since we already have the stream)
      await qrScannerRef.current.start();
      
      setMessage("Camera started. Point at QR code to scan. Use zoom controls if needed.");
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
        
        setTimeout(() => {
          setMessage("");
          setIsSuccess(false);
        }, 3000);
      } else {
        setIsSuccess(false);
        setMessage(`❌ ${data.message}`);
        setScannedCode("");
        
        setTimeout(() => {
          setMessage("");
        }, 3000);
      }
    } catch (error) {
      setIsSuccess(false);
      console.error("Detailed validation error:", error);
      
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
            position: "relative",
          }}
        >
          {/* AI&DS Department Label */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 16,
              background: "rgba(255, 255, 255, 0.15)",
              color: "#fff",
              padding: "4px 12px",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1,
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            AI&DS
          </div>

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
              MARKMEE
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
                DEPARTMENT OF AI&DS
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
              Enter your Student ID and password to access the QR attendance system
            </p>

            {/* Loading state while credentials are loading */}
            {!credentialsLoaded && (
              <div
                style={{
                  background: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: 8,
                  padding: "12px",
                  marginBottom: 20,
                  color: "#856404",
                  fontSize: 14,
                  textAlign: "center",
                }}
              >
                🔄 Loading student authentication system...
              </div>
            )}

            <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 20 }}>
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
                  disabled={!credentialsLoaded}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #bbdefb",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: credentialsLoaded ? "#f3f9ff" : "#f5f5f5",
                    color: "#000",
                    transition: "border-color 0.2s",
                    opacity: credentialsLoaded ? 1 : 0.7,
                  }}
                  placeholder="Enter your student ID (e.g., 2410080001)"
                  onFocus={(e) => {
                    if (credentialsLoaded) e.target.style.borderColor = "#1976d2";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#bbdefb";
                  }}
                />
              </div>

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
                  Password:
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={!credentialsLoaded}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #bbdefb",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: credentialsLoaded ? "#f3f9ff" : "#f5f5f5",
                    color: "#000",
                    transition: "border-color 0.2s",
                    opacity: credentialsLoaded ? 1 : 0.7,
                  }}
                  placeholder="Enter your password (e.g., student001)"
                  onFocus={(e) => {
                    if (credentialsLoaded) e.target.style.borderColor = "#1976d2";
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
                disabled={!credentialsLoaded}
                style={{
                  width: "100%",
                  background: credentialsLoaded ? "#1976d2" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: credentialsLoaded ? "pointer" : "not-allowed",
                  boxShadow: credentialsLoaded ? "0 4px 12px rgba(25, 118, 210, 0.3)" : "none",
                  transition: "all 0.2s",
                  opacity: credentialsLoaded ? 1 : 0.7,
                }}
                onMouseOver={(e) => {
                  if (credentialsLoaded) {
                    e.target.style.background = "#1565c0";
                    e.target.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (credentialsLoaded) {
                    e.target.style.background = "#1976d2";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                {credentialsLoaded ? "🔑 Login to Attendance System" : "Loading..."}
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
              <strong>📋 Student Login Information:</strong>
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.4 }}>
                • Student IDs: <strong>2410080001</strong> to <strong>2410080085</strong><br />
                • Password format: <strong>student001</strong>, <strong>student002</strong>, etc.<br />
                • Password matches the last 3 digits of your ID<br />
                • Both ID and password are required for login<br />
                • {credentialsLoaded ? `${Object.keys(studentCredentials).length} student accounts loaded` : 'Loading credentials...'}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // MAIN ATTENDANCE SCREEN (after login) - Keep existing code with minor updates
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
          position: "relative",
        }}
      >
        {/* AI&DS Department Label */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 16,
            background: "rgba(255, 255, 255, 0.15)",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 1,
            border: "1px solid rgba(255, 255, 255, 0.3)",
          }}
        >
          AI&DS
        </div>

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
            MARKMEE
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
              DEPARTMENT OF AI&DS
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
                      🔍 {currentZoom}x
                    </div>
                  </div>
                  
                  {/* ENHANCED Zoom Controls - Up to 10x */}
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
                        🔍 Zoom Controls: (Current: {currentZoom}x) - Up to 10x
                      </div>
                      
                      {/* First row of zoom buttons */}
                      <div style={{ display: "flex", justifyContent: "center", gap: "3px", marginBottom: 4 }}>
                        {[1, 1.5, 2, 2.5, 3].map(zoom => (
                          <button
                            key={zoom}
                            type="button"
                            onClick={() => handleZoom(zoom)}
                            style={{
                              background: currentZoom === zoom ? "#1976d2" : "#2196f3",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 6px",
                              fontSize: 10,
                              cursor: "pointer",
                              fontWeight: currentZoom === zoom ? 600 : 400,
                              minWidth: "28px",
                            }}
                          >
                            {zoom}x
                          </button>
                        ))}
                      </div>
                      
                      {/* Second row of zoom buttons */}
                      <div style={{ display: "flex", justifyContent: "center", gap: "3px", marginBottom: 6 }}>
                        {[4, 5, 6, 7, 8].map(zoom => (
                          <button
                            key={zoom}
                            type="button"
                            onClick={() => handleZoom(zoom)}
                            style={{
                              background: currentZoom === zoom ? "#1976d2" : "#2196f3",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 6px",
                              fontSize: 10,
                              cursor: "pointer",
                              fontWeight: currentZoom === zoom ? 600 : 400,
                              minWidth: "28px",
                            }}
                          >
                            {zoom}x
                          </button>
                        ))}
                      </div>
                      
                      {/* Third row for highest zoom levels */}
                      <div style={{ display: "flex", justifyContent: "center", gap: "3px", marginBottom: 6 }}>
                        {[9, 10].map(zoom => (
                          <button
                            key={zoom}
                            type="button"
                            onClick={() => handleZoom(zoom)}
                            style={{
                              background: currentZoom === zoom ? "#1976d2" : "#ff5722",
                              color: "#fff",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: 10,
                              cursor: "pointer",
                              fontWeight: currentZoom === zoom ? 600 : 400,
                              minWidth: "32px",
                            }}
                          >
                            {zoom}x
                          </button>
                        ))}
                      </div>
                      
                      <div style={{ fontSize: 10, color: "#666", textAlign: "center" }}>
                        High zoom (6x+) for very distant QR codes. May reduce image quality.
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
              <li>Student credentials loaded from secure authentication system</li>
              <li>HTTPS connection is required for camera access</li>
              <li>Click "Start QR Scanner" to activate camera</li>
              <li>Use zoom controls (1x to 10x) to focus on distant QR codes</li>
              <li>Higher zoom levels (6x+) are for very distant codes</li>
              <li>Point camera directly at the QR code</li>
              <li>Attendance will be marked automatically when QR is detected</li>
            </ol>
            <em>⏱️ QR codes expire after 30 seconds. Login required for each session.</em>
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