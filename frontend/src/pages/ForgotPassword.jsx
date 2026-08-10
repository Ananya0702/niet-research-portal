import { useEffect, useState } from "react";
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

export default function ForgotPassword() {
  const [step, setStep]             = useState(0);
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp]               = useState("");
  const [masked, setMasked]         = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [resendIn, setResendIn]     = useState(300);
  const [newPass, setNewPass]       = useState("");
  const [confirm, setConfirm]       = useState("");
  const [rules, setRules]           = useState([]);
  const [strength, setStrength]     = useState("");
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (otpRequested && resendIn > 0) {
      const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [resendIn, otpRequested, step]);

  const resetOtpTimer = () => { setResendIn(300); setOtpRequested(true); };

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
      resetOtpTimer();
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
    resetOtpTimer();
    go(() => forgotPasswordRequest(identifier), (res) => {
      setMasked(res.data.masked_contact);
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
    <div style={{ minHeight: "100vh", display: "flex", background: "#f7f7f8" }}>
      {/* LEFT */}
      <div style={{
        flex: 1, background: "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url('/admin-bg.jpg') center/cover no-repeat",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 48, color: "#fff",
      }}>
        <div style={{ width: 100, height: 100, background: "rgba(255,255,255,0.12)",
          borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 24, padding: 14 }}>
          <img src="/niet-logo.svg" alt="NIET" style={{ width: "100%", height: "100%",
            objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: 700 }}>Reset Password</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginTop: 12,
          textAlign: "center", maxWidth: 360 }}>
          Securely recover access to your Research Portal account using a
          one-time password (OTP) sent to your registered contact.
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 40 }}>
          Excellence in Research · Impacting the Future
        </div>
      </div>

      {/* RIGHT */}
      <div style={{
        width: 520, background: "#fff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "48px 44px",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Progress */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
            <Link to="/" style={{ fontSize: 13, color: "#888", textDecoration: "none",
              marginRight: 12 }}>← Back to login</Link>
          </div>
          <div style={{ display: "flex", marginBottom: 28 }}>
            {STEPS.map((label, i) => (
              <div key={label} style={{ flex: 1, textAlign: "center" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", margin: "0 auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  background: i < step ? P : i === step ? P : "#eee",
                  color: i <= step ? "#fff" : "#999",
                }}>{i < step ? "✓" : i + 1}</div>
                <div style={{ fontSize: 10, marginTop: 6, color: i === step ? P : "#999",
                  fontWeight: i === step ? 600 : 400 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: "#FCEBEB", color: "#791F1F", padding: "10px 14px",
              borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          {success && (
            <div style={{ background: "#E9F7EF", color: "#1B7A45", padding: "10px 14px",
              borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{success}</div>
          )}

          {/* STEP 0 — mobile number */}
          {step === 0 && (
            <form onSubmit={handleRequest}>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
                Find your account
              </div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 28 }}>
                Enter your registered mobile number. We'll send a one-time
                password (OTP) to your phone to reset your password.
              </div>
              <label style={lbl}>Registered mobile number</label>
              <input
                type="tel" required value={identifier}
                onChange={e => setIdentifier(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Enter your 10-digit mobile number"
                style={inp}
              />
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 8 }}>
                The OTP is sent as an SMS to your registered mobile number only.
              </div>
              <button type="submit" disabled={loading || identifier.trim().length < 7} style={btn}>
                {loading ? "Sending OTP..." : "Send OTP →"}
              </button>
            </form>
          )}

          {/* STEP 1 — OTP */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
                Enter verification code
              </div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>
                We sent a 6-digit code by SMS to <b style={{ color: P }}>{masked}</b>.
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: P, textAlign: "center", marginBottom: 18 }}>
                {fmtTimer(resendIn)}
              </div>
              <OtpInput length={6} onChange={handleOtpComplete} />
              <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#888" }}>
                {resendIn > 0 ? (
                  <>Resend available after the countdown</>
                ) : (
                  <span onClick={handleResend} style={{ color: P, cursor: "pointer",
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
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 6 }}>
                Set a new password
              </div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>
                      {strength === "strong" ? "Strong" : strength === "medium" ? "Medium" : "Weak"}
                    </span>
                  </div>
                  <StrengthenBar strength={strength} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 10 }}>
                    {rules.map(r => (
                      <div key={r.label} style={{ fontSize: 12, color: r.passed ? "#1B7A45" : "#999" }}>
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
                background: "#E9F7EF", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 34 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", marginBottom: 10 }}>
                Password reset complete
              </div>
              <div style={{ fontSize: 14, color: "#888", marginBottom: 28 }}>
                Your password has been updated. Login with your new credentials.
              </div>
              <Link to="/" style={{ ...btn, display: "block", textAlign: "center",
                textDecoration: "none" }}>Go to login →</Link>
            </div>
          )}

        </div>
      </div>
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