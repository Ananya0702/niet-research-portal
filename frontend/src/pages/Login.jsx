import { useState } from "react";
import { loginAPI } from "../services/api";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
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
      if (res.data.force_password_reset) {
        window.location.href = "/settings";
        return;
      }
      if (res.data.role === "hod")          window.location.href = "/hod/dashboard";
      else if (res.data.role === "dean_rd") window.location.href = "/dean/dashboard";
      else                                  window.location.href = "/dashboard";
    } catch (err) {
      if (!err.response) {
        setError("Cannot reach the server. Is the backend running?");
      } else if (err.response.status === 401) {
        setError("Invalid email or password. Please try again.");
      } else if (err.response.status === 423) {
        setError(err.response?.data?.detail || "Account temporarily locked. Try again later.");
      } else {
        setError(err.response?.data?.detail || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-frame">
        <div className="login-info-box">
          <div className="info-hero">
            <div className="info-brand">
              <div className="info-logo">
                <img src="/niet-logo.svg" alt="NIET" />
              </div>
            </div>

            <h1 className="hero-title">Research Portal</h1>
            <p className="hero-tagline">Empowering Research. Enabling Innovation.</p>
            <p className="hero-desc">
              A unified platform to manage publications, research profiles and academic
              contributions across NIET.
            </p>
          </div>

          <div className="info-block">
            <h2 className="info-heading">Vision</h2>
            <p className="info-text">
              To be an institute of academic excellence in digital arena with global outreach
              delivering socially responsible professionals to become a university and an
              entrepreneurial hub.
            </p>
          </div>

          <div className="info-block">
            <h2 className="info-heading">Mission</h2>
            <p className="info-text">
              To impart quality education and hone students' skills and competencies making them
              future ready. To foster an ecosystem for research, product development, innovation,
              incubation, and entrepreneurship. To instill values and ethics to produce socially
              responsible technocrats addressing global problems. To develop an environment for
              sharing and exchange of resources globally for lifelong learning.
            </p>
          </div>
        </div>

        <div className="login-form-box">
          <div className="form-inner">
            <div className="form-logo">
              <img src="/niet-logo.svg" alt="NIET" />
            </div>
            <h1 className="form-title">Welcome back</h1>
            <p className="form-subtitle">Sign in to your research portal</p>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field">
                <label className="field-label">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="yourname@niet.co.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="field-input"
                />
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <div className="pw-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw(s => !s)}
                    tabIndex={-1}
                  >
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              <div className="forgot-row">
                <a href="/forgot-password">Forgot password?</a>
              </div>

              <button type="submit" disabled={loading} className="signin-btn">
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="divider"><span>or</span></div>

            <a href="/admin" className="admin-link">Admin Login →</a>
          </div>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: url('/admin-bg.jpg') center/cover no-repeat fixed;
          padding: 40px 24px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        .login-frame {
          position: relative;
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 1.25fr 1fr;
          gap: 0;
          align-items: stretch;
          overflow: hidden;
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
        }
        .login-info-box, .login-form-box {
          padding: 46px 44px;
          background: rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(5px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
        }
        .login-form-box {
          border-left: 1px solid rgba(255,255,255,0.14);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .info-brand { display: flex; align-items: center; margin-bottom: 30px; }
        .info-logo {
          width: 220px; height: 96px; border-radius: 14px;
          background: #fff;
          padding: 14px 22px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .info-logo img { width: 100%; height: 100%; object-fit: contain; }
        .info-name { font-size: 24px; font-weight: 700; letter-spacing: 0.02em; }
        .info-place { font-size: 13px; color: rgba(255,255,255,0.7); }
        .info-hero { margin-bottom: 32px; }
        .hero-title { font-size: 32px; font-weight: 700; margin: 0 0 8px; line-height: 1.15; }
        .hero-tagline { font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.92); margin: 0 0 12px; }
        .hero-desc { font-size: 13.5px; line-height: 1.65; color: rgba(255,255,255,0.75); margin: 0; max-width: 480px; }
        .info-block { margin-bottom: 26px; }
        .info-heading {
          font-size: 17px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #a99aff; margin: 0 0 10px;
        }
        .info-text {
          font-size: 14px; line-height: 1.8; color: rgba(255,255,255,0.88); margin: 0;
        }

        .form-inner { width: 100%; max-width: 380px; }
        .form-logo { display: none; }
        .form-title { font-size: 26px; font-weight: 700; margin: 0 0 6px; }
        .form-subtitle { font-size: 14px; color: rgba(255,255,255,0.7); margin: 0 0 26px; }
        .form-error {
          background: rgba(249,80,80,0.16); color: #ffd6d6;
          border: 1px solid rgba(255,150,150,0.3);
          padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px;
        }
        .field { margin-bottom: 16px; }
        .field-label {
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.85);
          display: block; margin-bottom: 7px;
        }
        .field-input {
          width: 100%; padding: 12px 14px; box-sizing: border-box;
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.2);
          border-radius: 10px; font-size: 14px; color: #fff; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.4); }
        .field-input:focus { border-color: #8b7dff; background: rgba(255,255,255,0.12); }
        .pw-wrap { position: relative; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; font-size: 16px; cursor: pointer; padding: 0;
        }
        .forgot-row { text-align: right; margin-bottom: 22px; }
        .forgot-row a { font-size: 12.5px; color: #b9aaff; text-decoration: none; font-weight: 500; }
        .forgot-row a:hover { text-decoration: underline; }
        .signin-btn {
          width: 100%; padding: 13px; border: none; border-radius: 10px;
          font-size: 15px; font-weight: 600; color: #fff; cursor: pointer;
          background: linear-gradient(135deg, #6a4cf5 0%, #8b5cf6 45%, #3b82f6 100%);
          box-shadow: 0 10px 26px rgba(107,78,245,0.4);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        }
        .signin-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(107,78,245,0.5); }
        .signin-btn:disabled { opacity: 0.75; cursor: default; }
        .divider { display: flex; align-items: center; gap: 12px; margin: 24px 0 20px; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.18); }
        .divider span { font-size: 11px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.08em; }
        .admin-link {
          display: block; text-align: center; padding: 12px; border-radius: 10px;
          font-size: 13.5px; font-weight: 600; color: #fff; text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.06);
          transition: background 0.18s, border-color 0.18s;
        }
        .admin-link:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); }

        @media (max-width: 900px) {
          .login-frame { grid-template-columns: 1fr; max-width: 540px; }
          .login-info-box, .login-form-box { padding: 30px 26px; }
          .login-form-box { border-left: none; border-top: 1px solid rgba(255,255,255,0.14); }
          .info-brand { margin-bottom: 24px; }
          .form-logo { display: flex; justify-content: center; margin-bottom: 18px; }
          .form-logo img { width: 200px; height: 86px; object-fit: contain; padding: 10px 18px; background: #fff; border-radius: 12px; }
        }
      `}</style>
    </div>
  );
}
