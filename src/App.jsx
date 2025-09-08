import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import FacultyPage from './FacultyPage';
import StudentLogin from './StudentLogin';
import { useEffect, useState } from 'react';

const RED = "#b71c1c";
const WHITE = "#fff";
const ORBIT_SPEED_SECONDS = 18;

export default function App() {
  // Modal state and intended route
  const [showModal, setShowModal] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState("/");

  // Custom wrapper to pass modal control to HomePage
  return (
    <Router>
      <AppRoutes
        showModal={showModal}
        setShowModal={setShowModal}
        intendedRoute={intendedRoute}
        setIntendedRoute={setIntendedRoute}
      />
    </Router>
  );
}

function AppRoutes({ showModal, setShowModal, intendedRoute, setIntendedRoute }) {
  const location = useLocation();

  // If modal is open, always render HomePage (so modal overlays it)
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              showModal={showModal}
              setShowModal={setShowModal}
              setIntendedRoute={setIntendedRoute}
            />
          }
        />
        <Route
          path="/faculty"
          element={
            showModal
              ? <HomePage showModal={showModal} setShowModal={setShowModal} setIntendedRoute={setIntendedRoute} />
              : <FacultyPage />
          }
        />
        <Route
          path="/student"
          element={
            showModal
              ? <HomePage showModal={showModal} setShowModal={setShowModal} setIntendedRoute={setIntendedRoute} />
              : <StudentLogin />
          }
        />
      </Routes>
      {/* Modal is rendered at the top level so it overlays all routes */}
      {showModal && (
        <LoginModal
          setShowModal={setShowModal}
          intendedRoute={intendedRoute}
        />
      )}
    </>
  );
}

function HomePage({ showModal, setShowModal, setIntendedRoute }) {
  const ringItems = [
    {
      label: "Student",
      icon: "/kl1.png",
      link: "/student",
      phase: 0,
    },
    {
      label: "Faculty",
      icon: "/3729.png",
      link: "/faculty",
      phase: Math.PI,
    }
  ];

  const center = 200;
  const radius = 170;
  const duration = ORBIT_SPEED_SECONDS;

  // For moving lines, we need to track the current angle for each button
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000 / 60); // 60fps
    return () => clearInterval(interval);
  }, []);

  // Calculate current angle for each button
  const now = performance.now() / 1000;
  const getAngle = (phase) => ((now / duration) * 2 * Math.PI + phase) % (2 * Math.PI);

  // Get button positions
  const positions = ringItems.map(item => {
    const angle = getAngle(item.phase);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      angle,
    };
  });

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Segoe UI, Arial, sans-serif",
        margin: 0,
        padding: 0,
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          width: "100vw",
          background: RED,
          color: WHITE,
          padding: 0,
          textAlign: "center",
          boxShadow: "0 2px 16px rgba(183, 28, 28, 0.13)",
          minHeight: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <nav
          style={{
            width: "100vw",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 40,
            fontWeight: 600,
            fontSize: 20,
            background: "transparent",
            padding: "18px 0",
          }}
        >
          <span
            style={{
              color: WHITE,
              fontWeight: 700,
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer"
            }}
            onClick={() => {
              setIntendedRoute("/");
              setShowModal(true);
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Login
          </span>
          <span style={{ flex: 1 }} />
          <span
            style={{
              color: WHITE,
              textDecoration: "none",
              marginLeft: 40,
              fontWeight: 600,
              cursor: "pointer"
            }}
            onClick={() => {
              setIntendedRoute("/");
              setShowModal(true);
            }}
          >
            About Us
          </span>
          <span
            style={{
              color: WHITE,
              textDecoration: "none",
              marginLeft: 40,
              fontWeight: 600,
              cursor: "pointer"
            }}
            onClick={() => {
              setIntendedRoute("/");
              setShowModal(true);
            }}
          >
            Contact Us
          </span>
        </nav>
      </header>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 2 * center,
            height: 2 * center,
            margin: "40px auto",
            maxWidth: "98vw",
            maxHeight: "70vw",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Moving lines */}
          <svg
            width={2 * center}
            height={2 * center}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {/* Line from logo to Student */}
            <line
              x1={center}
              y1={center}
              x2={positions[0].x}
              y2={positions[0].y}
              stroke="#bbb"
              strokeWidth="2"
              strokeDasharray="6,6"
            />
            {/* Line from logo to Faculty */}
            <line
              x1={center}
              y1={center}
              x2={positions[1].x}
              y2={positions[1].y}
              stroke="#bbb"
              strokeWidth="2"
              strokeDasharray="6,6"
            />
          </svg>

          {/* Orbiting Buttons */}
          <style>
            {`
              @keyframes orbit-cw {
                0%   { transform: rotate(0deg)   translate(${radius}px) rotate(0deg);}
                100% { transform: rotate(360deg) translate(${radius}px) rotate(-360deg);}
              }
            `}
          </style>
          {ringItems.map((item, i) => (
            <span
              key={i}
              style={{
                position: "absolute",
                left: positions[i].x - 60,
                top: positions[i].y - 60,
                width: 120,
                height: 120,
                textAlign: "center",
                color: "#222",
                fontWeight: 700,
                fontSize: 22,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                zIndex: 2,
                cursor: "pointer",
                transition: "transform 0.2s",
                boxShadow: "none",
                border: "none",
                outline: "none"
              }}
              onClick={() => {
                setIntendedRoute(item.link);
                setShowModal(true);
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <img
                src={item.icon}
                alt={item.label}
                style={{
                  width: 64,
                  height: 64,
                  marginBottom: 8,
                  objectFit: "contain",
                  userSelect: "none",
                  pointerEvents: "none"
                }}
                draggable={false}
              />
              <span style={{ fontSize: 22, fontWeight: 700 }}>{item.label}</span>
            </span>
          ))}

          {/* Centered Logo with shadow and modal trigger */}
          <LoginModalTrigger center={center} setShowModal={setShowModal} setIntendedRoute={setIntendedRoute} />

        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          width: "100vw",
          background: RED,
          color: "#fff",
          textAlign: "center",
          padding: "16px 0 10px 0",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: 1,
        }}
      >
        &copy; {new Date().getFullYear()} KL University | All Rights Reserved
      </footer>
    </div>
  );
}

