import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';

export default function FacultyPage() {
  // Authentication states
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentFaculty, setCurrentFaculty] = useState(null);
  const [facultyCredentials, setFacultyCredentials] = useState({});
  const [credentialsLoaded, setCredentialsLoaded] = useState(false);

  // Existing states
  const [qr, setQr] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(30);
  const [running, setRunning] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);

  // Load credentials from pass.txt file
  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const response = await fetch('/pass.txt');
        if (!response.ok) {
          throw new Error('Failed to load credentials file');
        }
        const text = await response.text();
        const credentials = {};
        
        // Parse the file content
        text.split('\n').forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.includes(':')) {
            const [user, pass] = trimmedLine.split(':');
            if (user && pass) {
              credentials[user.trim().toLowerCase()] = pass.trim();
            }
          }
        });
        
        setFacultyCredentials(credentials);
        setCredentialsLoaded(true);
        console.log('Credentials loaded:', Object.keys(credentials));
      } catch (error) {
        console.error('Error loading credentials:', error);
        setLoginError('Failed to load authentication system. Please contact IT support.');
        setCredentialsLoaded(true);
      }
    };

    loadCredentials();
  }, []);

  // Get API URL based on environment
  const getApiUrl = () => {
    if (window.location.hostname.includes('.onrender.com')) {
      return window.location.origin;
    }
    return 'https://py-lq4p.onrender.com';
  };

  // Authentication functions
  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!credentialsLoaded) {
      setLoginError("Authentication system not ready. Please wait and try again.");
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      setLoginError("Please enter both username and password");
      return;
    }

    if (facultyCredentials[trimmedUsername] === trimmedPassword) {
      setCurrentFaculty({
        username: trimmedUsername,
        displayName: trimmedUsername.charAt(0).toUpperCase() + trimmedUsername.slice(1).replace('.', ' ')
      });
      setIsLoggedIn(true);
      setLoginError("");
      setUsername("");
      setPassword("");
      console.log(`Faculty logged in: ${trimmedUsername}`);
    } else {
      setLoginError("Invalid username or password. Please check your credentials and try again.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentFaculty(null);
    setUsername("");
    setPassword("");
    setLoginError("");
    // Reset QR states
    stopQR();
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
              faculty login - <span style={{ color: "#b71c1c", background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>KL University</span>
            </div>
          </div>
        </header>

        {/* Navigation */}
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
              boxShadow: "0 4px 32px rgba(183, 28, 28, 0.13)",
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
                color: "#b71c1c",
              }}
            >
              👨‍🏫
            </div>

            <h2
              style={{
                color: "#b71c1c",
                marginBottom: 24,
                fontWeight: 600,
                fontSize: 24,
              }}
            >
              Faculty Login
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: 32,
                fontSize: 16,
                lineHeight: 1.5,
              }}
            >
              Enter your credentials to access the faculty portal
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
                🔄 Loading authentication system...
              </div>
            )}

            <form onSubmit={handleLogin} style={{ textAlign: "left" }}>
              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    color: "#b71c1c",
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: 14,
                  }}
                >
                  Username:
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={!credentialsLoaded}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #ffcdd2",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: credentialsLoaded ? "#fff5f5" : "#f5f5f5",
                    color: "#000", // Add explicit black text color
                    transition: "border-color 0.2s",
                    opacity: credentialsLoaded ? 1 : 0.7,
                  }}
                  placeholder="Enter your username"
                  onFocus={(e) => {
                    if (credentialsLoaded) e.target.style.borderColor = "#b71c1c";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#ffcdd2";
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    color: "#b71c1c",
                    fontWeight: 600,
                    marginBottom: 8,
                    fontSize: 14,
                  }}
                >
                  Password:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={!credentialsLoaded}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "2px solid #ffcdd2",
                    borderRadius: 8,
                    fontSize: 16,
                    outline: "none",
                    background: credentialsLoaded ? "#fff5f5" : "#f5f5f5",
                    color: "#000", // Add explicit black text color
                    transition: "border-color 0.2s",
                    opacity: credentialsLoaded ? 1 : 0.7,
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => {
                    if (credentialsLoaded) e.target.style.borderColor = "#b71c1c";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#ffcdd2";
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
                  <strong>⚠️ Authentication Error:</strong><br />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={!credentialsLoaded}
                style={{
                  width: "100%",
                  background: credentialsLoaded ? "#b71c1c" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: credentialsLoaded ? "pointer" : "not-allowed",
                  boxShadow: credentialsLoaded ? "0 4px 12px rgba(183, 28, 28, 0.3)" : "none",
                  transition: "all 0.2s",
                  opacity: credentialsLoaded ? 1 : 0.7,
                }}
                onMouseOver={(e) => {
                  if (credentialsLoaded) {
                    e.target.style.background = "#a0171b";
                    e.target.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (credentialsLoaded) {
                    e.target.style.background = "#b71c1c";
                    e.target.style.transform = "translateY(0)";
                  }
                }}
              >
                {credentialsLoaded ? "🔑 Login to Faculty Portal" : "Loading..."}
              </button>
            </form>

            <div
              style={{
                marginTop: 32,
                padding: "16px",
                background: "#fff5f5",
                borderRadius: 8,
                fontSize: 12,
                color: "#b71c1c",
                textAlign: "left",
              }}
            >
              <strong>📋 Authentication Info:</strong>
              <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.4 }}>
                • Credentials are loaded from secure file<br />
                • Contact IT support if you cannot access your account<br />
                • Username and password are case-sensitive<br />
                • {credentialsLoaded ? `${Object.keys(facultyCredentials).length} accounts available` : 'Loading credentials...'}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // MAIN FACULTY DASHBOARD (after login) - Keep existing code
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
        <span style={{ color: "#b71c1c", margin: "0 16px", fontWeight: 600 }}>
          Welcome, {currentFaculty.displayName}
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