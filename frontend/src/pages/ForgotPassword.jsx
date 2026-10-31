import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import OtpInput from "../components/OtpInput";
import {
  forgotPasswordRequest,
  forgotPasswordVerify,
  forgotPasswordReset,
  checkPasswordStrength,
} from "../services/api";

const STEPS = ["Verify identity", "Enter OTP", "Set new password", "Done"];
const P = "#534AB7";
const inviteParams = new URLSearchParams(window.location.search);
const activationEmail = inviteParams.get("activation") === "1" ? (inviteParams.get("email") || "").trim().toLowerCase() : "";
const maskEmail = (email) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
};

export default function ForgotPassword() {
  const [step, setStep]             = useState(activationEmail ? 1 : 0);
  const [identifier, setIdentifier] = useState(activationEmail);
  const [otp, setOtp]               = useState("");
  const [masked, setMasked]         = useState(activationEmail ? maskEmail(activationEmail) : "");
  const [otpRequested, setOtpRequested] = useState(!!activationEmail);
  const [resendIn, setResendIn]     = useState(300);
  const retryRef                    = useRef(60);
  const [newPass, setNewPass]       = useState("");
  const [confirm, setConfirm]       = useState("");
  const [rules, setRules]           = useState([]);
  const [strength, setStrength]     = useState("");
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState(activationEmail ? "Your account setup code was sent to your registered email." : "");
  const [fallbackCode, setFallbackCode] = useState("");
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (otpRequested && resendIn > 0) {
      const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [resendIn, otpRequested, step]);

  const resetOtpTimer = (sec) => { setResendIn(sec || retryRef.current); setOtpRequested(true); };

  const go = async (fn, okCallback) => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fn();
      okCallback(res);
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = (e) => {
    e.preventDefault();
    go(() => forgotPasswordRequest(identifier), (res) => {
      setMasked(res.data.masked_contact);
      setSuccess(res.data.message || "OTP request completed.");
      setFallbackCode(res.data.delivery === "in_app_fallback" ? (res.data.fallback_code || "") : "");
      retryRef.current = res.data.retry_after_seconds || 60;
      resetOtpTimer(retryRef.current);
      setStep(1);
    });
  };

  const handleOtpComplete = (obj) => {
    if (obj.complete) setOtp(obj.values.join(""));
  };

  const handleVerify = () => {
    go(() => forgotPasswordVerify(otp, identifier), () => setStep(2));
  };

  const handleResend = () => {
    setFallbackCode("");
    go(() => forgotPasswordRequest(identifier), (res) => {
      setMasked(res.data.masked_contact);
      setSuccess(res.data.message || "A new OTP has been requested.");
      setFallbackCode(res.data.delivery === "in_app_fallback" ? (res.data.fallback_code || "") : "");
      retryRef.current = res.data.retry_after_seconds || 60;
      resetOtpTimer(retryRef.current);
    });
  };

  const fmtTimer = (s) => `0${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const handleStrength = async (val) => {
    setNewPass(val);
    try {
      const res = await checkPasswordStrength(val);
      const ruleMap = res.data.rules;
      const labels = {
        length: "8–64 characters",
        uppercase: "One uppercase letter",
        lowercase: "One lowercase letter",
        number: "One number",
        special: "One special character",
      };
      setRules(Object.keys(labels).map(k => ({ label: labels[k], passed: !!ruleMap[k] })));
      setStrength(res.data.strength);
    } catch { /* ignore */ }
  };

  const handleReset = () => {
    if (!otp) { setError("Enter the OTP you received."); return; }
    if (newPass !== confirm) { setError("Passwords do not match."); return; }
    if (strength === "weak") { setError("Please choose a stronger password."); return; }
    go(() => forgotPasswordReset({ identifier, otp, new_password: newPass }), () => setStep(3));
  };

  return (
    <div className="fp-page">
      <div className="fp-frame">

        {/* LEFT */}
        <div className="fp-info-box">
          <div className="fp-brand">
            <div className="fp-logo">
              <img src="/niet-logo.svg" alt="NIET" />
            </div>
          </div>
          <h1 className="fp-title">Reset Password</h1>
          <p className="fp-subtitle">Securely recover access to your Research Portal account</p>
          <p className="fp-desc">
            A one-time password (OTP) is sent to your registered contact to verify your identity
            before setting a new password.
          </p>
          <div className="fp-foot">Excellence in Research · Impacting the Future</div>
        </div>

        {/* RIGHT */}
        <div className="fp-form-box">
          <div className="fp-inner">

            <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
              <Link to="/" style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", textDecoration: "none" }}>
                ← Back to login
              </Link>
            </div>

            {/* Progress */}
            <div style={{ display: "flex", marginBottom: 28 }}>
              {STEPS.map((label, i) => (
                <div key={label} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700,
                    background: i <= step ? P : "rgba(255,255,255,0.15)",
                    color: i <= step ? "#fff" : "rgba(255,255,255,0.5)",
                  }}>{i < step ? "✓" : i + 1}</div>
                  <div style={{ fontSize: 10, marginTop: 6, color: i === step ? "#b9aaff" : "rgba(255,255,255,0.55)",
                    fontWeight: i === step ? 600 : 400 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background: "rgba(249,80,80,0.16)", color: "#ffd6d6",
                border: "1px solid rgba(255,150,150,0.3)", padding: "10px 14px",
                borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>
            )}
            {success && (
              <div style={{ background: "rgba(46,180,110,0.16)", color: "#c9f0dc",
                border: "1px solid rgba(120,220,160,0.35)", padding: "10px 14px",
                borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{success}</div>
            )}

            {/* STEP 0 — email */}
            {step === 0 && (
              <form onSubmit={handleRequest}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Find your account
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 26 }}>
                  Enter your registered email address. We'll send a one-time
                  password (OTP) to your inbox to reset your password.
                </div>
                <label style={lbl}>Registered email</label>
                <input
                  type="email" required value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="yourname@niet.co.in"
                  style={inp}
                />
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>
                  The OTP is sent to your registered email address only.
                </div>
                <button type="submit" disabled={loading || identifier.trim().length < 7} style={btn}>
                  {loading ? "Sending OTP..." : "Send OTP →"}
                </button>
              </form>
            )}

            {/* STEP 1 — OTP */}
            {step === 1 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Enter verification code
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
                  {activationEmail ? <>Your faculty account is ready. Enter the setup code sent to <b style={{ color: "#b9aaff" }}>{masked}</b> to verify your email and choose a password.</> : fallbackCode ? <>Email delivery was unavailable. Use the temporary code shown below for <b style={{ color: "#b9aaff" }}>{masked}</b>.</> : <>We sent a 6-digit code by email to <b style={{ color: "#b9aaff" }}>{masked}</b>.</>}
                </div>
                {fallbackCode && (
                  <div role="status" aria-live="polite" style={{
                    margin: "12px 0 18px", padding: "14px 16px", borderRadius: 12,
                    border: "1px solid rgba(255,190,90,.55)", background: "rgba(120,75,15,.28)",
                    textAlign: "center", color: "#fff",
                  }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.8)", marginBottom: 6 }}>TEMPORARY VERIFICATION CODE</div>
                    <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 8 }}>{fallbackCode}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", marginTop: 7 }}>Expires in 5 minutes. Do not share this code.</div>
                  </div>
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: "#b9aaff", textAlign: "center", marginBottom: 18 }}>
                  {fmtTimer(resendIn)}
                </div>
                <OtpInput length={6} onChange={handleOtpComplete} />
                <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  {resendIn > 0 ? (
                    <>Resend available after the countdown</>
                  ) : (
                    <span onClick={handleResend} style={{ color: "#b9aaff", cursor: "pointer",
                      fontWeight: 600 }}>Resend code</span>
                  )}
                </div>
                <button disabled={otp.length !== 6 || loading} onClick={handleVerify} style={{
                  ...btn, marginTop: 26, opacity: otp.length === 6 ? 1 : 0.5 }}>
                  {loading ? "Verifying..." : "Verify →"}
                </button>
              </div>
            )}

            {/* STEP 2 — new password */}
            {step === 2 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Set a new password
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>
                  Choose a strong password you haven't used before.
                </div>
                <label style={lbl}>New password</label>
                <input type="password" value={newPass} onChange={e => handleStrength(e.target.value)}
                  style={inp} placeholder="Enter new password" />
                <label style={{ ...lbl, marginTop: 16 }}>Confirm new password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  style={inp} placeholder="Re-enter new password" />

                {newPass && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: 20 }}>{strength === "strong" ? "🟢" : strength === "medium" ? "🟡" : "🔴"}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
                        {strength === "strong" ? "Strong" : strength === "medium" ? "Medium" : "Weak"}
                      </span>
                    </div>
                    <StrengthenBar strength={strength} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                      {rules.map(r => (
                        <div key={r.label} style={{ fontSize: 12, color: r.passed ? "#7fe0aa" : "rgba(255,255,255,0.55)" }}>
                          {r.passed ? "✓" : "•"} {r.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button disabled={loading} onClick={handleReset} style={{ ...btn, marginTop: 26 }}>
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </div>
            )}

            {/* STEP 3 — success */}
            {step === 3 && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
                  background: "rgba(46,180,110,0.2)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 34 }}>🎉</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 10 }}>
                  Password reset complete
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>
                  Your password has been updated. Login with your new credentials.
                </div>
                <Link to="/" style={{ ...btn, display: "block", textAlign: "center",
                  textDecoration: "none", background: "linear-gradient(135deg, #6a4cf5 0%, #8b5cf6 45%, #3b82f6 100%)" }}>
                  Go to login →
                </Link>
              </div>
            )}

          </div>
        </div>
      </div>

      <style>{`
        .fp-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: url('/admin-bg.jpg') center/cover no-repeat fixed;
          padding: 40px 24px;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
        }
        .fp-frame {
          position: relative;
          width: 100%;
          max-width: 1060px;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 0;
          align-items: stretch;
          overflow: hidden;
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45);
        }
        .fp-info-box, .fp-form-box {
          padding: 46px 44px;
          background: rgba(0,0,0,0.42);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
        }
        .fp-form-box {
          border-left: 1px solid rgba(255,255,255,0.14);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .fp-brand { margin-bottom: 30px; }
        .fp-logo {
          width: 220px; height: 96px; border-radius: 14px;
          background: #fff;
          padding: 14px 22px; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
        }
        .fp-logo img { width: 100%; height: 100%; object-fit: contain; }
        .fp-title { font-size: 30px; font-weight: 700; margin: 0 0 10px; line-height: 1.2; }
        .fp-subtitle { font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.9); margin: 0 0 12px; }
        .fp-desc { font-size: 13.5px; line-height: 1.7; color: rgba(255,255,255,0.75); margin: 0; max-width: 460px; }
        .fp-foot { margin-top: 36px; font-size: 12px; color: rgba(255,255,255,0.4); }

        .fp-inner { width: 100%; max-width: 400px; }

        @media (max-width: 900px) {
          .fp-frame { grid-template-columns: 1fr; max-width: 540px; }
          .fp-info-box, .fp-form-box { padding: 30px 26px; }
          .fp-form-box { border-left: none; border-top: 1px solid rgba(255,255,255,0.14); }
        }
      `}</style>
    </div>
  );
}

function StrengthenBar({ strength }) {
  const pct = strength === "strong" ? 100 : strength === "medium" ? 60 : 25;
  const col = strength === "strong" ? "#1B7A45" : strength === "medium" ? "#E6A23C" : "#D9534F";
  return (
    <div style={{ width: "100%", height: 6, background: "#eee", borderRadius: 4,
      overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: col,
        transition: "width 0.3s" }} />
    </div>
  );
}

const lbl = { fontSize: 13, fontWeight: 500, color: "#444", display: "block", marginBottom: 6 };
const inp = {
  width: "100%", padding: "11px 14px", border: "1.5px solid #e5e5e5", borderRadius: 9,
  fontSize: 14, color: "#333", outline: "none", boxSizing: "border-box",
};
const btn = {
  width: "100%", padding: "13px", background: P, color: "#fff", borderRadius: 10,
  fontSize: 15, fontWeight: 600, border: "none", cursor: "pointer", marginTop: 24,
};
