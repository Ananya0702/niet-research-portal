import { useState } from "react";
import { loginAPI } from "../services/api";

const TEST_ACCOUNTS = [
  { role: "Faculty",  email: "vivek@niet.co.in",  password: "password123" },
  { role: "HOD",      email: "neha@niet.co.in",   password: "password123" },
  { role: "Dean R&D", email: "dean@niet.co.in",   password: "password123" },
];

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await loginAPI(email, password);
      localStorage.setItem("token",      res.data.access_token);
      localStorage.setItem("faculty_id", res.data.faculty_id);
      localStorage.setItem("role",       res.data.role);
      localStorage.setItem("name",       res.data.name);
      if (res.data.role === "hod")          window.location.href = "/hod/dashboard";
      else if (res.data.role === "dean_rd") window.location.href = "/dean/dashboard";
      else                                  window.location.href = "/dashboard";
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "#f7f7f8",
    }}>

      {/* LEFT PANEL */}
      <div style={{
        flex: 1, background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/admin-bg.jpg') center/cover no-repeat",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 48, color: "#fff",
      }}>
        {/* Logo */}
        <div style={{
          width: 100, height: 100, background: "rgba(255,255,255,0.12)",
          borderRadius: 24, display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: 24, padding: 14,
          boxShadow: "0 0 30px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.2)",
          backdropFilter: "blur(4px)",
        }}>
          <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain", filter:"brightness(0) invert(1)" }} />
        </div>

        <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>NIET</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "rgba(255,255,255,0.85)",
          marginBottom: 6 }}>Greater Noida</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)",
          marginBottom: 48, textAlign: "center" }}>
          Research Analytics Portal
        </div>

        {/* Stats */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 16, width: "100%", maxWidth: 340,
        }}>
          {[
            ["📄", "1,248+",  "Publications"],
            ["💬", "6,842+",  "Citations"],
            ["👥", "156",     "Active Faculty"],
            ["🏆", "41",      "h-index"],
          ].map(([icon, val, label]) => (
            <div key={label} style={{
              background: "rgba(255,255,255,0.1)", borderRadius: 12,
              padding: "16px 18px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{val}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)",
                marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 40, fontSize: 12, color: "rgba(255,255,255,0.4)",
          textAlign: "center",
        }}>
          Excellence in Research · Impacting the Future
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{
        width: 480, background: "#fff", display: "flex",
        flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "48px 44px",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>

          <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a1a",
            marginBottom: 6 }}>Welcome back</div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 32 }}>
            Sign in to your research portal account
          </div>

          {error && (
            <div style={{
              background: "#FCEBEB", color: "#791F1F",
              padding: "10px 14px", borderRadius: 8,
              fontSize: 13, marginBottom: 18,
            }}>{error}</div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label style={lbl}>Email address</label>
              <input type="email" required placeholder="yourname@niet.co.in"
                value={email} onChange={e => setEmail(e.target.value)}
                style={inp} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={lbl}>Password</label>
              <input type="password" required placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                style={inp} />
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: 24 }}>
              <span style={{ fontSize: 12, color: "#534AB7", cursor: "pointer" }}
                onClick={() => alert("Contact your administrator to reset your password.")}>
                Forgot password?
              </span>
            </div>

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "13px", background: "#534AB7",
              color: "#fff", borderRadius: 10, fontSize: 15,
              fontWeight: 600, border: "none", cursor: "pointer",
              opacity: loading ? 0.8 : 1,
            }}>
              {loading ? "Signing in..." : "Sign in →"}
            </button>
          </form>

          {/* Test accounts */}
          <div style={{
            marginTop: 32, paddingTop: 24,
            borderTop: "1px solid #eee",
          }}>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 10 }}>
              Quick login — click to fill
            </div>
            {TEST_ACCOUNTS.map(acc => (
              <div key={acc.role}
                onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", padding: "9px 12px",
                  borderRadius: 8, cursor: "pointer", background: "#f8f8f8",
                  marginBottom: 6, transition: "background 0.15s",
                }}>
                <span style={{ fontSize: 12, fontWeight: 600,
                  color: "#534AB7" }}>{acc.role}</span>
                <span style={{ fontSize: 12, color: "#888" }}>{acc.email}</span>
              </div>
            ))}
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <a href="/admin" style={{
                fontSize: 12, color: "#534AB7", textDecoration: "none",
                fontWeight: 500,
              }}>🔐 Admin Login →</a>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

const lbl = { fontSize: 13, fontWeight: 500, color: "#444",
  display: "block", marginBottom: 6 };
const inp = {
  width: "100%", padding: "11px 14px",
  border: "1.5px solid #e5e5e5", borderRadius: 9,
  fontSize: 14, color: "#333", outline: "none",
  transition: "border-color 0.2s",
};