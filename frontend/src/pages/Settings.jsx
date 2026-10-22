import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import OtpInput from "../components/OtpInput";
import API, {
  getAccountInfo, updateAccountInfo, verifyAccountInfo,
  changePasswordRequest, changePasswordVerify, changePasswordConfirm,
  emailChangePasswordRequest, emailChangePasswordVerify, emailChangePasswordConfirm,
  checkPasswordStrength,
} from "../services/api";

const P = "#5B3DF5";

const TABS = [
  { key: "account",       icon: "👤", label: "Account" },
  { key: "security",      icon: "🔒", label: "Security" },
  { key: "notifications", icon: "🔔", label: "Notifications" },
  { key: "preferences",   icon: "⚙️", label: "Preferences" },
  { key: "privacy",       icon: "🛡", label: "Privacy" },
  { key: "sessions",      icon: "💻", label: "Sessions" },
  { key: "integrations",  icon: "🔗", label: "Integrations" },
];

const PW_LABELS = {
  length: "8–64 characters",
  uppercase: "One uppercase letter",
  lowercase: "One lowercase letter",
  number: "One number",
  special: "One special character",
};

export default function Settings() {
  const [tab, setTab] = useState("account");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState(null);
  const [profile, setProfile] = useState(null);

  const [editModal, setEditModal] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editMobile, setEditMobile] = useState("");

  // Change-password stepper
  const [pwModal, setPwModal] = useState(false);
  const [pwStep, setPwStep] = useState(0);
  const [pwMasked, setPwMasked] = useState("");
  const [pwOtp, setPwOtp] = useState("");
  const [resendIn, setResendIn] = useState(300);
  const [otpRequested, setOtpRequested] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwRules, setPwRules] = useState([]);
  const [pwStrength, setPwStrength] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const otpKey = useRef(0);
  const resendRef = useRef(60);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  useEffect(() => {
    API.get("/faculty/me/profile").then(r => setProfile(r.data)).catch(() => {});
    getAccountInfo().then(r => {
      setAccount(r.data);
      if (r.data.force_password_reset) {
        setTab("security");
        openPwModal();
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (otpRequested && resendIn > 0) {
      const t = setInterval(() => setResendIn(s => (s > 0 ? s - 1 : 0)), 1000);
      return () => clearInterval(t);
    }
  }, [otpRequested, resendIn]);

  const resetOtpTimer = (sec) => { setResendIn(sec || 60); setOtpRequested(true); otpKey.current++; setPwOtp(""); };

  const fmtTimer = (s) => `0${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const runPw = async (fn) => {
    setPwLoading(true); setPwError(""); setPwSuccess("");
    try { return await fn(); }
    catch (err) {
      const d = err.response?.data;
      const detail = typeof d === "object" ? d?.detail : (typeof d === "string" && !d.includes("<html") ? d : null);
      const msg = detail || (err.response?.status === 502 || err.response?.status === 504 ? "Server is restarting, please retry in 10 seconds." : null) || err.message || "Something went wrong.";
      setPwError(msg);
      return null;
    }
    finally { setPwLoading(false); }
  };

  // ── Change password flow ────────────────────────────────────────────────
  const openPwModal = () => {
    setPwAction(null);
    setPwModal(true); setPwStep(0); setPwError(""); setPwSuccess("");
    setPwNew(""); setPwConfirm(""); setPwRules([]); setPwStrength("");
    setOtpRequested(false); setResendIn(300);
  };

  const sendOtp = async () => {
    if (pwAction === "verify_contact") {
      const res = await runPw(() => changePasswordRequest("verify_contact"));
      if (!res) return;
      setPwMasked(res.data.masked_contact);
      resetOtpTimer(300);
      setPwStep(1);
      return;
    }
    const res = await runPw(() => emailChangePasswordRequest(account?.email || ""));
    if (!res) return;
    setPwMasked(res.data.masked_contact);
    if (res.data.message) setPwSuccess(res.data.message);
    resendRef.current = res.data.retry_after_seconds || 60;
    resetOtpTimer(res.data.retry_after_seconds || 60);
    setPwStep(1);
  };

  const handleOtpChange = (obj) => { if (obj.complete) setPwOtp(obj.values.join("")); };

  const verifyOtp = async () => {
    const res = await runPw(() => emailChangePasswordVerify(pwOtp));
    if (!res) return;
    setPwStep(2);
  };

  const resendOtp = () => {
    if (pwAction === "verify_contact") {
      resetOtpTimer(300);
      runPw(() => changePasswordRequest("verify_contact"));
      return;
    }
    resetOtpTimer(resendRef.current);
    runPw(() => emailChangePasswordRequest(account?.email || ""));
  };

  const handlePwStrength = async (val) => {
    setPwNew(val);
    try {
      const r = await checkPasswordStrength(val);
      setPwRules(Object.keys(PW_LABELS).map(k => ({ label: PW_LABELS[k], passed: !!r.data.rules[k] })));
      setPwStrength(r.data.strength);
    } catch { /* ignore */ }
  };

  const confirmPassword = async () => {
    if (pwNew !== pwConfirm) { setPwError("Passwords do not match."); return; }
    if (pwStrength === "weak") { setPwError("Please choose a stronger password."); return; }
    const res = await runPw(() => emailChangePasswordConfirm({ new_password: pwNew }));
    if (!res) return;
    setPwSuccess(res.data.message);
    setPwStep(3);
  };

  const finishPw = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  // ── Account info edit ────────────────────────────────────────────────────
  const openEdit = () => {
    setEditEmail(account?.email || "");
    setEditMobile(account?.mobile_number || "");
    setEditModal(true);
  };

  const saveAccountInfo = async () => {
    setSaving(true);
    try {
      await updateAccountInfo({ email: editEmail, mobile_number: editMobile });
      const r = await getAccountInfo();
      setAccount(r.data);
      showMsg("success", "✅ Account information updated. Verification status reset — please re-verify.");
      setEditModal(false);
    } catch (err) { showMsg("error", err.response?.data?.detail || "Failed to update."); }
    finally { setSaving(false); }
  };

  const startVerify = async (field) => {
    if (field !== "mobile") { showMsg("error", "Only mobile number verification is supported."); return; }
    if (!account?.mobile_number) { showMsg("error", "No mobile number to verify. Add one in Account Information."); return; }
    setPwAction("verify_contact");
    setPwStep(0);
    setPwError(""); setPwSuccess("");
    setPwModal(true);
    const res = await runPw(() => changePasswordRequest("verify_contact"));  // reuse OTP send path
    if (!res) return;
    setPwMasked(res.data.masked_contact);
    resetOtpTimer(300);
    setPwStep(1);
  };
  const [pwAction, setPwAction] = useState(null);

  const confirmVerify = async () => {
    const res = await runPw(() => verifyAccountInfo("mobile", pwOtp));
    if (!res) return;
    const r = await getAccountInfo();
    setAccount(r.data);
    showMsg("success", "✅ Mobile number verified successfully");
    setPwModal(false);
  };

  const role = localStorage.getItem("role") || "faculty";
  const name = localStorage.getItem("name") || "User";
  const email = account?.email || localStorage.getItem("email") || "";
  const initials = name.split(" ").filter(w => !w.startsWith("Dr.")).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const roleLabel = role === "hod" ? "Head of Department" : role === "dean_rd" ? "Dean" : "Faculty";

  const completionChecks = [
    !!(profile?.name && profile?.designation),
    !!profile?.bio,
    !!profile?.google_scholar_id,
    !!(profile?.total_publications > 0),
    !!(profile?.profile_photo_url),
  ];
  const completion = Math.round((completionChecks.filter(Boolean).length / completionChecks.length) * 100);

  return (
    <Layout>
      {msg && <div style={{ position:"fixed",top:16,right:16,zIndex:999,background:msg.type==="success"?"#EAF3DE":"#FCEBEB",color:msg.type==="success"?"#27500A":"#791F1F",padding:"10px 18px",borderRadius:10,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}>{msg.text}</div>}

      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#f5f5f8" }}>

        {/* Top Header */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e8e8ee", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a1a1a" }}>Settings</div>
            <div style={{ fontSize:11, color:"#888", marginTop:1 }}>Manage your account, security and preferences.</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <input placeholder="Search settings..." style={{ padding:"6px 10px 6px 28px", border:"1px solid #e0e0e8", borderRadius:20, fontSize:12, width:180, outline:"none", background:"#f8f8fb" }} />
              <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#aaa" }}>🔍</span>
            </div>
            <span style={{ fontSize:15, cursor:"pointer", color:"#888" }}>🔔</span>
            <span style={{ fontSize:15, cursor:"pointer", color:"#888" }}>✉</span>
            <div style={{ width:30,height:30,borderRadius:"50%",background:P,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:600 }}>{initials}</div>
          </div>
        </div>

        {/* Settings Tabs */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e8e8ee", padding:"0 20px", display:"flex", gap:0, flexShrink:0 }}>
          {TABS.map(t => (
            <div key={t.key} onClick={() => setTab(t.key)} style={{
              padding:"10px 16px", fontSize:12, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", gap:6,
              color: tab===t.key ? P : "#888",
              borderBottom: tab===t.key ? `2px solid ${P}` : "2px solid transparent",
              transition:"all 0.15s",
            }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>

          {/* ═══ ACCOUNT TAB ═══ */}
          {tab === "account" && (
            <div style={{ display:"flex", gap:14, alignItems:"start" }}>

              {/* Left Column */}
              <div style={{ flex:1, display:"flex", flexDirection:"column", gap:14 }}>

                {/* Account Info */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:"#1a1a1a" }}>Account Information</span>
                    <span onClick={openEdit} style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500, padding:"4px 12px", border:"1px solid "+P, borderRadius:6 }}>✏ Edit</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px" }}>
                    {[
                      ["Full Name", name],
                      ["Role", roleLabel],
                      ["Department", profile?.dept_name || "—"],
                      ["Email", email, account?.email_verified ? "✅ Verified" : "Not verified", account?.email_verified],
                      ["Mobile", account?.mobile_display || account?.mobile_number || "Not set", account?.mobile_verified ? "✅ Verified" : (account?.mobile_number ? "Verify" : null), account?.mobile_verified],
                      ["Employee ID", profile?.employee_id || "Not set"],
                      ["Joining Year", profile?.joining_year || "—"],
                      ["Account Status", account?.locked ? "🔴 Locked" : "🟢 Active"],
                    ].map(([label, val, badge, verified]) => (
                      <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}>
                        <div>
                          <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                          <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                            {val}
                            {badge && !verified && badge !== "Verify" && badge !== null && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background: badge.startsWith("✅") ? "#EAF3DE" : "#FDF3D7", color: badge.startsWith("✅") ? "#27500A" : "#8a6d1a", fontWeight:500 }}>{badge}</span>}
                            {badge === "Verify" && (
                              <span onClick={() => startVerify("mobile")} style={{ fontSize:9, padding:"2px 8px", borderRadius:6, background:"#FDF3D7", color:"#8a6d1a", fontWeight:600, cursor:"pointer" }}>Verify →</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Change Password */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:"#1a1a1a" }}>Change Password</span>
                  </div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>
                    Password changed on: <b>{account?.last_password_changed ? new Date(account.last_password_changed).toLocaleDateString() : "Never"}</b> ·
                    All your other sessions will be logged out.
                  </div>
                  <button onClick={openPwModal} style={{ width:"100%",padding:"10px",background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>🔒 Change Password (Email OTP)</button>
                </div>

                {/* Logout */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1a1a1a", marginBottom:6 }}>Logout</div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:12 }}>This will end your current session and redirect you to the login page.</div>
                  <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} style={{ padding:"9px 24px", border:"1px solid #A32D2D", borderRadius:8, fontSize:12, fontWeight:500, color:"#A32D2D", background:"#fff", cursor:"pointer" }}>Logout</button>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ width:280, flexShrink:0, display:"flex", flexDirection:"column", gap:14 }}>

                {/* Profile Completion */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ position:"relative", width:90, height:90, margin:"0 auto 10px" }}>
                    <svg viewBox="0 0 36 36" style={{ width:"100%",height:"100%", transform:"rotate(-90deg)" }}>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f5" strokeWidth="2.5" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={P} strokeWidth="2.5" strokeDasharray={`${completion},100`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:P }}>{completion}%</div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>Profile Completion</div>
                  <div style={{ textAlign:"left", marginTop:10, fontSize:11 }}>
                    {[
                      [completionChecks[0],"Basic Information"],
                      [completionChecks[1],"Professional Details"],
                      [completionChecks[2],"Academic Identity"],
                      [completionChecks[3],"Research Links"],
                      [completionChecks[4],"Profile Photo"],
                    ].map(([done,label]) => (
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 0" }}>
                        <span style={{ color: done ? "#27500A" : "#ccc" }}>{done ? "✅" : "○"}</span>
                        <span style={{ color: done ? "#1a1a1a" : "#888" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Account Security Status */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>🛡 Account Security</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      ["Registered email", account ? (account.email || "—") : "—", account?.email_verified],
                      ["Registered mobile", account?.mobile_number || "—", account?.mobile_verified],
                    ].map(([label, val, verified]) => (
                      <div key={label} style={{ padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                        <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                        <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                          {val}
                          {verified
                            ? <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#EAF3DE", color:"#27500A" }}>✅ Verified</span>
                            : <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#FDF3D7", color:"#8a6d1a" }}>Unverified</span>}
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize:10, color:"#888" }}>
                      Password last changed: <b>{account?.last_password_changed ? new Date(account.last_password_changed).toLocaleString() : "Never"}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECURITY TAB ═══ */}
          {tab === "security" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Contact Verification</div>
                <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>OTP-based password reset uses your registered mobile number. Verify it so you can reset your password if you ever get locked out.</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  {[
                    ["✉", "Email Address", account?.email || "Not set", account?.email_verified, "email"],
                    ["📞", "Mobile Number", account?.mobile_display || account?.mobile_number || "Not set", account?.mobile_verified, "mobile"],
                  ].map(([icon,title,val,verified,field]) => (
                    <div key={field} style={{ border:"1px solid #eee", borderRadius:12, padding:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:20 }}>{icon}</span>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600 }}>{title}</div>
                          <div style={{ fontSize:10, color:"#888" }}>{val}</div>
                          {verified && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#EAF3DE", color:"#27500A", marginTop:4, display:"inline-block" }}>✅ Verified</span>}
                        </div>
                      </div>
                      {field === "mobile" && !verified && val !== "Not set" && (
                        <button onClick={() => startVerify(field)} style={{ padding:"6px 12px", background:P, color:"#fff", borderRadius:6, fontSize:10, fontWeight:500, border:"none", cursor:"pointer" }}>Verify</button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:12, fontSize:11, color:"#888" }}>
                  Note: changing your mobile number in Account Information will reset its verification status. All OTPs are delivered to your mobile number only.
                </div>
              </div>

              <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Password</div>
                <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>
                  For your security, changing your password requires an OTP sent to your registered email and will log out all devices.
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <button onClick={openPwModal} style={{ padding:"9px 20px", background:P, color:"#fff", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>🔒 Change Password</button>
                  <span style={{ fontSize:11, color:"#888" }}>Last changed: {account?.last_password_changed ? new Date(account.last_password_changed).toLocaleDateString() : "Never"}</span>
                </div>
                {account?.force_password_reset && (
                  <div style={{ marginTop:12, background:"#FDF3D7", color:"#8a6d1a", padding:"10px 14px", borderRadius:8, fontSize:12 }}>
                    ⚠ An administrator has requested you to change your password. Please do so now.
                  </div>
                )}
              </div>

              <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Recent Login Activity</div>
                <div style={{ fontSize:11, color:"#888", marginBottom:12 }}>Login and security events on your account.</div>
                <div style={{ maxHeight:240, overflowY:"auto" }}>
                  {[
                    ["🟢", "Successful Login", "Session created", "—"],
                  ].map(([icon,title,desc,time]) => (
                    <div key={title} style={{ display:"flex", gap:8, padding:"7px 0", borderBottom:"1px solid #f5f5f5" }}>
                      <span style={{ fontSize:14, width:20 }}>{icon}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:11, fontWeight:500, color:"#1a1a1a" }}>{title}</div>
                        <div style={{ fontSize:10, color:"#888" }}>{desc}</div>
                      </div>
                      <div style={{ fontSize:9, color:"#aaa", whiteSpace:"nowrap" }}>{time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ NOTIFICATIONS TAB ═══ */}
          {tab === "notifications" && (
            <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Notification Preferences</div>
              <div style={{ display:"grid", gap:8 }}>
                {[
                  ["Email Notifications", true],
                  ["SMS Notifications", false],
                  ["Push Notifications", true],
                  ["Research Alerts", true],
                  ["Publication Updates", true],
                  ["Collaboration Requests", true],
                  ["Weekly Reports", false],
                ].map(([label,on]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                    <span style={{ fontSize:12, color:"#1a1a1a" }}>{label}</span>
                    <div style={{ width:36,height:20,borderRadius:10,background:on?P:"#ddd",position:"relative",cursor:"pointer",transition:"0.2s" }}>
                      <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:on?18:2,transition:"0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <button style={{ marginTop:14,padding:"9px 24px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>Save Preferences</button>
            </div>
          )}

          {/* ═══ PREFERENCES TAB ═══ */}
          {tab === "preferences" && (
            <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Preferences</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  ["🌙", "Dark Mode", false],
                  ["🌐", "Language", "English"],
                  ["🕐", "Time Zone", "IST (UTC+5:30)"],
                  ["📅", "Date Format", "DD/MM/YYYY"],
                  ["🎨", "Theme Color", "Purple"],
                  ["📊", "Dashboard Layout", "Default"],
                ].map(([icon,label,val]) => (
                  <div key={label} style={{ border:"1px solid #eee", borderRadius:12, padding:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>{icon}</span>
                      <span style={{ fontSize:12, fontWeight:500 }}>{label}</span>
                    </div>
                    {typeof val === "boolean"
                      ? <div style={{ width:36,height:20,borderRadius:10,background:val?P:"#ddd",position:"relative",cursor:"pointer" }}>
                          <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:val?18:2,transition:"0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                        </div>
                      : <span style={{ fontSize:11, color:"#888" }}>{val}</span>
                    }
                  </div>
                ))}
              </div>
              <button style={{ marginTop:14,padding:"9px 24px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>Save Preferences</button>
            </div>
          )}

          {/* ═══ PRIVACY TAB ═══ */}
          {tab === "privacy" && (
            <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Privacy Settings</div>
              <div style={{ display:"grid", gap:8 }}>
                {[
                  ["Profile Visibility", "Public", true],
                  ["Public Research Profile", "Show my research to everyone", true],
                  ["Citation Visibility", "Show citation metrics on profile", true],
                  ["Contact Information", "Show email and phone", false],
                ].map(([label,desc,on]) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #f5f5f5" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500, color:"#1a1a1a" }}>{label}</div>
                      <div style={{ fontSize:10, color:"#888" }}>{desc}</div>
                    </div>
                    <div style={{ width:36,height:20,borderRadius:10,background:on?P:"#ddd",position:"relative",cursor:"pointer" }}>
                      <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:on?18:2,transition:"0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <button style={{ marginTop:14,padding:"9px 24px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>Save Privacy Settings</button>
            </div>
          )}

          {/* ═══ SESSIONS TAB ═══ */}
          {tab === "sessions" && (
            <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <span style={{ fontSize:14, fontWeight:600 }}>Active Sessions</span>
                <button style={{ padding:"6px 14px", border:"1px solid #A32D2D", borderRadius:6, fontSize:11, color:"#A32D2D", background:"#fff", cursor:"pointer" }}>Logout All Devices</button>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8f8fb" }}>
                    {["Device","Browser","OS","IP Address","Login Time","Location","Action"].map(h => (
                      <th key={h} style={{ padding:"8px 10px",fontSize:10,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["💻 Windows PC","Chrome","Windows 11","192.168.1.1","Current","—","Current Session"],
                  ].map(([device,browser,os,ip,time,loc,action]) => (
                    <tr key={device} style={{ borderBottom:"1px solid #f5f5f5" }}>
                      <td style={{ padding:"8px 10px", fontWeight:500 }}>{device}</td>
                      <td style={{ padding:"8px 10px", color:"#555" }}>{browser}</td>
                      <td style={{ padding:"8px 10px", color:"#555" }}>{os}</td>
                      <td style={{ padding:"8px 10px", color:"#888", fontSize:11 }}>{ip}</td>
                      <td style={{ padding:"8px 10px", color:"#888", fontSize:11 }}>{time}</td>
                      <td style={{ padding:"8px 10px", color:"#888", fontSize:11 }}>{loc}</td>
                      <td style={{ padding:"8px 10px" }}>
                        {action === "Current Session"
                          ? <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background:"#EAF3DE", color:"#27500A", fontWeight:500 }}>Current</span>
                          : <button style={{ fontSize:10, color:"#A32D2D", background:"none", border:"none", cursor:"pointer" }}>Logout</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ INTEGRATIONS TAB ═══ */}
          {tab === "integrations" && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                ["🧑‍🔬","Google Scholar", true, "Connected", "2 hours ago"],
                ["🆔","ORCID", false, "Not Connected", "—"],
                ["📘","Scopus", false, "Not Connected", "—"],
                ["📊","Publons", false, "Not Connected", "—"],
                ["🔬","ResearchGate", false, "Not Connected", "—"],
                ["💼","Microsoft Account", false, "Not Connected", "—"],
              ].map(([icon,name,connected,status,lastSync]) => (
                <div key={name} style={{ background:"#fff", borderRadius:16, padding:"16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ fontSize:24 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{name}</div>
                      <div style={{ fontSize:10, color:"#888" }}>{status}</div>
                    </div>
                    {connected && <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background:"#EAF3DE", color:"#27500A", fontWeight:500, marginLeft:"auto" }}>Connected</span>}
                  </div>
                  {connected && <div style={{ fontSize:10, color:"#aaa", marginBottom:10 }}>Last sync: {lastSync}</div>}
                  <div style={{ display:"flex", gap:6 }}>
                    {connected
                      ? <><button style={{ flex:1,padding:"6px",background:P,color:"#fff",borderRadius:6,fontSize:10,fontWeight:500,border:"none",cursor:"pointer" }}>Sync Now</button><button style={{ flex:1,padding:"6px",border:"1px solid #A32D2D",color:"#A32D2D",borderRadius:6,fontSize:10,background:"#fff",cursor:"pointer" }}>Disconnect</button></>
                      : <button style={{ width:"100%",padding:"6px",border:"1px solid "+P,color:P,borderRadius:6,fontSize:10,background:"#fff",cursor:"pointer" }}>Connect</button>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ═══ EDIT ACCOUNT MODAL ═══ */}
      {editModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:460 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontSize:16, fontWeight:600 }}>Edit Account Information</span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }} onClick={() => setEditModal(false)}>×</span>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>Email address</label>
              <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} />
            </div>
            <div style={{ marginBottom:18 }}>
              <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>Mobile number</label>
              <input value={editMobile} onChange={e => setEditMobile(e.target.value)} placeholder="98XXXXXXXX" style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} />
            </div>
            <div style={{ fontSize:11, color:"#888", marginBottom:16 }}>
              Changing your email or mobile will reset its verification status. You'll be able to verify it with an OTP.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setEditModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
              <button disabled={saving} onClick={saveAccountInfo} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ OTP / CHANGE PASSWORD MODAL ═══ */}
      {pwModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:16, fontWeight:600 }}>
                {pwAction === "verify_contact" ? "Verify Mobile Number" : "Change Password"}
              </span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }} onClick={() => setPwModal(false)}>×</span>
            </div>

            {pwError && <div style={{ background:"#FCEBEB", color:"#791F1F", padding:"10px 14px", borderRadius:8, fontSize:12, marginBottom:12 }}>{pwError}</div>}
            {pwSuccess && <div style={{ background:"#E9F7EF", color:"#1B7A45", padding:"10px 14px", borderRadius:8, fontSize:12, marginBottom:12 }}>{pwSuccess}</div>}

            {pwStep === 0 && (
              <div>
                <div style={{ fontSize:13, color:"#444", marginBottom:14 }}>
                  {pwAction === "verify_contact"
                    ? "We'll send a 6-digit OTP by SMS to your registered mobile number to verify it."
                    : "Verify your identity with a 6-digit OTP sent to your registered email address."}
                </div>
                {account?.email ? (
                  <div style={{ padding:"12px 14px", background:"#F5F5FB", borderRadius:10, marginBottom:14, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:10, color:"#888" }}>Registered email</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#1a1a1a", wordBreak:"break-all" }}>{account?.email}</div>
                    </div>
                    {account?.email_verified ? <span style={{ fontSize:9, padding:"2px 8px", borderRadius:6, background:"#EAF3DE", color:"#27500A" }}>✅ Verified</span> : null}
                  </div>
                ) : (
                  <div style={{ padding:"12px 14px", background:"#FCEBEB", borderRadius:10, marginBottom:14, fontSize:12, color:"#791F1F" }}>
                    No registered email found on this account.
                  </div>
                )}
                {account?.email ? (
                  <button onClick={sendOtp} disabled={pwLoading} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>
                    {pwLoading ? "Sending..." : "Send OTP to Email →"}
                  </button>
                ) : (
                  <button onClick={() => { setPwModal(false); setTab("account"); }} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>
                    Update Email Address →
                  </button>
                )}
              </div>
            )}

            {pwStep === 1 && (
              <div>
                <div style={{ fontSize:13, color:"#444", marginBottom:8 }}>
                  We sent a 6-digit code to your registered email <b style={{ color:P }}>{pwMasked}</b>.
                </div>
                <div style={{ fontSize:22, fontWeight:700, color:P, textAlign:"center", marginBottom:14 }}>
                  {fmtTimer(resendIn)}
                </div>
                <OtpInput key={otpKey.current} length={6} onChange={handleOtpChange} />
                <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:"#888" }}>
                  {resendIn > 0 ? <>Resend available after the countdown</> : (
                    <span onClick={resendOtp} style={{ color:P, cursor:"pointer", fontWeight:600 }}>Resend code</span>
                  )}
                </div>
                {pwAction === "verify_contact" ? (
                  <button onClick={confirmVerify} disabled={pwOtp.length !== 6 || pwLoading} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",marginTop:16,opacity: pwOtp.length===6?1:0.5 }}>
                    {pwLoading ? "Verifying..." : "Verify Mobile →"}
                  </button>
                ) : (
                  <button onClick={verifyOtp} disabled={pwOtp.length !== 6 || pwLoading} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",marginTop:16,opacity: pwOtp.length===6?1:0.5 }}>
                    {pwLoading ? "Verifying..." : "Verify OTP →"}
                  </button>
                )}
              </div>
            )}

            {pwStep === 2 && !pwAction && (
              <div>
                <div style={{ fontSize:13, color:"#444", marginBottom:14 }}>Choose a strong password you haven't used before.</div>
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:4 }}>New password</label>
                <input type="password" value={pwNew} onChange={e => handlePwStrength(e.target.value)} style={{ width:"100%",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,boxSizing:"border-box" }} />
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:4, marginTop:12 }}>Confirm password</label>
                <input type="password" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} style={{ width:"100%",padding:"9px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:13,boxSizing:"border-box" }} />
                {pwNew && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <span style={{ fontSize:16 }}>{pwStrength === "strong" ? "🟢" : pwStrength === "medium" ? "🟡" : "🔴"}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:"#444" }}>{pwStrength === "strong" ? "Strong" : pwStrength === "medium" ? "Medium" : "Weak"}</span>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
                      {pwRules.map(r => (
                        <div key={r.label} style={{ fontSize:11, color: r.passed ? "#1B7A45" : "#999" }}>{r.passed ? "✓" : "•"} {r.label}</div>
                      ))}
                    </div>
                  </div>
                )}
                <button onClick={confirmPassword} disabled={pwLoading} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer",marginTop:16 }}>
                  {pwLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            )}

            {pwStep === 3 && (
              <div style={{ textAlign:"center", padding:"10px 0" }}>
                <div style={{ fontSize:36, marginBottom:10 }}>🎉</div>
                <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>Password changed</div>
                <div style={{ fontSize:12, color:"#888", marginBottom:18 }}>All sessions have been logged out. Please login again.</div>
                <button onClick={finishPw} style={{ width:"100%",padding:11,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>Go to Login</button>
              </div>
            )}

          </div>
        </div>
      )}
    </Layout>
  );
}