import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const P = "#5B3DF5";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("info");
  const [editProfile, setEditProfile] = useState(false);
  const [editField, setEditField] = useState(null);
  const [fieldForm, setFieldForm] = useState({});
  const [completion, setCompletion] = useState(0);

  const calcCompletion = (p) => {
    if (!p) return;
    const fields = [p.name, p.designation, p.bio, p.google_scholar_id, p.profile_photo_url];
    const filled = fields.filter(Boolean).length;
    setCompletion(Math.round((filled / fields.length) * 100));
  };
  const fetchProfile = () => {
    API.get("/faculty/me/profile")
      .then(res => {
        setProfile(res.data);
        calcCompletion(res.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchProfile(); }, []); // eslint-disable-line

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await API.put("/faculty/me/profile", fieldForm);
      if (fieldForm.name) localStorage.setItem("name", fieldForm.name);
      showMsg("success", "✅ Profile updated");
      await fetchProfile();
      setEditProfile(false);
    } catch { showMsg("error", "Failed to update"); }
    finally { setSaving(false); }
  };

  if (loading) return <Layout><div style={{ padding:40, textAlign:"center" }}><div className="spinner" /></div></Layout>;
  if (!profile) return null;

  const initials = profile.name?.split(" ").filter(w=>!w.startsWith("Dr.")).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const roleLabel = profile.role==="hod"?"Head of Department":profile.role==="dean_rd"?"Dean R&D":"Faculty";

  const infoRows = [
    ["Full Name", profile.name, "name"],
    ["Email", profile.email, null],
    ["Designation", profile.designation, "designation"],
    ["Phone", profile.phone || "Not set", "phone"],
    ["Department", profile.dept_name || "—", null],
    ["Joining Year", profile.joining_year || "—", "joining_year"],
    ["Date of Birth", profile.dob || "Not set", "dob"],
    ["Employee ID", profile.employee_id || "Not set", "employee_id"],
    ["Gender", profile.gender || "Not set", "gender"],
    ["Qualification", profile.qualification || "Not set", "qualification"],
    ["Nationality", profile.nationality || "Not set", "nationality"],
    ["Google Scholar ID", profile.google_scholar_id || "Not set", "google_scholar_id"],
  ];

  return (
    <Layout>
      {/* Toast */}
      {msg && <div style={{ position:"fixed",top:16,right:16,zIndex:999,background:msg.type==="success"?"#EAF3DE":"#FCEBEB",color:msg.type==="success"?"#27500A":"#791F1F",padding:"10px 18px",borderRadius:10,fontSize:13,boxShadow:"0 4px 20px rgba(0,0,0,0.1)" }}>{msg.text}</div>}

      <div style={{ flex:1, overflowY:"auto", background:"#f5f5f8" }}>

        {/* Top Header */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e8e8ee", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:"#1a1a1a" }}>My Profile</div>
            <div style={{ fontSize:11, color:"#888", marginTop:1 }}>View and manage your personal and professional information</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ position:"relative" }}>
              <input placeholder="Search..." style={{ padding:"6px 10px 6px 28px", border:"1px solid #e0e0e8", borderRadius:20, fontSize:12, width:180, outline:"none", background:"#f8f8fb" }} />
              <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#aaa" }}>🔍</span>
            </div>
            <span style={{ fontSize:15, cursor:"pointer", color:"#888" }}>🔔</span>
            <span style={{ fontSize:15, cursor:"pointer", color:"#888" }}>✉</span>
            <div style={{ width:30,height:30,borderRadius:"50%",background:P,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:600 }}>{initials}</div>
            <button onClick={()=>setEditProfile(true)} style={{ background:P,color:"#fff",padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>✏ Edit Profile</button>
          </div>
        </div>

        <div style={{ padding:16 }}>

          {/* Three-column layout */}
          <div style={{ display:"flex", gap:14, alignItems:"start", marginBottom:14 }}>

            {/* ═══ LEFT: Profile Card ═══ */}
            <div style={{ width:240, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
              {/* Profile Card */}
              <div style={{ background:"#fff", borderRadius:16, padding:"20px 16px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ position:"relative", width:80, height:80, borderRadius:"50%", margin:"0 auto 12px", overflow:"hidden", background:`linear-gradient(135deg,${P},#185FA5)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {profile.profile_photo_url
                    ? <img src={profile.profile_photo_url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                    : <span style={{ color:"#fff", fontSize:28, fontWeight:700 }}>{initials}</span>
                  }
                  <div style={{ position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:"50%", background:P, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>📷</div>
                </div>
                <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{profile.name}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:1 }}>{profile.designation}</div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:8, fontSize:10, background:"#EEEDFE", color:P, padding:"3px 10px", borderRadius:12, fontWeight:500 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block" }} />
                  {roleLabel}
                </div>
                <div style={{ fontSize:11, color:"#666", marginTop:8, lineHeight:1.7 }}>
                  <div>🏢 {profile.dept_name || "—"}</div>
                  <div>✉ {profile.email}</div>
                  {profile.joining_year && <div>📅 Joined {profile.joining_year}</div>}
                </div>
              </div>

              {/* Metrics */}
              <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Research Metrics</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    ["h-index", profile.h_index, P],
                    ["i10-index", profile.i10_index, "#0C447C"],
                    ["Publications", profile.total_publications, "#27500A"],
                    ["Citations", profile.total_citations?.toLocaleString(), "#633806"],
                    ["Score", profile.research_score, "#A32D2D"],
                    ["Avg IF", profile.avg_impact_factor || "0", "#085041"],
                  ].map(([label,val,color]) => (
                    <div key={label} style={{ textAlign:"center", padding:"6px 0" }}>
                      <div style={{ fontSize:16, fontWeight:700, color }}>{val ?? 0}</div>
                      <div style={{ fontSize:9, color:"#aaa" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ CENTER: Tabs + Content ═══ */}
            <div style={{ flex:1, minWidth:0 }}>
              {/* Tabs */}
              <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", overflow:"hidden", marginBottom:14 }}>
                <div style={{ display:"flex", gap:0, borderBottom:"1px solid #eee", padding:"0 16px" }}>
                  {[
                    { key:"info", label:"Profile Info" },
                    { key:"metrics", label:"Research Metrics" },
                    { key:"scholar", label:"Google Scholar" },
                    { key:"academic", label:"Academic Identity" },
                  ].map(t=>(
                    <div key={t.key} onClick={()=>setTab(t.key)} style={{ padding:"10px 14px", fontSize:12, fontWeight:500, cursor:"pointer", color:tab===t.key?P:"#888", borderBottom:tab===t.key?`2px solid ${P}`:"2px solid transparent", transition:"all 0.15s" }}>{t.label}</div>
                  ))}
                </div>

                {/* ── Profile Info Tab ── */}
                {tab==="info" && (
                  <div style={{ padding:16 }}>
                    {/* Personal Information */}
                    <div style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>Personal Information</span>
                        {editField!=="personal" && <span onClick={()=>{setEditField("personal");setFieldForm({name:profile.name,designation:profile.designation,google_scholar_id:profile.google_scholar_id})}} style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500 }}>✏ Edit Section</span>}
                      </div>
                      {editField==="personal" ? (
                        <div>
                          {[["Full Name","name"],["Designation","designation"],["Google Scholar ID","google_scholar_id"]].map(([label,key]) => (
                            <div key={key} style={{ marginBottom:10 }}>
                              <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>{label}</label>
                              <input value={fieldForm[key]||""} onChange={e=>setFieldForm({...fieldForm,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} />
                            </div>
                          ))}
                          <div style={{ marginBottom:10 }}>
                            <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>Bio</label>
                            <textarea rows={3} value={fieldForm.bio||""} onChange={e=>setFieldForm({...fieldForm,bio:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12,fontFamily:"inherit" }} />
                          </div>
                          <div style={{ display:"flex",gap:8 }}>
                            <button onClick={()=>setEditField(null)} style={{ padding:"7px 14px",border:"1px solid #ddd",borderRadius:8,fontSize:12,background:"#fff",cursor:"pointer" }}>Cancel</button>
                            <button onClick={async()=>{setSaving(true);try{await API.put("/faculty/me/profile",fieldForm);if(fieldForm.name)localStorage.setItem("name",fieldForm.name);showMsg("success","✅ Updated");await fetchProfile();setEditField(null);}catch{showMsg("error","Failed");}finally{setSaving(false);}}} disabled={saving} style={{ padding:"7px 14px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Changes"}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
                          {infoRows.map(([label,val,key])=>(
                            <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f5f5f5", alignItems:"center" }}>
                              <div>
                                <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                                <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                              </div>
                              {key && <span onClick={()=>{setEditField(key);setFieldForm({[key]:profile[key]||""})}} style={{ fontSize:11, color:"#ccc", cursor:"pointer" }}>✏</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Professional Information */}
                    <div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>Professional Information</span>
                        <span style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500 }}>✏ Edit Section</span>
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>Research Areas</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {["Artificial Intelligence","Machine Learning","Data Mining","Natural Language Processing"].map(a=>(
                            <span key={a} style={{ fontSize:11, padding:"4px 12px", borderRadius:14, background:"#EEEDFE", color:P, fontWeight:500 }}>{a}</span>
                          ))}
                          <span style={{ fontSize:11, padding:"4px 12px", borderRadius:14, border:"1px dashed #ddd", color:"#888", cursor:"pointer" }}>+ Add</span>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px 16px" }}>
                        {[["Specialization","Computer Science"],["Current Position",profile.designation||"—"],["Institution","NIET Greater Noida"],["Office Address","Not set"]].map(([label,val])=>(
                          <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}>
                            <div>
                              <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                              <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                            </div>
                            <span style={{ fontSize:11, color:"#ccc", cursor:"pointer" }}>✏</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ marginTop:10 }}>
                        <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>Biography</div>
                        <div style={{ fontSize:12, color:"#555", lineHeight:1.6, padding:"10px 12px", background:"#f8f8fb", borderRadius:10 }}>{profile.bio || "No biography added yet."}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Research Metrics Tab ── */}
                {tab==="metrics" && (
                  <div style={{ padding:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Research Metrics</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
                      {[
                        ["h-index", profile.h_index, P],
                        ["i10-index", profile.i10_index, "#0C447C"],
                        ["Total Publications", profile.total_publications, "#27500A"],
                        ["Total Citations", profile.total_citations?.toLocaleString(), "#633806"],
                        ["Avg Impact Factor", profile.avg_impact_factor||"0", "#085041"],
                        ["Research Score", profile.research_score, "#A32D2D"],
                      ].map(([label,val,color])=>(
                        <div key={label} style={{ background:"#f8f8fb", borderRadius:12, padding:"16px", textAlign:"center" }}>
                          <div style={{ fontSize:26, fontWeight:700, color }}>{val??0}</div>
                          <div style={{ fontSize:11, color:"#555", marginTop:3 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:11, color:"#aaa", marginTop:14, padding:"10px 0", borderTop:"1px solid #eee" }}>Metrics are updated automatically when publications are added or Google Scholar sync is run.</div>
                  </div>
                )}

                {/* ── Google Scholar Tab ── */}
                {tab==="scholar" && (
                  <div style={{ padding:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Google Scholar</div>
                    <div style={{ background:profile.google_scholar_id?"#EAF3DE":"#FAEEDA", border:`1px solid ${profile.google_scholar_id?"#27500A":"#633806"}`, borderRadius:10, padding:"12px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:20 }}>{profile.google_scholar_id?"✅":"⚠️"}</span>
                      <div>
                        <div style={{ fontSize:12, fontWeight:600, color:profile.google_scholar_id?"#27500A":"#633806" }}>{profile.google_scholar_id?"Google Scholar ID is set":"Google Scholar ID not set"}</div>
                        <div style={{ fontSize:11, color:"#555" }}>{profile.google_scholar_id?`ID: ${profile.google_scholar_id}`:"Set your Scholar ID to enable auto-sync"}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>Google Scholar ID</label>
                      <div style={{ display:"flex", gap:8 }}>
                        <input value={profile.google_scholar_id||""} onChange={e=>setFieldForm({...fieldForm,google_scholar_id:e.target.value})} style={{ flex:1,padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} placeholder="e.g. 8XXy5vkAAAAJ" />
                        <button onClick={async()=>{setSaving(true);try{await API.put("/faculty/me/profile",{google_scholar_id:fieldForm.google_scholar_id});showMsg("success","✅ Saved");await fetchProfile();}catch{showMsg("error","Failed");}finally{setSaving(false);}}} disabled={saving} style={{ padding:"7px 16px",background:P,color:"#fff",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"...":"Save"}</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Academic Identity Tab ── */}
                {tab==="academic" && (
                  <div style={{ padding:16 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:14 }}>Academic Identity</div>
                    {[
                      ["🧑‍🔬", "Google Scholar", profile.google_scholar_id || "Not set"],
                      ["📘", "Scopus ID", "Not set"],
                      ["🆔", "ORCID", "Not set"],
                      ["📊", "Publons", "Not set"],
                      ["🔬", "ResearchGate", "Not set"],
                    ].map(([icon,label,val])=>(
                      <div key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderBottom:"1px solid #f5f5f5" }}>
                        <span style={{ fontSize:16 }}>{icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:11, color:"#888" }}>{label}</div>
                          <div style={{ fontSize:12, color:"#1a1a1a", fontWeight:500 }}>{val}</div>
                        </div>
                        <span style={{ fontSize:11, color:P, cursor:"pointer" }}>✏</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ═══ BOTTOM: Additional Info Cards ═══ */}
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Additional Information</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
                  {[
                    ["🎓", "Education", [["Degree","Ph.D. Computer Science"],["University","AKTU Lucknow"],["Years","2015-2019"]]],
                    ["💼", "Experience", [["Total","12+ Years"],["Teaching","8 Years"],["Research","4 Years"]]],
                    ["🏆", "Achievements", [["Awards","3 National"],["International","2"],["Best Paper","5"]]],
                    ["💡", "Research Interests", ["Artificial Intelligence","Machine Learning","NLP","Data Mining"].map(s=>({label:s}))],
                    ["📜", "Certifications", [["Total","8"],["Professional","5"],["Online","3"]]],
                  ].map(([icon,title,items],idx)=>(
                    <div key={idx} style={{ background:"#fff", borderRadius:16, padding:"14px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:18 }}>{icon}</span>
                          <span style={{ fontSize:12, fontWeight:600 }}>{title}</span>
                        </div>
                        <span style={{ fontSize:11, color:"#ccc", cursor:"pointer" }}>✏</span>
                      </div>
                      {Array.isArray(items) ? items.map((item,i)=>(
                        typeof item === "string"
                          ? <span key={i} style={{ display:"inline-block", fontSize:10, padding:"2px 8px", borderRadius:10, background:"#EEEDFE", color:P, margin:"2px" }}>{item}</span>
                          : <div key={i} style={{ fontSize:11, color:"#555", padding:"2px 0" }}>{item.label}: <strong>{item.value}</strong></div>
                      )) : (
                        <div style={{ fontSize:11, color:"#888" }}>{items}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ RIGHT: Profile Completion + Links ═══ */}
            <div style={{ width:220, flexShrink:0, display:"flex", flexDirection:"column", gap:12 }}>
              {/* Completion */}
              <div style={{ background:"#fff", borderRadius:16, padding:"16px", textAlign:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ position:"relative", width:80, height:80, margin:"0 auto 8px" }}>
                  <svg viewBox="0 0 36 36" style={{ width:"100%",height:"100%", transform:"rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f5" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={P} strokeWidth="2.5" strokeDasharray={`${completion},100`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700,color:P }}>{completion}%</div>
                </div>
                <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>Profile Complete</div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>Great! Your profile is almost complete.</div>
                <div style={{ fontSize:11, color:P, cursor:"pointer", marginTop:6, fontWeight:500 }}>Complete Now →</div>
              </div>

              {/* Academic Links */}
              <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Academic Links</div>
                {[
                  ["🧑‍🔬","Google Scholar",profile.google_scholar_id?"Connected":"Not connected"],
                  ["📘","Scopus","Not connected"],
                  ["🆔","ORCID","Not connected"],
                  ["📊","Publons","Not connected"],
                ].map(([icon,label,status])=>(
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}>
                    <span style={{ fontSize:14 }}>{icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#1a1a1a", fontWeight:500 }}>{label}</div>
                      <div style={{ fontSize:9, color:"#888" }}>{status}</div>
                    </div>
                    <span style={{ fontSize:11, color:"#aaa" }}>↗</span>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#888", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Social Links</div>
                {[
                  ["🔗","LinkedIn","Not connected"],
                  ["🐦","Twitter/X","Not connected"],
                  ["🌐","ResearchGate","Not connected"],
                ].map(([icon,label,status])=>(
                  <div key={label} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid #f5f5f5" }}>
                    <span style={{ fontSize:14 }}>{icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#1a1a1a", fontWeight:500 }}>{label}</div>
                      <div style={{ fontSize:9, color:"#888" }}>{status}</div>
                    </div>
                    <span style={{ fontSize:11, color:"#aaa" }}>↗</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ═══ EDIT PROFILE MODAL ═══ */}
      {editProfile && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#fff", borderRadius:16, padding:"24px 28px", width:500, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontSize:16, fontWeight:600 }}>Edit Profile</span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }} onClick={()=>setEditProfile(false)}>×</span>
            </div>
            <div style={{ marginBottom:14, textAlign:"center" }}>
              <div style={{ width:70,height:70,borderRadius:"50%",background:`linear-gradient(135deg,${P},#185FA5)`,margin:"0 auto 10px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:24,fontWeight:700,position:"relative" }}>
                {initials}
                <div style={{ position:"absolute",bottom:0,right:0,width:22,height:22,borderRadius:"50%",background:P,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,boxShadow:"0 2px 6px rgba(0,0,0,0.2)" }}>📷</div>
              </div>
            </div>
            {[["Full Name","name"],["Designation","designation"],["Email","email"],["Bio","bio"]].map(([label,key])=>(
              <div key={key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11,color:"#555",display:"block",marginBottom:3 }}>{label}</label>
                {key==="bio"
                  ? <textarea rows={3} value={fieldForm[key]||profile[key]||""} onChange={e=>setFieldForm({...fieldForm,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12,fontFamily:"inherit" }} />
                  : <input value={fieldForm[key]||profile[key]||""} onChange={e=>setFieldForm({...fieldForm,[key]:e.target.value})} style={{ width:"100%",padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12 }} />
                }
              </div>
            ))}
            <div style={{ display:"flex",gap:10 }}>
              <button type="button" onClick={()=>setEditProfile(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
              <button type="submit" disabled={saving} onClick={handleProfileSave} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