// Centered logo trigger for modal
function LoginModalTrigger({ center, setShowModal, setIntendedRoute }) {
  return (
    <div
      style={{
        position: "absolute",
        left: center - 70,
        top: center - 70,
        width: 140,
        height: 140,
        background: "transparent",
        borderRadius: "50%",
        boxShadow: "0 8px 40px 0 rgba(0,0,0,0.25), 0 2px 40px 0 rgba(183,28,28,0.13)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3,
        cursor: "pointer"
      }}
      onClick={() => {
        setIntendedRoute("/");
        setShowModal(true);
      }}
      title="Click to Login"
    >
      <img
        src="/kl.jpg"
        alt="KL University Logo"
        style={{
          height: 120,
          width: 120,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
          background: "transparent",
        }}
      />
    </div>
  );
}

// Login modal with credential check and auto-routing
function LoginModal({ setShowModal, intendedRoute }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false, captcha: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  // 2FA state
  const [isFaculty2FA, setIsFaculty2FA] = useState(false);
  const [faculty2FACode, setFaculty2FACode] = useState("");
  const [faculty2FAInput, setFaculty2FAInput] = useState("");
  const [faculty2FAError, setFaculty2FAError] = useState("");

  // Load credentials from both files
  const [facultyCreds, setFacultyCreds] = useState({});
  const [studentCreds, setStudentCreds] = useState({});
  const [loaded, setLoaded] = useState(false);

  // Generate a random captcha string
  function generateCaptcha(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate a random 6-digit 2FA code
  function generate2FACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, []);

  useEffect(() => {
    async function loadCreds() {
      try {
        const [facultyRes, studentRes] = await Promise.all([
          fetch("/pass.txt"),
          fetch("/pass.s.txt")
        ]);
        const facultyText = await facultyRes.text();
        const studentText = await studentRes.text();

        const parseCreds = (text) => {
          const creds = {};
          text.split("\n").forEach(line => {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes(":")) {
              const [user, pass] = trimmed.split(":");
              if (user && pass) creds[user.trim().toLowerCase()] = pass.trim();
            }
          });
          return creds;
        };

        setFacultyCreds(parseCreds(facultyText));
        setStudentCreds(parseCreds(studentText));
        setLoaded(true);
      } catch (err) {
        setError("Failed to load credentials.");
        setLoaded(true);
      }
    }
    loadCreds();
  }, []);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true, captcha: true });
    setError("");
    setFaculty2FAError("");
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }
    if (!captchaInput.trim()) {
      setError("Please enter the verification code.");
      return;
    }
    if (captchaInput.trim() !== captcha) {
      setError("Verification code is incorrect.");
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }
    setLoading(true);
    const uname = username.trim().toLowerCase();
    const pwd = password.trim();

    // Check faculty
    if (facultyCreds[uname] && facultyCreds[uname] === pwd) {
      // 2FA step for faculty
      setLoading(false);
      const code = generate2FACode();
      setFaculty2FACode(code);
      setIsFaculty2FA(true);
      // In production, send code via email/SMS. For demo, show it in UI.
      return;
    }
    // Check student
    if (studentCreds[uname] && studentCreds[uname] === pwd) {
      setLoading(false);
      setShowModal(false);
      navigate("/student");
      return;
    }
    setLoading(false);
    setError("Invalid username or password.");
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  // Handle faculty 2FA submit
  const handleFaculty2FA = (e) => {
    e.preventDefault();
    setFaculty2FAError("");
    if (faculty2FAInput.trim() === faculty2FACode) {
      setShowModal(false);
      navigate("/faculty");
    } else {
      setFaculty2FAError("Invalid 2FA code. Please try again.");
    }
  };

  // Refresh captcha handler
  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setTouched(t => ({ ...t, captcha: false }));
  };

  // 2FA step UI
  if (isFaculty2FA) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.35)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onClick={() => setShowModal(false)}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            boxShadow: "0 8px 32px rgba(183,28,28,0.18)",
            padding: "32px 28px 24px 28px",
            minWidth: 350,
            maxWidth: 400,
            width: "100%",
            position: "relative",
            border: `3px solid ${RED}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => setShowModal(false)}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "#fff",
              border: `2px solid #ccc`,
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 20,
              color: "#b71c1c",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
            }}
            aria-label="Close"
          >×</button>
          {/* Logo */}
          <div style={{
            position: "absolute",
            top: -38,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            borderRadius: "50%",
            border: `3px solid ${RED}`,
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
          }}>
            <img src="/kl.jpg" alt="KL Logo" style={{ width: 48, height: 48, borderRadius: "50%" }} />
          </div>
          <div style={{ height: 32 }} />
          <form style={{ width: "100%" }} onSubmit={handleFaculty2FA} autoComplete="off">
            <label style={{ color: RED, fontWeight: 700, fontSize: 17, marginBottom: 4, display: "block" }}>
              Enter 2FA Code
            </label>
            <input
              type="text"
              placeholder="Enter the 6-digit code"
              value={faculty2FAInput}
              onChange={e => setFaculty2FAInput(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 10px",
                border: `2px solid #b71c1c`,
                borderRadius: 8,
                fontSize: 16,
                marginBottom: 6,
                marginTop: 2,
                background: "#fff",
                letterSpacing: "0.3em",
                textAlign: "center"
              }}
              maxLength={6}
              autoFocus
            />
            {/* For demo: show the code */}
            <div style={{
              color: "#1976d2",
              fontSize: 15,
              margin: "10px 0 16px 0",
              textAlign: "center"
            }}>
              <b>Demo 2FA code:</b> <span style={{ letterSpacing: "0.2em" }}>{faculty2FACode}</span>
            </div>
            {faculty2FAError && (
              <div style={{ color: "#b71c1c", fontSize: 13, marginBottom: 10 }}>{faculty2FAError}</div>
            )}
            <button
              type="submit"
              style={{
                width: "100%",
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "14px",
                fontSize: 18,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 8
              }}
            >
              Verify & Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.35)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={() => setShowModal(false)}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 32px rgba(183,28,28,0.18)",
          padding: "32px 28px 24px 28px",
          minWidth: 350,
          maxWidth: 400,
          width: "100%",
          position: "relative",
          border: `3px solid ${RED}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setShowModal(false)}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "#fff",
            border: `2px solid #ccc`,
            borderRadius: "50%",
            width: 32,
            height: 32,
            fontSize: 20,
            color: "#b71c1c",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
          }}
          aria-label="Close"
        >×</button>
        {/* Logo */}
        <div style={{
          position: "absolute",
          top: -38,
          left: "50%",
          transform: "translateX(-50%)",
          background: "#fff",
          borderRadius: "50%",
          border: `3px solid ${RED}`,
          width: 64,
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)"
        }}>
          <img src="/kl.jpg" alt="KL Logo" style={{ width: 48, height: 48, borderRadius: "50%" }} />
        </div>
        <div style={{ height: 32 }} />
        <form style={{ width: "100%" }} onSubmit={handleLogin} autoComplete="off">
          <label style={{ color: RED, fontWeight: 700, fontSize: 17, marginBottom: 4, display: "block" }}>Username</label>
          <input
            type="text"
            placeholder="Enter User name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, username: true }))}
            style={{
              width: "100%",
              padding: "12px 10px",
              border: `2px solid #b71c1c`,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 6,
              marginTop: 2,
              background: "#fff"
            }}
          />
          {touched.username && !username.trim() && (
            <div style={{ color: "#b71c1c", fontSize: 13, marginBottom: 10 }}>Username cannot be blank.</div>
          )}
          <label style={{ color: RED, fontWeight: 700, fontSize: 17, marginBottom: 4, display: "block" }}>Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, password: true }))}
            style={{
              width: "100%",
              padding: "12px 10px",
              border: `2px solid #b71c1c`,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 6,
              marginTop: 2,
              background: "#fff"
            }}
          />
          {touched.password && !password.trim() && (
            <div style={{ color: "#b71c1c", fontSize: 13, marginBottom: 10 }}>Password cannot be blank.</div>
          )}
          <div style={{ marginBottom: 12, marginTop: 8 }}>
            <input type="checkbox" id="rememberMe" style={{ marginRight: 8 }} />
            <label htmlFor="rememberMe" style={{ fontWeight: 600, fontSize: 15 }}>Remember Me</label>
          </div>
          {/* Captcha */}
          <div style={{ marginBottom: 10, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-block",
              fontFamily: "cursive",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: 2,
              background: "#eee",
              padding: "4px 16px",
              borderRadius: 8,
              userSelect: "none"
            }}>{captcha}</span>
            <button
              type="button"
              onClick={handleRefreshCaptcha}
              style={{
                marginLeft: 4,
                background: "#fff",
                border: `1.5px solid #b71c1c`,
                borderRadius: 8,
                color: "#b71c1c",
                fontWeight: 700,
                fontSize: 18,
                cursor: "pointer",
                padding: "2px 10px"
              }}
              title="Refresh Captcha"
            >⟳</button>
          </div>
          <input
            type="text"
            placeholder="Enter verification Code"
            value={captchaInput}
            onChange={e => setCaptchaInput(e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, captcha: true }))}
            style={{
              width: "100%",
              padding: "12px 10px",
              border: `2px solid #b71c1c`,
              borderRadius: 8,
              fontSize: 16,
              marginBottom: 16,
              marginTop: 2,
              background: "#fff"
            }}
          />
          {touched.captcha && !captchaInput.trim() && (
            <div style={{ color: "#b71c1c", fontSize: 13, marginBottom: 10 }}>Verification code cannot be blank.</div>
          )}
          <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
            <a href="#" style={{ color: "#1976d2", fontSize: 15, textDecoration: "none", textAlign: "center" }}>
              Forgot Password?
            </a>
          </div>
          <button
            type="submit"
            disabled={loading || !loaded}
            style={{
              width: "100%",
              background: "#1976d2",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "14px",
              fontSize: 18,
              fontWeight: 600,
              cursor: loading || !loaded ? "not-allowed" : "pointer",
              marginTop: 8
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && (
            <div style={{ color: "#b71c1c", fontSize: 14, marginTop: 14, textAlign: "center" }}>
              {error}
            </div>
          )}
        </form>
        <div style={{
          marginTop: 24,
          color: "#b71c1c",
          fontSize: 15,
          textAlign: "center"
        }}>
          © Copyright 2019 by K L Deemed to be University
        </div>
      </div>
    </div>
  );
}
