import { useState } from "react";
import { loginAPI } from "../services/api";

const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export default function Login() {
  const [email,    setEmail]    = useState(() => localStorage.getItem("remembered_email") || "");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [rememberMe, setRememberMe] = useState(localStorage.getItem("remember_login") === "true");

  const handleRemember = (checked) => {
    setRememberMe(checked);
    localStorage.setItem("remember_login", String(checked));
    if (checked) localStorage.setItem("remembered_email", email);
    else localStorage.removeItem("remembered_email");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (rememberMe) localStorage.setItem("remembered_email", email);
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
          <div className="info-topline">
            <div className="info-logo"><img src="/niet-logo.svg" alt="NIET Greater Noida" /></div>
            <div className="brand-values" aria-label="Knowledge, Research, Innovation">
              <span><Icon><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H21v16H6.5A3.5 3.5 0 0 0 3 21.5z"/><path d="M3 5.5v16M7 6h9"/></Icon>Knowledge</span>
              <i />
              <span><Icon><path d="M12 3v2M5.6 5.6 7 7M3 12h2m13 0h3m-2.6-6.4L17 7"/><path d="M8 17a6 6 0 1 1 8 0c-.8.6-1 1.2-1 2h-6c0-.8-.2-1.4-1-2ZM9 22h6"/></Icon>Research</span>
              <i />
              <span><Icon><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M18 14a5 5 0 0 1 3 5v1"/></Icon>Innovation</span>
            </div>
          </div>

          <div className="info-hero">
            <h1 className="hero-title">Research <span>Portal</span></h1>
            <p className="hero-tagline">Empowering Research. Enabling Innovation.</p>
            <p className="hero-desc">
              A unified platform to manage publications, research profiles and academic
              contributions across NIET.
            </p>
          </div>

          <div className="info-block vision-block">
            <div className="info-symbol"><Icon size={25}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon></div>
            <div><h2 className="info-heading">Our <span>Vision</span></h2>
            <p className="info-text">
              To be an institute of academic excellence in digital arena with global outreach
              delivering socially responsible professionals to become a university and an
              entrepreneurial hub.
            </p></div>
          </div>

          <div className="info-block">
            <div className="info-symbol"><Icon size={25}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 7-7M15 5h4v4"/></Icon></div>
            <div><h2 className="info-heading">Our <span>Mission</span></h2>
            <p className="info-text">
              To impart quality education and hone students' skills and competencies making them
              future ready. To foster an ecosystem for research, product development, innovation,
              incubation, and entrepreneurship. To instill values and ethics to produce socially
              responsible technocrats addressing global problems. To develop an environment for
              sharing and exchange of resources globally for lifelong learning.
            </p></div>
          </div>

          <div className="feature-strip">
            <span><Icon><path d="M3 5.5A3.5 3.5 0 0 1 6.5 2H21v16H6.5A3.5 3.5 0 0 0 3 21.5z"/><path d="M3 5.5v16"/></Icon>Research Profiles</span>
            <span><Icon><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></Icon>Publications</span>
            <span><Icon><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1m2-9a3 3 0 1 0 0-6m1 9a5 5 0 0 1 3 5"/></Icon>Collaboration</span>
            <span><Icon><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></Icon>Global Impact</span>
          </div>
        </div>

        <div className="login-form-box">
          <div className="form-inner">
            <h1 className="form-title">Welcome back!</h1>
            <div className="title-accent" />
            <p className="form-subtitle">Sign in to your research portal</p>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="field">
                <label className="field-label">Email Address</label>
                <div className="email-wrap">
                  <span className="input-icon"><Icon><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Icon></span>
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address"
                    value={email}
                    autoComplete="username"
                    onChange={e => setEmail(e.target.value)}
                    className="field-input"
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Password</label>
                <div className="pw-wrap">
                  <span className="input-icon"><Icon><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></Icon></span>
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="Enter your password"
                    value={password}
                    autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw(s => !s)}
                    tabIndex={-1}
                  >
                    {showPw ? <Icon><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 10 7 10 7a16 16 0 0 1-3.1 3.8M6.2 6.2C3.5 8.1 2 12 2 12s4 7 10 7a10 10 0 0 0 4-.8"/></Icon> : <Icon><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-option"><input type="checkbox" checked={rememberMe} onChange={e => handleRemember(e.target.checked)} /><span className="custom-check"><Icon size={14}><path d="m5 12 4 4L19 6"/></Icon></span>Remember me</label>
                <a href="/forgot-password">Forgot password?</a>
              </div>

              <button type="submit" disabled={loading} className="signin-btn">
                <span className="login-button-icon"><Icon><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></Icon></span>{loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="divider"><span>or</span></div>

            <a href="/admin" className="admin-link"><Icon><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></Icon>Admin Login <span>→</span></a>
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
          padding: 32px 24px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        .login-frame {
          position: relative;
          width: 100%;
          max-width: 1370px;
          min-height: min(750px, calc(100vh - 64px));
          display: grid;
          grid-template-columns: 1.32fr 1fr;
          gap: 0;
          align-items: stretch;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.38);
          border-radius: 24px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
        }
        .login-info-box, .login-form-box {
          padding: 36px 40px 30px;
          background: rgba(10, 18, 26, 0.38);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 0;
          color: #fff;
        }
        .login-info-box { display:flex; flex-direction:column; }
        .login-form-box {
          border-left: 1px solid rgba(255,255,255,0.22);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .info-topline { display:flex; align-items:center; gap:28px; margin-bottom:23px; }
        .info-logo {
          flex:none; width: 205px; height: 90px; border-radius: 16px;
          background: #fff;
          padding: 12px 20px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .info-logo img { width: 100%; height: 100%; object-fit: contain; }
        .brand-values {display:flex;align-items:center;gap:13px;color:rgba(255,255,255,.9);font-size:13px;white-space:nowrap}
        .brand-values span {display:flex;align-items:center;gap:7px}.brand-values svg{color:#dbeafe}.brand-values i{height:20px;width:1px;background:rgba(255,255,255,.42)}
        .info-name { font-size: 24px; font-weight: 700; letter-spacing: 0.02em; }
        .info-place { font-size: 13px; color: rgba(255,255,255,0.7); }
        .info-hero { margin-bottom: 22px; }
        .hero-title { font-size: 40px; font-weight: 750; margin: 0 0 3px; line-height: 1.12; letter-spacing:-.035em; }
        .hero-title span,.info-heading span {background:linear-gradient(100deg,#3aa3ff,#a179ff);background-clip:text;-webkit-background-clip:text;color:transparent}
        .hero-tagline { font-size: 18px; font-weight: 650; color: rgba(255,255,255,0.96); margin: 0 0 9px; }
        .hero-desc { font-size: 13.5px; line-height: 1.65; color: rgba(255,255,255,0.75); margin: 0; max-width: 480px; }
        .info-block { margin-bottom: 14px; display:grid;grid-template-columns:50px 1fr;gap:16px;align-items:start; }
        .vision-block{border-top:1px solid rgba(143,92,246,.8);padding-top:20px}
        .info-symbol{width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#8057ff,#4e4cf6);display:grid;place-items:center;box-shadow:0 8px 20px #3b20a966}
        .info-heading {
          font-size: 16px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.025em; color: rgba(255,255,255,.9); margin: 0 0 5px;
        }
        .info-text {
          font-size: 13px; line-height: 1.55; color: rgba(255,255,255,0.91); margin: 0;
        }
        .feature-strip{margin-top:auto;display:flex;justify-content:space-around;align-items:center;gap:8px;padding:14px 10px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.1);border-radius:18px}
        .feature-strip span{display:flex;align-items:center;gap:8px;font-size:11px;white-space:nowrap;padding:0 8px}.feature-strip span+span{border-left:1px solid rgba(255,255,255,.2)}.feature-strip svg{color:#e1eaff;flex:none}

        .form-inner { width: 100%; max-width: 445px; padding:34px 32px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.26);border-radius:25px;box-shadow:0 14px 50px rgba(0,0,0,.16); }
        .form-logo { display: none; }
        .form-title { font-size: 34px; font-weight: 750; margin: 0 0 13px; letter-spacing:-.025em }
        .title-accent{width:64px;height:3px;background:linear-gradient(90deg,#8b5cf6,#48a4ff);margin-bottom:15px;border-radius:2px}
        .form-subtitle { font-size: 16px; color: rgba(255,255,255,0.86); margin: 0 0 28px; }
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
          width: 100%; padding: 14px 48px 14px 56px; box-sizing: border-box;
          background: rgba(255,255,255,0.08);
          border: 1.5px solid rgba(255,255,255,0.48);
          border-radius: 14px; font-size: 14px; color: #fff; outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.4); }
        .field-input:focus { border-color: #8b7dff; background: rgba(255,255,255,0.12); }
        .pw-wrap,.email-wrap { position: relative; }.input-icon{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#fff;display:flex;pointer-events:none}
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color:#fff;display:flex;cursor: pointer; padding: 4px;
        }
        .form-options{display:flex;justify-content:space-between;align-items:center;margin:0 0 22px}.form-options a{font-size:12px;color:#b9aaff;text-decoration:none;font-weight:600}.form-options a:hover{text-decoration:underline}
        .remember-option{display:flex;align-items:center;gap:9px;font-size:12px;color:rgba(255,255,255,.94);cursor:pointer}.remember-option input{position:absolute;opacity:0;width:1px;height:1px}.custom-check{width:19px;height:19px;border:1px solid rgba(255,255,255,.55);border-radius:5px;display:grid;place-items:center;color:transparent}.remember-option input:checked+.custom-check{background:linear-gradient(135deg,#9158f7,#3aa4ff);border-color:transparent;color:#fff}
        .signin-btn {
          width: 100%; padding: 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 16px;
          font-size: 16px; font-weight: 700; color: #fff; cursor: pointer;display:flex;align-items:center;justify-content:center;gap:10px;
          background: linear-gradient(110deg, #7550f6 0%, #536cf7 52%, #2b9ff2 100%);
          box-shadow: 0 10px 26px rgba(73,91,245,0.48),inset 0 1px 0 rgba(255,255,255,.35);
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
        }
        .signin-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(107,78,245,0.5); }
        .signin-btn:disabled { opacity: 0.75; cursor: default; }
        .login-button-icon{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.25)}.divider { display: flex; align-items: center; gap: 12px; margin: 25px 0 18px; }
        .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.18); }
        .divider span { font-size: 11px; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.08em; }
        .admin-link {
          display: flex;align-items:center;justify-content:center;gap:10px; text-align: center; padding: 13px; border-radius: 15px;
          font-size: 13.5px; font-weight: 600; color: #fff; text-decoration: none;
          border: 1.5px solid rgba(255,255,255,0.42); background: rgba(255,255,255,0.06);
          transition: background 0.18s, border-color 0.18s;
        }
        .admin-link:hover { background: rgba(255,255,255,0.14); border-color: rgba(255,255,255,0.5); }
        .admin-link span{font-size:19px;line-height:12px}

        @media (max-width: 1050px) {
          .login-page{padding:20px}.login-frame { grid-template-columns: 1fr; max-width: 680px;min-height:auto }
          .login-info-box, .login-form-box { padding: 28px 26px; }
          .login-form-box { border-left: none; border-top: 1px solid rgba(255,255,255,0.2); }
          .info-topline{justify-content:space-between;gap:12px;margin-bottom:20px}.info-logo{width:175px;height:76px}
          .form-inner{padding:26px 24px}.feature-strip{margin-top:12px}
        }
        @media (max-width: 520px) {
          .login-page{padding:12px}.login-info-box,.login-form-box{padding:22px 17px}
          .brand-values{gap:7px;font-size:10px}.brand-values span{gap:4px}.brand-values svg{width:15px;height:15px}.info-logo{width:140px;height:62px;padding:8px 12px}
          .hero-title{font-size:34px}.hero-tagline{font-size:15px}.hero-desc{font-size:13px}.info-block{grid-template-columns:40px 1fr;gap:12px}.info-symbol{width:40px;height:40px}.info-text{font-size:12px}
          .feature-strip{flex-wrap:wrap;justify-content:flex-start}.feature-strip span{width:calc(50% - 20px);padding:4px 8px}.feature-strip span+span{border-left:0}
          .form-inner{padding:23px 18px}.form-title{font-size:29px}
        }
      `}</style>
    </div>
  );
}
