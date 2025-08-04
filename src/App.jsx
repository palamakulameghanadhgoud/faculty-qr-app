import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import FacultyPage from './FacultyPage';
import StudentLogin from './StudentLogin';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/faculty" element={<FacultyPage />} />
        <Route path="/student" element={<StudentLogin />} />
      </Routes>
    </Router>
  );
}

function HomePage() {
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
          background: "#2e7d32",
          color: "#fff",
          padding: "0 0 0 0",
          textAlign: "center",
          marginBottom: 40,
          boxShadow: "0 2px 16px rgba(46, 125, 50, 0.13)",
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
            right: 16,
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
            boxShadow: "0 2px 8px rgba(46,125,50,0.08)",
            objectFit: "contain",
            display: "block",
          }}
        />
        <div style={{ flex: 1, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 44, letterSpacing: 2, fontWeight: 500, textTransform: "uppercase" }}>
            MARKMEE
          </h1>
          <div style={{ fontSize: 20, letterSpacing: 1, marginTop: 4, fontWeight: 500 }}>
            Department OF AI&DS <span style={{ color: "#2e7d32", background: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}></span>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100vw",
          background: "#fff",
          gap: "40px",
          padding: "0 20px",
          flexWrap: "wrap",
        }}
      >
        <Link
          to="/faculty"
          style={{
            textDecoration: "none",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 4px 32px rgba(183, 28, 28, 0.13)",
              padding: "48px 36px",
              minWidth: 280,
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              border: "2px solid #b71c1c",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 8px 40px rgba(183, 28, 28, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 32px rgba(183, 28, 28, 0.13)";
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
                color: "#b71c1c",
              }}
            >
              👨‍🏫
            </div>
            <h2 style={{ color: "#b71c1c", marginBottom: 12, fontWeight: 600, fontSize: 24 }}>
              Faculty Portal
            </h2>
            <p style={{ color: "#666", margin: 0, fontSize: 16 }}>
              Generate QR codes for attendance and manage class sessions
            </p>
          </div>
        </Link>

        <Link
          to="/student"
          style={{
            textDecoration: "none",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 20,
              boxShadow: "0 4px 32px rgba(25, 118, 210, 0.13)",
              padding: "48px 36px",
              minWidth: 280,
              maxWidth: 320,
              width: "100%",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.2s, box-shadow 0.2s",
              border: "2px solid #1976d2",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow = "0 8px 40px rgba(25, 118, 210, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 32px rgba(25, 118, 210, 0.13)";
            }}
          >
            <div
              style={{
                fontSize: 48,
                marginBottom: 16,
                color: "#1976d2",
              }}
            >
              🎓
            </div>
            <h2 style={{ color: "#1976d2", marginBottom: 12, fontWeight: 600, fontSize: 24 }}>
              Student Portal
            </h2>
            <p style={{ color: "#666", margin: 0, fontSize: 16 }}>
              Login and mark your attendance by scanning QR codes
            </p>
          </div>
        </Link>
      </main>

      <footer
        style={{
          width: "100vw",
          background: "#2e7d32",
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
