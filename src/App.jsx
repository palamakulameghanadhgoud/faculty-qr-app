import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import FacultyPage from './FacultyPage';
import StudentLogin from './StudentLogin';
import { useEffect, useState } from 'react';

const RED = "#b71c1c";
const WHITE = "#fff";
const ORBIT_SPEED_SECONDS = 18;

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState("/");

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

  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000 / 60);
    return () => clearInterval(interval);
  }, []);

  const now = performance.now() / 1000;
  const getAngle = (phase) => ((now / duration) * 2 * Math.PI + phase) % (2 * Math.PI);

  const positions = ringItems.map(item => {
    const angle = getAngle(item.phase);
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      angle,
    };
  });

  const [showAbout, setShowAbout] = useState(false);
  const [showContact, setShowContact] = useState(false);

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
            onClick={() => setShowAbout(true)}
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
            onClick={() => setShowContact(true)}
          >
            Contact Us
          </span>
        </nav>
      </header>

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
            <line
              x1={center}
              y1={center}
              x2={positions[0].x}
              y2={positions[0].y}
              stroke="#bbb"
              strokeWidth="2"
              strokeDasharray="6,6"
            />
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
          <LoginModalTrigger center={center} setShowModal={setShowModal} setIntendedRoute={setIntendedRoute} />
        </div>
      </main>
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
        &copy; {new Date().getFullYear()} KL University | All Rights Reserved | Designed by &nbsp; 
        <a
          href="https://github.com/palamakulameghanadhgoud"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#fff", textDecoration: "underline", display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <svg
            height="18"
            width="18"
            viewBox="0 0 16 16"
            fill="currentColor"
            style={{ verticalAlign: "middle" }}
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
              0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52
              -.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2
              -3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82
              .64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08
              2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01
              1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          @meghanadh @mohi_ud_din92 @abhiiii746 @deepthi @abhinavsai
        </a>
      </footer>
      {showAbout && (
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
          onClick={() => setShowAbout(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(183,28,28,0.18)",
              padding: "32px 28px 24px 28px",
              minWidth: 350,
              maxWidth: 500,
              width: "90vw",
              position: "relative",
              border: `3px solid ${RED}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowAbout(false)}
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
            <h2 style={{ color: RED, marginBottom: 16, fontWeight: 700 }}>About Us</h2>
            <div style={{ color: "#222", fontSize: 16, lineHeight: 1.7, textAlign: "left", maxWidth: 420 }}>
              We are a passionate team of KL University students—
              <b>mohiuddin ahemed</b>, <b>Abhilash</b>, <b>abhinav sai</b>, <b>Deepthi Priyanka</b>, and <b>meghanadhgoud</b>—brought together by our shared curiosity and drive to build practical tech solutions.
              <br /><br />
              As part of our Object-Oriented Programming (OOPs) project, we designed and developed a <b>QR-based Attendance System</b> that streamlines classroom attendance with speed, accuracy, and minimal manual effort.
              <br /><br />
              Our system leverages the principles of OOP to ensure modularity, scalability, and clean code architecture. By integrating QR scanning with real-time data logging, we aimed to solve a common campus challenge—making attendance smarter and more efficient for both students and faculty.
              <br /><br />
              This project reflects our commitment to innovation, teamwork, and applying classroom concepts to real-world use cases. We’re proud to have built something that’s not just functional, but future-ready.
            </div>
          </div>
        </div>
      )}
      {showContact && (
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
          onClick={() => setShowContact(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 8px 32px rgba(183,28,28,0.18)",
              padding: "32px 28px 24px 28px",
              minWidth: 350,
              maxWidth: 500,
              width: "90vw",
              position: "relative",
              border: `3px solid ${RED}`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowContact(false)}
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
            <h2 style={{ color: RED, marginBottom: 16, fontWeight: 700 }}>Contact Us</h2>
            <div style={{ color: "#222", fontSize: 16, lineHeight: 1.7, textAlign: "left", maxWidth: 420 }}>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                <li>
                  <a href="mailto:2410080026@klh.edu.in" style={{ color: "#1976d2", textDecoration: "underline" }}>
                    2410080026@klh.edu.in
                  </a>
                </li>
                <li>
                  <a href="mailto:2410080054@klh.edu.in" style={{ color: "#1976d2", textDecoration: "underline" }}>
                    2410080054@klh.edu.in
                  </a>
                </li>
                <li>
                  <a href="mailto:2410080085@klh.edu.in" style={{ color: "#1976d2", textDecoration: "underline" }}>
                    2410080085@klh.edu.in
                  </a>
                </li>
                <li>
                  <a href="mailto:2410080005@klh.edu.in" style={{ color: "#1976d2", textDecoration: "underline" }}>
                    2410080005@klh.edu.in
                  </a>
                </li>
                <li>
                  <a href="mailto:2410080031@klh.edu.in" style={{ color: "#1976d2", textDecoration: "underline" }}>
                    2410080031@klh.edu.in
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

function LoginModal({ setShowModal, intendedRoute }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ username: false, password: false, captcha: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [captcha, setCaptcha] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");

  const [facultyCreds, setFacultyCreds] = useState({});
  const [studentCreds, setStudentCreds] = useState({});
  const [loaded, setLoaded] = useState(false);

  function generateCaptcha(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setTouched({ username: true, password: true, captcha: true });
    setError("");
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

    if (facultyCreds[uname] && facultyCreds[uname] === pwd) {
      setLoading(false);
      setShowModal(false);
      navigate("/faculty");
      return;
    }
    if (studentCreds[uname] && studentCreds[uname] === pwd) {
      setLoading(false);
      setShowModal(false);
      localStorage.setItem("student_id", uname);
      let studentName = "Student";
      if (/^\d{10}$/.test(uname)) {
        studentName = "Student " + uname.slice(-3);
      } else {
        studentName = uname;
      }
      localStorage.setItem("student_name", studentName);
      navigate("/student");
      return;
    }
    setLoading(false);
    setError("Invalid username or password.");
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
  };

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput("");
    setTouched(t => ({ ...t, captcha: false }));
  };

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
          <div style={{ marginBottom: 10, marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              display: "inline-block",
              fontFamily: "monospace, Arial, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 4,
              background: "#f5f5f5",
              padding: "10px 18px",
              borderRadius: 8,
              userSelect: "none",
              color: "#222",
              minWidth: 140,
              textAlign: "center"
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
          © Copyright 2025 by K L Deemed to be University
        </div>
      </div>
    </div>
  );
}
