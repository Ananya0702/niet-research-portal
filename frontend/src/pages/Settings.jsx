import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

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

export default function Settings() {
  const [tab, setTab] = useState("account");
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [showPwd, setShowPwd] = useState({ current: false, new: false, confirm: false });
  const [pwdStrength, setPwdStrength] = useState({ chars: false, upper: false, number: false, special: false });
  const [profile, setProfile] = useState(null);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  useEffect(() => {
    API.get("/faculty/me/profile").then(r => setProfile(r.data)).catch(() => showMsg("error", "Failed to load profile"));
  }, []);

  const checkPwdStrength = (val) => {
    setPwdStrength({
      chars: val.length >= 8,
      upper: /[A-Z]/.test(val),
      number: /[0-9]/.test(val),
      special: /[!@#$%^&*]/.test(val),
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { showMsg("error", "Passwords do not match."); return; }
    if (form.new_password.length < 6) { showMsg("error", "Password must be at least 6 characters."); return; }
    setSaving(true);
    try {
      await API.put("/faculty/me/password", { current_password: form.current_password, new_password: form.new_password });
      showMsg("success", "✅ Password changed successfully!");
      setForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) { showMsg("error", err.response?.data?.detail || "Failed."); }
    finally { setSaving(false); }
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      await API.put("/faculty/me/profile", editForm);
      if (editForm.name) localStorage.setItem("name", editForm.name);
      showMsg("success", "✅ Account updated");
      setEditModal(false);
      const r = await API.get("/faculty/me/profile");
      setProfile(r.data);
    } catch { showMsg("error", "Failed to update"); }
    finally { setSaving(false); }
  };

  const role = localStorage.getItem("role") || "faculty";
  const name = localStorage.getItem("name") || "User";
  const email = localStorage.getItem("email") || "";
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
                    <span onClick={() => { setEditForm({ name, email, designation: profile?.designation||"" }); setEditModal(true); }} style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500, padding:"4px 12px", border:"1px solid "+P, borderRadius:6 }}>✏ Edit</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 24px" }}>
                    {[
                      ["Full Name", name],
                      ["Role", roleLabel],
                      ["Department", profile?.dept_name || "—"],
                      ["Email", email, "✅ Verified"],
                      ["Phone", profile?.phone || "Not set", profile?.phone ? "✅ Verified" : null],
                      ["Employee ID", profile?.employee_id || "Not set"],
                      ["Joining Year", profile?.joining_year || "—"],
                      ["Account Status", "🟢 Active"],
                    ].map(([label, val, badge]) => (
                      <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}>
                        <div>
                          <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                          <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500, display:"flex", alignItems:"center", gap:6 }}>
                            {val}
                            {badge && <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#EAF3DE", color:"#27500A", fontWeight:500 }}>{badge}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Change Password */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:14, fontWeight:600, color:"#1a1a1a" }}>Change Password</span>
                  </div>
                  <form onSubmit={handlePasswordChange}>
                    {[
                      ["Current Password", "current_password", "current"],
                      ["New Password", "new_password", "new"],
                      ["Confirm Password", "confirm_password", "confirm"],
                    ].map(([label, key, showKey]) => (
                      <div key={key} style={{ marginBottom:12 }}>
                        <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>{label}</label>
                        <div style={{ position:"relative" }}>
                          <span style={{ position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa" }}>🔒</span>
                          <input type={showPwd[showKey] ? "text" : "password"} required value={form[key]}
                            onChange={e => { setForm({...form,[key]:e.target.value}); if (key==="new_password") checkPwdStrength(e.target.value); }}
                            style={{ width:"100%",padding:"8px 30px 8px 30px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} placeholder="••••••••" />
                          <span onClick={() => setShowPwd({...showPwd,[showKey]:!showPwd[showKey]})} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa",cursor:"pointer" }}>{showPwd[showKey]?"🙈":"👁"}</span>
                        </div>
                      </div>
                    ))}
                    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:14, fontSize:11 }}>
                      {[
                        [pwdStrength.chars, "✔ Minimum 8 Characters"],
                        [pwdStrength.upper, "✔ One Uppercase Letter"],
                        [pwdStrength.number, "✔ One Number"],
                        [pwdStrength.special, "✔ One Special Character"],
                      ].map(([done,text]) => (
                        <span key={text} style={{ color: done ? "#27500A" : "#aaa" }}>{text}</span>
                      ))}
                    </div>
                    <button type="submit" disabled={saving} style={{ width:"100%",padding:"10px",background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Updating...":"Update Password"}</button>
                  </form>
                </div>

                {/* Logout */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#1a1a1a", marginBottom:6 }}>Logout</div>
                  <div style={{ fontSize:11, color:"#888", marginBottom:12 }}>This will end your current session and redirect you to the login page.</div>
                  <button onClick={() => setConfirmLogout(true)} style={{ padding:"9px 24px", border:"1px solid #A32D2D", borderRadius:8, fontSize:12, fontWeight:500, color:"#A32D2D", background:"#fff", cursor:"pointer" }}>Logout</button>
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
                  <button style={{ width:"100%",marginTop:10,padding:"8px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>Complete Profile →</button>
                </div>

                {/* Recent Activity */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>Recent Activity</span>
                    <span style={{ fontSize:10, color:P, cursor:"pointer" }}>View All</span>
                  </div>
                  <div style={{ maxHeight:200, overflowY:"auto" }}>
                    {[
                      ["🟢", "Successful Login", "From Chrome on Windows", "2 hours ago"],
                      ["✏", "Profile Updated", "Personal information changed", "Yesterday"],
                      ["🔒", "Password Changed", "Security update", "3 days ago"],
                      ["✅", "Email Verified", "dean@niet.co.in verified", "1 week ago"],
                      ["🔄", "Google Scholar Synced", "15 new publications added", "2 weeks ago"],
                      ["🔗", "ORCID Connected", "ORCID account linked", "1 month ago"],
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

                {/* Danger Zone */}
                <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #FCEBEB" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#A32D2D", marginBottom:4 }}>⚠ Danger Zone</div>
                  <div style={{ fontSize:10, color:"#888", marginBottom:10 }}>Irreversible and sensitive account actions.</div>
                  <div style={{ background:"#FCEBEB", borderRadius:10, padding:"12px" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#791F1F", marginBottom:2 }}>Delete Account</div>
                    <div style={{ fontSize:10, color:"#888", marginBottom:8 }}>Once deleted, your account cannot be recovered.</div>
                    <button style={{ width:"100%",padding:"7px",background:"#A32D2D",color:"#fff",borderRadius:8,fontSize:11,fontWeight:500,border:"none",cursor:"pointer" }}>🗑 Delete Account</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECURITY TAB ═══ */}
          {tab === "security" && (
            <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:14 }}>Security Settings</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  ["🔐", "Two-Factor Authentication", "Add an extra layer of security to your account.", true],
                  ["📱", "Login Verification", "Verify logins from new devices.", true],
                  ["✉", "Recovery Email", "Set an email for account recovery.", false],
                  ["📞", "Recovery Phone", "Set a phone number for account recovery.", false],
                ].map(([icon,title,desc,enabled]) => (
                  <div key={title} style={{ border:"1px solid #eee", borderRadius:12, padding:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:20 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600 }}>{title}</div>
                        <div style={{ fontSize:10, color:"#888" }}>{desc}</div>
                      </div>
                    </div>
                    <div style={{ width:36,height:20,borderRadius:10,background:enabled?P:"#ddd",position:"relative",cursor:"pointer",transition:"0.2s" }}>
                      <div style={{ width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:enabled?18:2,transition:"0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
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
                    ["💻 Windows PC","Chrome 126","Windows 11","192.168.1.1","2 hours ago","Noida, IN","Current Session"],
                    ["📱 iPhone 15","Safari","iOS 18","192.168.1.2","Yesterday","Delhi, IN","Logout"],
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
              <span style={{ fontSize:16, fontWeight:600 }}>Edit Account</span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }} onClick={() => setEditModal(false)}>×</span>
            </div>
            {[["Full Name","name"],["Email","email"],["Designation","designation"]].map(([label,key]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>{label}</label>
                <input value={editForm[key]||""} onChange={e => setEditForm({...editForm,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} />
              </div>
            ))}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setEditModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
              <button disabled={saving} onClick={handleEditSave} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CONFIRM LOGOUT ═══ */}
      {confirmLogout && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:380, textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:10 }}>🚪</div>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>Logout?</div>
            <div style={{ fontSize:12, color:"#888", marginBottom:18 }}>Are you sure you want to end your session?</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setConfirmLogout(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
              <button onClick={() => { localStorage.clear(); window.location.href = "/"; }} style={{ flex:1,padding:10,background:"#A32D2D",color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>Logout</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
