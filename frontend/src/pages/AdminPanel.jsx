import { useState, useEffect, useMemo } from "react";
import API from "../services/api";
import * as XLSX from "xlsx";
import ImportWizard from "../components/ImportWizard";

const P = "#5B3DF5";
const SIDEBAR = "#1A1626";

const SIDEBAR_ACTIVE = "rgba(91,61,245,0.15)";

const ADMIN_NAV_ICONS = {
  dashboard: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  school: <><path d="m3 9 9-5 9 5" /><path d="M5 10v8m4-8v8m10-8v8M3 20h18M2 22h20" /></>,
  departments: <><path d="M4 21V7l8-4 8 4v14" /><path d="M2 21h20M8 10h2m4 0h2m-8 4h2m4 0h2m-5 7v-4h4v4" /></>,
  faculty: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20z" /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6m2 3a5 5 0 0 1 3.5 4.7V20h-4" /></>,
  details: <><rect x="5" y="3.5" width="14" height="18" rx="2" /><path d="M9 3.5v-1h6v1M8.5 9h7m-7 4h7m-7 4h4" /></>,
  security: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" /><path d="m9 12 2 2 4-4" /></>,
  export: <><path d="M12 3v12m-4-4 4 4 4-4" /><path d="M5 15v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></>,
};

function AdminNavIcon({ name, active }) {
  const isAdd = name.startsWith("add-");
  const baseName = isAdd ? name.slice(4) : name;
  const color = active ? "#c4b5fd" : "#a89acb";

  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display:"block", flexShrink:0 }}>
      {ADMIN_NAV_ICONS[baseName]}
      {isAdd && <g><circle cx="18" cy="18" r="5.2" fill={SIDEBAR} stroke={color} strokeWidth="1.4" /><path d="M18 15.5v5m-2.5-2.5h5" stroke={color} strokeWidth="1.7" /></g>}
    </svg>
  );
}

const SIDEBAR_ITEMS = [
  { section: "Navigation", items: [
    { key: "overview",    icon: "dashboard", label: "Dashboard Overview" },
    { key: "schools",     icon: "school", label: "Schools" },
    { key: "depts",       icon: "departments", label: "Departments" },
    { key: "faculty",     icon: "faculty", label: "Faculty" },
    { key: "faculty-details", icon: "details", label: "Faculty Details" },
  ]},
  { section: "Management", items: [
    { key: "add-school", icon: "add-school", label: "Add School" },
    { key: "add-dept",   icon: "add-departments", label: "Add Department" },
    { key: "add-faculty",icon: "add-faculty", label: "Add Faculty" },
  ]},
  { section: "System", items: [
    { key: "security",   icon: "security", label: "Security" },
    { key: "export",    icon: "export", label: "Export Data" },
  ]},
];

const DESIGNATIONS = ["Professor","Associate Professor","Assistant Professor","Senior Lecturer","Lecturer","Dean","HOD",];
const ROLES = ["faculty","hod","dean_rd"];
const EMPTY_FORM = { name:"", email:"", password:"", role:"faculty", designation:"Assistant Professor", dept_id:"", is_phd:false, joining_year:new Date().getFullYear(), google_scholar_id:"", orcid_id:"", scopus_author_id:"", };

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token")||"");
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState("overview");

  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const [modal, setModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({});

  const [dashboard, setDashboard] = useState(null);
  const [schools, setSchools] = useState([]);
  const [depts, setDepts] = useState([]);
  const [selSchoolId, setSelSchoolId] = useState(null);
  const [expandedSchools, setExpandedSchools] = useState({});
  const [schoolModal, setSchoolModal] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ school_name:"" });
  const [deptForm, setDeptForm] = useState({ school_id:"", dept_code:"", dept_name:"", hod_faculty_id:"", established_year:"" });
  const [importEntity, setImportEntity] = useState(null);

  const [activeTab, setActiveTab] = useState("faculty");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showFacultyProfile, setShowFacultyProfile] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [selectedFacultyData, setSelectedFacultyData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [facultyDetails, setFacultyDetails] = useState([]);
  const [facultyDetailsLoading, setFacultyDetailsLoading] = useState(false);
  const [fdSearch, setFdSearch] = useState("");
  const [fdRoleFilter, setFdRoleFilter] = useState("all");
  const [fdDeptFilter, setFdDeptFilter] = useState("all");
  const [expandedFac, setExpandedFac] = useState({});
  const [fdViewing, setFdViewing] = useState(null);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } });
  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  const apiPost = (url, data) => API.post(url, data, authHeaders());
  const apiPut = (url, data) => API.put(url, data, authHeaders());
  const apiGet = (url) => API.get(url, authHeaders());
  const apiDel = (url) => API.delete(url, authHeaders());

  const fetchFacultyDetails = async () => {
    setFacultyDetailsLoading(true);
    try { const r=await apiGet("/admin/faculty-details"); setFacultyDetails(r.data); }
    catch(e) { showMsg("error","Failed to load faculty details"); }
    finally { setFacultyDetailsLoading(false); }
  };

  // ── Login ──
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccess("");
    setLoginLoading(true);
    try {
      const res = await API.post("/admin/login", loginForm, { timeout: 15000 });
      const token = res.data.access_token;
      if (!token) throw new Error("Login response did not include an access token");
      setLoginSuccess("Login successful. Opening the Admin Panel…");
      await new Promise((resolve) => setTimeout(resolve, 900));
      localStorage.setItem("admin_token", token);
      setAdminToken(token);
      showMsg("success", "✅ Admin login successful.");
    } catch (error) {
      if (error.response?.status === 401) {
        setLoginError("Invalid credentials. Check the admin email and password for the connected database; the demo password may have been changed.");
      } else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        setLoginError("The login service did not respond within 15 seconds. Check that the backend is running and reachable, then try again.");
      } else {
        setLoginError(error.response?.data?.detail || "Could not reach the login service. Please try again.");
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Data fetching ──
  const fetchFaculty = async () => { setLoading(true); try { const r=await apiGet("/admin/faculty"); setFaculty(r.data); } catch(e) { console.error("fetchFaculty error:", e); } finally { setLoading(false); } };
  const fetchDashboard = async () => { try { const r=await apiGet("/admin/dashboard"); setDashboard(r.data); } catch { /* ignore */ } };
  const fetchSchools = async () => { try { const r=await apiGet("/admin/schools"); setSchools(r.data); } catch { /* ignore */ } };
  const fetchDepts = async () => { try { const r=await apiGet("/admin/departments"); setDepts(r.data); } catch { /* ignore */ } };
  useEffect(() => { if (!adminToken) return; fetchFaculty(); fetchDashboard(); fetchSchools(); fetchDepts(); fetchFacultyDetails(); }, [adminToken]); // eslint-disable-line

  // ── Faculty CRUD ──
  const handleCreate = async (e) => { e.preventDefault(); setSaving(true); try { await apiPost("/admin/faculty", { ...form, dept_id:form.dept_id?parseInt(form.dept_id):null, joining_year:parseInt(form.joining_year), }); showMsg("success", `✅ ${form.name} created`); setModal(false); setForm(EMPTY_FORM); fetchFaculty(); } catch(err) { showMsg("error", err.response?.data?.detail||"Error"); } finally { setSaving(false); } };
  const handleUpdate = async (e) => { e.preventDefault(); setSaving(true); try { const {faculty_id, school_id, dept_id, role, ...rest} = editForm; if (!school_id) { showMsg("error","School is required"); setSaving(false); return; } if (role !== "dean_rd" && !dept_id) { showMsg("error","Department is required for HOD and Faculty"); setSaving(false); return; } await apiPut(`/admin/faculty/${editForm.faculty_id}`, editForm); showMsg("success","✅ Updated"); setEditModal(false); fetchFaculty(); } catch(err) { showMsg("error", err?.response?.data?.detail || "Update failed"); } finally { setSaving(false); } };
  const handleDeactivate = async (id,name) => { if (!window.confirm(`Deactivate ${name}?`)) return; try { await apiDel(`/admin/faculty/${id}`); showMsg("success",`${name} deactivated`); fetchFaculty(); } catch { showMsg("error","Error"); } };
  const handleDelete = async (id,name) => { if (!window.confirm(`Permanently delete ${name}?`)) return; try { await apiDel(`/admin/faculty/${id}?hard=true`); showMsg("success",`${name} deleted`); fetchFaculty(); } catch { showMsg("error","Error"); } };
  const [syncing, setSyncing] = useState(null);
  const handleAdminSync = async (id) => { setSyncing(id); try { const res = await apiPost(`/admin/faculty/sync/${id}/orcid`); showMsg("success", `ORCID sync done: ${res.data.new_publications} new, ${res.data.already_existed} existing`); fetchFaculty(); } catch(err) { showMsg("error", err.response?.data?.detail||"Sync failed"); } finally { setSyncing(null); } };

  // ── Schools CRUD ──
  const handleCreateSchool = async (e) => { e.preventDefault(); setSaving(true); try { await apiPost("/admin/schools", schoolForm); showMsg("success","✅ School created"); setSchoolModal(false); setSchoolForm({school_name:""}); fetchSchools(); } catch(err) { showMsg("error", err.response?.data?.detail||"Error"); } finally { setSaving(false); } };
  const handleDeleteSchool = async (id,name) => { if (!window.confirm(`Delete "${name}"?`)) return; try { await apiDel(`/admin/schools/${id}`); showMsg("success","School deleted"); fetchSchools(); if (selSchoolId===id) setSelSchoolId(null); } catch(err) { showMsg("error", err.response?.data?.detail||"Error"); } };

  // ── Departments CRUD ──
  const handleCreateDept = async (e) => { e.preventDefault(); setSaving(true); try { await apiPost("/admin/departments", { ...deptForm, school_id:parseInt(deptForm.school_id), hod_faculty_id:deptForm.hod_faculty_id?parseInt(deptForm.hod_faculty_id):null, established_year:deptForm.established_year?parseInt(deptForm.established_year):null, }); showMsg("success","✅ Department created"); setDeptModal(false); setDeptForm({school_id:"",dept_code:"",dept_name:"",hod_faculty_id:"",established_year:""}); fetchDepts(); fetchSchools(); } catch(err) { showMsg("error",err.response?.data?.detail||"Error"); } finally { setSaving(false); } };
  const handleDeleteDept = async (id,name) => { if (!window.confirm(`Delete "${name}"?`)) return; try { await apiDel(`/admin/departments/${id}`); showMsg("success","Department deleted"); fetchDepts(); fetchSchools(); } catch(err) { showMsg("error",err.response?.data?.detail||"Error"); } };

  // ── Derived ──
  const filteredFaculty = faculty.filter(f => {
    if (roleFilter!=="all" && f.role!==roleFilter) return false;
    if (deptFilter!=="all" && f.dept_id!==parseInt(deptFilter)) return false;
    if (!search) return true;
    const q=search.toLowerCase();
    return f.name?.toLowerCase().includes(q)||f.email?.toLowerCase().includes(q)||f.dept_name?.toLowerCase().includes(q);
  });
  const selSchool = schools.find(s=>s.school_id===selSchoolId)||schools[0]||null;
  const selSchoolDepts = selSchool ? depts.filter(d=>d.school_id===selSchool.school_id) : [];
  const selSchoolFaculty = selSchool ? faculty.filter(f=>selSchoolDepts.some(d=>d.dept_id===f.dept_id)) : [];

  const viewFacultyProfile = async (facultyId) => {
    if (facultyDetails && facultyDetails.length) {
      const found = facultyDetails.find(f => f.faculty_id === facultyId);
      if (found) {
        setFdViewing(found);
        setActiveView("faculty-details");
        return;
      }
    }
    setSelectedFacultyId(facultyId);
    setShowFacultyProfile(true);
    setProfileLoading(true);
    setSelectedFacultyData(null);
    try { const r = await apiGet(`/faculty/${facultyId}/dashboard`); setSelectedFacultyData(r.data); }
    catch { showMsg("error", "Failed to load faculty profile"); }
    finally { setProfileLoading(false); }
  };
  const closeFacultyProfile = () => { setShowFacultyProfile(false); setSelectedFacultyId(null); setSelectedFacultyData(null); };

  // ── Login Screen ──
  if (!adminToken) return (
    <div style={{ minHeight:"100vh", background:`url('/admin-bg.jpg') center/cover no-repeat fixed`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative", padding:24 }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.28)", backdropFilter:"blur(5px)", WebkitBackdropFilter:"blur(5px)" }} />
      <div style={{ position:"relative", width:"100%", maxWidth:420, background:"rgba(0,0,0,0.42)", backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)", borderRadius:22, padding:"40px 38px", border:"1px solid rgba(255,255,255,0.16)", boxShadow:"0 24px 60px rgba(0,0,0,0.45)", boxSizing:"border-box" }}>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div style={{ width:200, height:86, background:"#fff", borderRadius:12, padding:"10px 18px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 10px 30px rgba(0,0,0,0.35)" }}>
            <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
          </div>
        </div>
        <div style={{ textAlign:"center", marginBottom:22 }}>
          <div style={{ fontSize:24, fontWeight:700, color:"#fff" }}>Welcome back</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginTop:4 }}>Sign in to the Admin Panel</div>
        </div>
        {loginError&&<div role="alert" aria-live="polite" style={{ background:"rgba(249,80,80,0.16)",color:"#ffd6d6",border:"1px solid rgba(255,150,150,0.3)",padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:18 }}>{loginError}</div>}
        {loginSuccess&&<div role="status" aria-live="polite" style={{ background:"rgba(60,180,100,0.18)",color:"#d9ffe5",border:"1px solid rgba(140,255,170,0.35)",padding:"10px 14px",borderRadius:10,fontSize:13,marginBottom:18 }}>{loginSuccess}</div>}
        <form onSubmit={handleAdminLogin}>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.85)", display:"block", marginBottom:7 }}>Admin Email</label>
            <input type="email" required value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} placeholder="admin@niet.co.in" style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.2)", borderRadius:10, fontSize:14, color:"#fff", outline:"none" }} />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.85)", display:"block", marginBottom:7 }}>Password</label>
            <div style={{ position:"relative" }}>
              <input type={loginShowPw ? "text" : "password"} required value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} placeholder="Enter your password" style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px", background:"rgba(255,255,255,0.08)", border:"1.5px solid rgba(255,255,255,0.2)", borderRadius:10, fontSize:14, color:"#fff", outline:"none" }} />
              <button type="button" onClick={()=>setLoginShowPw(s=>!s)} tabIndex={-1} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", fontSize:16, cursor:"pointer", padding:0 }}>{loginShowPw ? "🙈" : "👁"}</button>
            </div>
          </div>
          <button type="submit" disabled={loginLoading} style={{ width:"100%", padding:13, border:"none", borderRadius:10, fontSize:15, fontWeight:600, color:"#fff", cursor:loginLoading?"wait":"pointer", opacity:loginLoading?0.75:1, background:"linear-gradient(135deg, #6a4cf5 0%, #8b5cf6 45%, #3b82f6 100%)", boxShadow:"0 10px 26px rgba(107,78,245,0.4)" }}>{loginLoading ? "Signing in…" : "Login as Admin"}</button>
        </form>
        <div style={{ marginTop:18, textAlign:"center" }}><a href="/" style={{ fontSize:12.5, color:"#b9aaff", textDecoration:"none", fontWeight:500 }}>← Back to Portal Login</a></div>
      </div>
    </div>
  );

  // ── Main Dashboard ──
  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f8", display:"flex" }}>

      {/* ═══ SIDEBAR ═══ */}
      <div style={{ width:sidebarOpen?240:0, overflow:"hidden", background:SIDEBAR, color:"#fff", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0 }}>
        <div style={{ padding:"20px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:92, height:42, background:"#fff", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", padding:"4px 7px", boxSizing:"border-box", flexShrink:0 }}>
            <img src="/niet-logo.svg" alt="NIET Greater Noida" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Admin Panel</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>Research Portal</div>
          </div>
        </div>
        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          {SIDEBAR_ITEMS.map((section,si)=>(
            <div key={si}>
              <div style={{ padding:"12px 18px 4px", fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:1 }}>{section.section}</div>
              {section.items.map(item=>{
                const isActive = activeView===item.key || (item.key==="overview"&&activeView==="overview");
                const isManagement = item.key.startsWith("add-");
                return (
                  <div key={item.key} onClick={()=>{
                    if (isManagement) {
                      if (item.key==="add-school") setSchoolModal(true);
                      else if (item.key==="add-dept") setDeptModal(true);
                      else if (item.key==="add-faculty") setModal(true);
                    } else {
                      setActiveView(item.key);
                    }
                  }} style={{
                    padding:"10px 18px", margin:"2px 8px", borderRadius:8, cursor:"pointer",
                    display:"flex", alignItems:"center", gap:10, fontSize:13,
                    background: isActive ? SIDEBAR_ACTIVE : "transparent",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.55)",
                    transition:"all 0.15s",
                  }}>
                    <AdminNavIcon name={item.icon} active={isActive} />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ padding:"12px 18px", borderTop:"1px solid rgba(255,255,255,0.06)", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
          v2.0 · NIET Research Portal
        </div>
      </div>

      {/* ═══ MAIN ═══ */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* ── Header ── */}
        <div style={{ background:"#fff", borderBottom:"1px solid #e8e8ee", padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span onClick={()=>setSidebarOpen(!sidebarOpen)} style={{ fontSize:20, cursor:"pointer", color:"#888" }}>☰</span>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Welcome back, Admin!</div>
              <div style={{ fontSize:11, color:"#888" }}>You have full access to the system.</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ position:"relative" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search faculty, departments..." style={{ padding:"7px 12px 7px 32px", border:"1px solid #e0e0e8", borderRadius:20, fontSize:12, width:220, outline:"none", background:"#f8f8fb" }} />
              <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#aaa" }}>🔍</span>
            </div>
            <span style={{ fontSize:16, cursor:"pointer" }}>🔔</span>
            <span style={{ fontSize:16, cursor:"pointer" }}>✉</span>
            <div style={{ width:32, height:32, borderRadius:"50%", background:P, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:600 }}>A</div>
            <div style={{ fontSize:12, lineHeight:1.3 }}>
              <div style={{ fontWeight:600, color:"#333" }}>Administrator</div>
              <div style={{ fontSize:10, color:"#888" }}>Super Administrator</div>
            </div>
            <button onClick={()=>{localStorage.removeItem("admin_token");setAdminToken("");}} style={{ fontSize:11,color:"#A32D2D",padding:"4px 12px",background:"#FCEBEB",borderRadius:12,border:"none",cursor:"pointer" }}>Logout</button>
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:16 }}>

          {msg&&<div style={{ padding:"10px 16px",borderRadius:8,marginBottom:14,background:msg.type==="success"?"#EAF3DE":"#FCEBEB",color:msg.type==="success"?"#27500A":"#791F1F",fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center" }}><span>{msg.text}</span><span style={{cursor:"pointer",marginLeft:12}} onClick={()=>setMsg(null)}>✕</span></div>}

          {/* ═══ OVERVIEW ═══ */}
          {activeView==="overview" && !dashboard && <div className="spinner" style={{margin:"40px auto"}} />}
          {activeView==="overview" && dashboard && <OverviewView {...{dashboard,schools,depts,faculty,facultyDetails,facultyDetailsLoading,expandedSchools,setExpandedSchools,selSchoolId,setSelSchoolId,setSchoolModal,setDeptModal,handleDeleteSchool,handleDeleteDept,setEditModal,setEditForm,setModal,handleDeactivate,handleDelete,P,viewFacultyProfile}} />}

          {/* ═══ SCHOOLS ═══ */}
          {activeView==="schools" && <SchoolsView {...{schools,depts,faculty,expandedSchools,setExpandedSchools,selSchoolId,setSelSchoolId,setSchoolModal,setDeptModal,handleDeleteSchool,handleDeleteDept,setEditModal,setEditForm,P,setImportEntity}} />}

          {/* ═══ DEPARTMENTS ═══ */}
          {activeView==="depts" && <DeptsView {...{depts,schools,faculty,setDeptModal,setEditModal,setEditForm,handleDeleteDept,P,setImportEntity}} />}

          {/* ═══ FACULTY ═══ */}
          {activeView==="faculty" && <FacultyView {...{faculty,loading,filteredFaculty,roleFilter,setRoleFilter,deptFilter,setDeptFilter,depts,setModal,setEditModal,setEditForm,handleDeactivate,handleDelete,P,viewFacultyProfile,syncing,handleAdminSync,setImportEntity}} />}

          {/* ═══ FACULTY DETAILS ═══ */}
          {activeView==="faculty-details" && <FacultyDetailsView {...{facultyDetails,facultyDetailsLoading,fdSearch,setFdSearch,fdRoleFilter,setFdRoleFilter,fdDeptFilter,setFdDeptFilter,depts,expandedFac,setExpandedFac,P,fdViewing,setFdViewing}} />}

          {/* ═══ EXPORT ═══ */}
          {activeView==="export" && <ExportView {...{faculty,schools,depts,P,showMsg,setActiveView}} />}

          {/* ═══ SECURITY ═══ */}
          {activeView==="security" && <SecurityView {...{apiGet,apiPost,P,showMsg}} />}

          {/* ═══ FACULTY PROFILE ═══ */}
          {showFacultyProfile && (
            <FacultyProfileView
              facultyId={selectedFacultyId}
              data={selectedFacultyData}
              loading={profileLoading}
              onClose={closeFacultyProfile}
              adminToken={adminToken}
              P={P}
            />
          )}

        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Create Faculty Modal */}
      {modal && <FacultyModal {...{form,setForm,saving,handleCreate,setModal,schools,depts}} />}

      {/* Edit Faculty/Dept Modal */}
      {editModal && <EditModal {...{editForm,setEditForm,saving,handleUpdate,setEditModal,depts,faculty,schools}} />}

      {/* School Modal */}
      {schoolModal && (
        <div onClick={e=>{if(e.target===e.currentTarget&&!saving)setSchoolModal(false);}} style={{ position:"fixed",inset:0,background:"rgba(20,16,35,0.52)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:16 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-school-title" style={{ background:"#fff",borderRadius:18,padding:"26px 28px 22px",width:"min(460px, 100%)",boxShadow:"0 24px 70px rgba(24,16,58,0.24)",border:"1px solid rgba(255,255,255,0.8)" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:14,marginBottom:23 }}>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <span aria-hidden="true" style={{ width:42,height:42,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:P,background:"#EEEDFE" }}>🏛</span>
                <div>
                  <div id="create-school-title" style={{ fontSize:18,fontWeight:700,color:"#211b35",letterSpacing:"-0.2px" }}>Create New School</div>
                  <div style={{ fontSize:11,color:"#858091",marginTop:4 }}>Add a school to your institution structure.</div>
                </div>
              </div>
              <button type="button" aria-label="Close dialog" onClick={()=>!saving&&setSchoolModal(false)} disabled={saving} style={{ width:30,height:30,border:0,borderRadius:8,background:"#f6f5f9",color:"#777",fontSize:20,lineHeight:1,cursor:saving?"not-allowed":"pointer" }}>×</button>
            </div>
            <form onSubmit={e=>{if(!schoolForm.school_name.trim()){e.preventDefault();showMsg("error","School name is required");return;}setSchoolForm({...schoolForm,school_name:schoolForm.school_name.trim()});handleCreateSchool(e);}}>
              <div style={{ marginBottom:22 }}>
                <label htmlFor="new-school-name" style={{ ...lbl,display:"block",fontWeight:600,color:"#383346",marginBottom:7 }}>School name <span style={{ color:"#A32D2D" }}>*</span></label>
                <input id="new-school-name" required autoFocus value={schoolForm.school_name} onChange={e=>setSchoolForm({...schoolForm,school_name:e.target.value})} style={{ ...inp,width:"100%",boxSizing:"border-box",padding:"12px 14px",borderRadius:10,fontSize:13,border:"1px solid #dedce8",background:"#fcfcfe",outlineColor:P }} placeholder="e.g. School of CS & IT (SCSIT)" />
                <div style={{ fontSize:10,color:"#918d9c",marginTop:7 }}>Use the official school name so it’s easy to identify across the portal.</div>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button type="button" onClick={()=>setSchoolModal(false)} disabled={saving} style={{ flex:1,padding:"11px 14px",border:"1px solid #dedce8",borderRadius:10,fontSize:12,fontWeight:600,color:"#514d5c",background:"#fff",cursor:saving?"not-allowed":"pointer",opacity:saving?0.6:1 }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:1.5,padding:"11px 14px",background:saving?"#8876f7":P,color:"#fff",borderRadius:10,fontSize:12,fontWeight:650,border:"none",boxShadow:"0 5px 12px rgba(91,61,245,0.2)",cursor:saving?"wait":"pointer" }}>{saving?"Creating school…":"Create School"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Modal */}
      {deptModal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
          <div style={{ background:"#fff",borderRadius:14,padding:"24px 28px",width:480 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <span style={{ fontSize:16,fontWeight:600 }}>Create New Department</span>
              <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setDeptModal(false)}>×</span>
            </div>
            <form onSubmit={handleCreateDept}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>School *</label><select required value={deptForm.school_id} onChange={e=>setDeptForm({...deptForm,school_id:e.target.value})} style={inp}><option value="">Select School</option>{schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
                <div><label style={lbl}>Dept Code *</label><input required value={deptForm.dept_code} onChange={e=>setDeptForm({...deptForm,dept_code:e.target.value})} style={inp} placeholder="e.g. CSE" /></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Department Name *</label><input required value={deptForm.dept_name} onChange={e=>setDeptForm({...deptForm,dept_name:e.target.value})} style={inp} placeholder="e.g. Computer Science & Engineering" /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>Assign HOD</label><select value={deptForm.hod_faculty_id} onChange={e=>setDeptForm({...deptForm,hod_faculty_id:e.target.value})} style={inp}><option value="">Select HOD</option>{faculty.filter(f=>f.role==="hod"||f.role==="faculty").map(f=><option key={f.faculty_id} value={f.faculty_id}>{f.name}</option>)}</select></div>
                <div><label style={lbl}>Est. Year</label><input type="number" value={deptForm.established_year} onChange={e=>setDeptForm({...deptForm,established_year:e.target.value})} style={inp} placeholder="e.g. 2000" /></div>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button type="button" onClick={()=>setDeptModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2,padding:10,background: "#0C447C",color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Creating...":"Create Department"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Wizard */}
      {importEntity && <ImportWizard entity={importEntity} P={P} onClose={()=>setImportEntity(null)} onDone={()=>{fetchSchools(); fetchDepts(); fetchFaculty(); fetchDashboard();}} />}

    </div>
  );
}

// ── Sub-components ──

function FacultyModal({ form,setForm,saving,handleCreate,setModal,schools,depts }) {
  const [selSchool,setSelSchool]=useState("");
  const deptOptions=selSchool?depts.filter(d=>d.school_id===parseInt(selSchool)):depts;
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
      <div style={{ background:"#fff",borderRadius:14,padding:"24px 28px",width:540,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontSize:16,fontWeight:600 }}>Create New Faculty Account</span>
          <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setModal(false)}>×</span>
        </div>
        <form onSubmit={handleCreate}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={lbl}>Full Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={inp} placeholder="Dr. First Last" /></div>
            <div><label style={lbl}>Email *</label><input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={inp} placeholder="name@niet.co.in" /></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={lbl}>Password *</label><input type="password" required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={inp} placeholder="Min 6 characters" /></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={lbl}>Role *</label><select required value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={inp}>{ROLES.map(r=><option key={r} value={r}>{r==="dean_rd"?"Dean":r==="hod"?"HOD":"Faculty"}</option>)}</select></div>
            <div><label style={lbl}>Designation *</label><select required value={form.designation} onChange={e=>setForm({...form,designation:e.target.value})} style={inp}>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}</select></div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={lbl}>School</label><select value={selSchool} onChange={e=>{setSelSchool(e.target.value);setForm({...form,dept_id:""})}} style={inp}><option value="">Select School</option>{schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
            <div><label style={lbl}>Department</label><select value={form.dept_id} onChange={e=>setForm({...form,dept_id:e.target.value})} disabled={!selSchool} style={{...inp,background:!selSchool?"#f5f5f5":"#fff"}}><option value="">Select Department</option>{deptOptions.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}</select></div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={lbl}>PhD Holder</label><select value={form.is_phd} onChange={e=>setForm({...form,is_phd:e.target.value==="true"})} style={inp}><option value="false">No</option><option value="true">Yes</option></select></div>
            <div><label style={lbl}>Joining Year</label><input type="number" value={form.joining_year} onChange={e=>setForm({...form,joining_year:e.target.value})} style={inp} min="1990" max="2030" /></div>
          </div>
          <div style={{ marginBottom:14 }}><label style={lbl}>Google Scholar ID</label><input value={form.google_scholar_id} onChange={e=>setForm({...form,google_scholar_id:e.target.value})} style={inp} placeholder="e.g. 8XXy5vkAAAAJ" /></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
            <div><label style={lbl}>ORCID iD</label><input value={form.orcid_id} onChange={e=>setForm({...form,orcid_id:e.target.value})} style={inp} placeholder="e.g. 0000-0001-2345-6789" /></div>
            <div><label style={lbl}>Scopus Author ID</label><input value={form.scopus_author_id} onChange={e=>setForm({...form,scopus_author_id:e.target.value})} style={inp} placeholder="e.g. 7005103581" /></div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button type="button" onClick={()=>setModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Creating...":"Create Faculty Account"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ editForm,setEditForm,saving,handleUpdate,setEditModal,depts,schools }) {
  const isFaculty = editForm.name !== undefined;
  const role = editForm.role || "faculty";
  const showDept = role === "hod" || role === "faculty";
  const [selEditSchool, setSelEditSchool] = useState(editForm.school_id || "");

  const editSchoolDepts = useMemo(() => {
    if (!selEditSchool) return schools?.find(s => s.school_id === (editForm.school_id || parseInt(selEditSchool)))?.departments || [];
    const school = schools?.find(s => s.school_id === parseInt(selEditSchool));
    return school?.departments || [];
  }, [selEditSchool, schools, editForm.school_id]);

  useEffect(() => {
    if (editForm.school_id) setSelEditSchool(editForm.school_id);
  }, [editForm.school_id]);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
      <div style={{ background:"#fff",borderRadius:14,padding:"24px 28px",width:520,maxHeight:"90vh",overflowY:"auto" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontSize:16,fontWeight:600 }}>Edit — {editForm.name||editForm.dept_name}</span>
          <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setEditModal(false)}>×</span>
        </div>
        <form onSubmit={handleUpdate}>
          {isFaculty ? (
            <>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>Full Name *</label><input required value={editForm.name||""} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inp} /></div>
                <div><label style={lbl}>Email Address *</label><input type="email" required value={editForm.email||""} onChange={e=>setEditForm({...editForm,email:e.target.value})} style={inp} placeholder="name@niet.co.in" /></div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>Role</label><select value={role} onChange={e=>{const r=e.target.value;setEditForm({...editForm,role:r,dept_id:r==="dean_rd"?null:editForm.dept_id});}} style={inp}>{ROLES.map(r=><option key={r} value={r}>{r==="dean_rd"?"Dean":r==="hod"?"HOD":"Faculty"}</option>)}</select></div>
                <div><label style={lbl}>Designation</label><select value={editForm.designation||""} onChange={e=>setEditForm({...editForm,designation:e.target.value})} style={inp}>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={lbl}>School</label><select value={selEditSchool} onChange={e=>{const sid=e.target.value;setSelEditSchool(sid);setEditForm({...editForm,school_id:sid?parseInt(sid):null,dept_id:null});}} style={inp}><option value="">Select School</option>{(schools||[]).map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
              {showDept && (
                <div style={{ marginBottom:14 }}><label style={lbl}>Department</label><select value={editForm.dept_id||""} onChange={e=>setEditForm({...editForm,dept_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">{selEditSchool?"Select Department":"Select School first"}</option>{editSchoolDepts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}</select></div>
              )}
              <div style={{ marginBottom:14 }}><label style={lbl}>Google Scholar ID</label><input value={editForm.google_scholar_id||""} onChange={e=>setEditForm({...editForm,google_scholar_id:e.target.value})} style={inp} placeholder="e.g. 8XXy5vkAAAAJ" /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>ORCID iD</label><input value={editForm.orcid_id||""} onChange={e=>setEditForm({...editForm,orcid_id:e.target.value})} style={inp} placeholder="e.g. 0000-0001-2345-6789" /></div>
                <div><label style={lbl}>Scopus Author ID</label><input value={editForm.scopus_author_id||""} onChange={e=>setEditForm({...editForm,scopus_author_id:e.target.value})} style={inp} placeholder="e.g. 7005103581" /></div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>PhD Holder</label><select value={editForm.is_phd?"true":"false"} onChange={e=>setEditForm({...editForm,is_phd:e.target.value==="true"})} style={inp}><option value="false">No</option><option value="true">Yes</option></select></div>
                <div><label style={lbl}>New Password</label><input type="password" value={editForm.password||""} onChange={e=>setEditForm({...editForm,password:e.target.value})} style={inp} placeholder="Leave blank = no change" /></div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom:14 }}><label style={lbl}>Department Name</label><input value={editForm.dept_name||""} onChange={e=>setEditForm({...editForm,dept_name:e.target.value})} style={inp} /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>Dept Code</label><input value={editForm.dept_code||""} onChange={e=>setEditForm({...editForm,dept_code:e.target.value})} style={inp} /></div>
                <div><label style={lbl}>School</label><select value={editForm.school_id||""} onChange={e=>setEditForm({...editForm,school_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">Select School</option>{(schools||[]).map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Assign HOD</label><select value={editForm.hod_faculty_id||""} onChange={e=>setEditForm({...editForm,hod_faculty_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">Select HOD</option>{(editForm.faculty_list||[]).map(f=><option key={f.faculty_id} value={f.faculty_id}>{f.name}</option>)}</select></div>
            </>
          )}
          <div style={{ display:"flex",gap:10 }}>
            <button type="button" onClick={()=>setEditModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
            <button type="submit" disabled={saving} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Changes"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══ FACULTY PROFILE VIEW ═══
function FacultyProfileView({ data, loading, onClose, P }) {
  const [activeTab, setActiveTab] = useState("publications");
  if (loading) return (
    <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"60px 40px", textAlign:"center" }}>
      <div className="spinner" style={{ margin:"0 auto 16px" }} />
      <div style={{ fontSize:14, color:"#888" }}>Loading faculty profile...</div>
    </div>
  );
  if (!data) return (
    <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"40px", textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
      <div style={{ fontSize:14, color:"#888" }}>Could not load faculty profile data</div>
      <button onClick={onClose} style={{ marginTop:12, padding:"8px 20px", background:P, color:"#fff", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>Go Back</button>
    </div>
  );

  const f = data.faculty || {};
  const k = data.kpis || {};
  const pubs = (data.all_publications || data.recent_publications || []).sort((a,b) => (b.year||0) - (a.year||0));
  const achievements = data.achievements || [];
  const projects = data.projects || [];
  const patents = data.patents || [];
  const areas = data.research_areas || [];
  const pubsByYear = data.publications_by_year || [];
  const initials = (f.name||"F").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const roleLabel = f.role?.replace("dean_rd","Dean").replace("hod","HOD")||"Faculty";
  const totalPubs = k.total_publications || pubs.length;

  const exportFacultyData = () => {
    const profileSheet = [
      ["Faculty Profile Export", "", "", ""],
      ["Generated", new Date().toLocaleString(), "", ""],
      [],
      ["PROFILE INFORMATION", "", "", ""],
      ["Name", f.name||"", "Email", f.email||""],
      ["Designation", f.designation||"", "Role", roleLabel],
      ["Department", f.dept_name||"", "Google Scholar ID", f.google_scholar_id||""],
      ["h-index", k.h_index||f.h_index||0, "i10-index", k.i10_index||f.i10_index||0],
      ["Total Publications", k.total_publications||0, "Total Citations", k.total_citations||0],
      ["Research Score", f.research_score||0, "Joining Year", f.joining_year||""],
      [],
      ["RESEARCH AREAS", "", "", ""],
      ["Area", "Publications", "Expertise %", ""],
      ...areas.map(a => [a.area_name||a.area||"", a.pub_count||0, a.expertise_percent||0, ""]),
    ];
    const pubSheet = [
      ["Title", "Journal", "Year", "Quartile", "Citations", "DOI"],
      ...pubs.map(p => [p.title, p.journal_name||"", p.year||"", p.quartile||"", p.citations_count||0, p.doi||""]),
    ];
    const projSheet = [
      ["Title", "Sponsor", "Amount (Lakhs)", "Status"],
      ...projects.map(p => [p.title, p.sponsor_name||p.sponsor_type||"", p.amount_lakhs||"", p.status||""]),
    ];
    const patentSheet = [
      ["Title", "Status", "Year"],
      ...patents.map(p => [p.title, p.status||"", p.year||""]),
    ];
    const achSheet = [
      ["Title", "Issuer", "Category", "Year"],
      ...achievements.map(a => [a.title, a.issuer||"", a.category||"", a.year||""]),
    ];

    const wb = XLSX.utils.book_new();
    const colWidths = { "!cols": [{wch:50},{wch:40},{wch:12},{wch:10},{wch:10},{wch:30}] };
    const ws1 = XLSX.utils.aoa_to_sheet(profileSheet);
    ws1["!cols"] = [{wch:22},{wch:30},{wch:22},{wch:30}];

    const ws2 = XLSX.utils.aoa_to_sheet(pubSheet);
    ws2["!cols"] = colWidths["!cols"];

    const ws3 = XLSX.utils.aoa_to_sheet(projSheet);
    ws3["!cols"] = [{wch:45},{wch:25},{wch:16},{wch:14}];

    const ws4 = XLSX.utils.aoa_to_sheet(patentSheet);
    ws4["!cols"] = [{wch:45},{wch:14},{wch:10}];

    const ws5 = XLSX.utils.aoa_to_sheet(achSheet);
    ws5["!cols"] = [{wch:45},{wch:25},{wch:20},{wch:10}];

    XLSX.utils.book_append_sheet(wb, ws1, "Profile");
    XLSX.utils.book_append_sheet(wb, ws2, "Publications");
    XLSX.utils.book_append_sheet(wb, ws3, "Projects");
    XLSX.utils.book_append_sheet(wb, ws4, "Patents");
    XLSX.utils.book_append_sheet(wb, ws5, "Achievements");

    XLSX.writeFile(wb, `${(f.name||"faculty").replace(/\s+/g,"_")}_Profile_Export.xlsx`);
  };

  const tabs = [
    { key:"publications", icon:"📄", label:"Publications", count:totalPubs },
    { key:"projects", icon:"💼", label:"Projects", count:projects.length },
    { key:"patents", icon:"💡", label:"Patents", count:patents.length },
    { key:"achievements", icon:"🏆", label:"Achievements", count:achievements.length },
    { key:"analytics", icon:"📈", label:"Analytics" },
  ];

  return (
    <div>
      {/* Back button & header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div onClick={onClose} style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:12, color:P, cursor:"pointer", fontWeight:500 }}>
          <span>←</span> Back to {f.name ? `${f.name}'s Profile` : "Faculty List"}
        </div>
      </div>

      {/* Profile Card */}
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"20px 24px", marginBottom:14, display:"flex", gap:20, alignItems:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:`linear-gradient(135deg, ${P}, #7B5DF5)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, fontWeight:700, color:"#fff", flexShrink:0 }}>{initials}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"#1a1a1a" }}>{f.name}</div>
          <div style={{ display:"flex", gap:12, marginTop:4, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:P, fontWeight:600 }}>{f.designation||roleLabel}</span>
            <span style={{ fontSize:12, color:"#888" }}>|</span>
            <span style={{ fontSize:12, color:"#666" }}>{f.dept_name || f.department || "No Department"}</span>
            <span style={{ fontSize:12, color:"#888" }}>|</span>
            <span style={{ fontSize:12, color:"#666" }}>h-index: {k.h_index||f.h_index||0}</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={exportFacultyData} style={{ background:P, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>📥 Export Profile</button>
          <button onClick={onClose} style={{ background:"#f0f0f5", color:"#666", border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, cursor:"pointer" }}>✕ Close</button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(140px,1fr))", gap:10, marginBottom:14 }}>
        {[
          ["📄","Publications",k.total_publications||0,"#EEEDFE",P],
          ["💬","Citations",k.total_citations?.toLocaleString()||"0","#E6F1FB","#0C447C"],
          ["📈","h-index",k.h_index||0,"#EAF3DE","#27500A"],
          ["📊","i10-index",k.i10_index||0,"#FAEEDA","#633806"],
          ["📅","This Year",k.publications_this_year||0,"#E1F5EE","#085041"],
          ["⭐","Impact Factor",k.avg_impact_factor ?? "N/A","#FCEBEB","#A32D2D"],
        ].map(([icon,label,val,bg,color]) => (
          <div key={label} style={{ background:"#fff", borderRadius:12, padding:"12px 14px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:32,height:32,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>{icon}</div>
              <div>
                <div style={{ fontSize:10,color:"#888" }}>{label}</div>
                <div style={{ fontSize:16,fontWeight:700,color }}>{val}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content + right sidebar */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 240px", gap:14 }}>
        <div>
          {/* Tabs */}
          <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"16px 18px" }}>
            <div style={{ display:"flex", gap:0, borderBottom:"1px solid #eee", marginBottom:14 }}>
              {tabs.map(t=>(
                <div key={t.key} onClick={()=>setActiveTab(t.key)} style={{
                  padding:"8px 14px", fontSize:12, fontWeight:500, cursor:"pointer",
                  color: activeTab===t.key ? P : "#888",
                  borderBottom: activeTab===t.key ? `2px solid ${P}` : "2px solid transparent",
                  display:"flex", alignItems:"center", gap:5,
                  background: activeTab===t.key ? "rgba(91,61,245,0.04)" : "transparent",
                  borderRadius:"8px 8px 0 0",
                }}>
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.count!==undefined && (
                    <span style={{ background:activeTab===t.key?P:"#e8e8ee", color:activeTab===t.key?"#fff":"#888", padding:"1px 6px", borderRadius:8, fontSize:9, fontWeight:600, marginLeft:4 }}>{t.count}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Publications */}
            {activeTab==="publications" && (
              <div>
                {pubs.length===0 ? (
                  <div style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No publications found</div>
                ) : (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                      <thead>
                        <tr style={{ background:"#f8f8fb" }}>
                          {["Title","Journal","Year","Indexing","Citations","DOI"].map(h=><th key={h} style={{ padding:"7px 10px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {pubs.map((pub,i)=>(
                          <tr key={pub.pub_id||i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                            <td style={{ padding:"7px 10px", fontWeight:500, color:"#1a1a1a", minWidth:180 }}>{pub.title}</td>
                            <td style={{ padding:"7px 10px", color:"#666" }}>{pub.journal_name}</td>
                            <td style={{ padding:"7px 10px", color:"#888" }}>{pub.year}</td>
                            <td style={{ padding:"7px 10px" }}>
                              {pub.quartile && <span style={{ padding:"2px 6px", borderRadius:4, fontSize:9, fontWeight:600, background:pub.quartile==="Q1"?"#EAF3DE":pub.quartile==="Q2"?"#EEEDFE":"#FAEEDA", color:pub.quartile==="Q1"?"#27500A":pub.quartile==="Q2"?P:"#633806" }}>{pub.quartile}</span>}
                            </td>
                            <td style={{ padding:"7px 10px" }}><span style={{ background:"#EEEDFE", color:P, padding:"2px 6px", borderRadius:4, fontWeight:600, fontSize:10 }}>{pub.citations_count||0}</span></td>
                            <td style={{ padding:"7px 10px", color:P, fontSize:9 }}>{pub.doi||"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Projects */}
            {activeTab==="projects" && (
              <div style={{ overflowX:"auto" }}>
                {projects.length===0 ? (
                  <div style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No projects found</div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#f8f8fb" }}>
                        {["Title","Sponsor","Amount (L)","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((proj,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                          <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{proj.title}</td>
                          <td style={{ padding:"10px 12px", color:"#666" }}>{proj.sponsor_type||proj.sponsor_name||"-"}</td>
                          <td style={{ padding:"10px 12px", color:"#888" }}>{proj.amount_lakhs ? `₹${proj.amount_lakhs}L` : "-"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <span style={{ padding:"2px 7px", borderRadius:5, fontSize:9, fontWeight:600, background:proj.status==="Completed"?"#EAF3DE":"#FAEEDA", color:proj.status==="Completed"?"#27500A":"#633806" }}>{proj.status||"Ongoing"}</span>
                          </td>
                          <td style={{ padding:"10px 12px", color:P, fontSize:11, cursor:"pointer" }}>👁</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Patents */}
            {activeTab==="patents" && (
              <div style={{ overflowX:"auto" }}>
                {patents.length===0 ? (
                  <div style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No patents found</div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#f8f8fb" }}>
                        {["Title","Patent No","Year","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {patents.map((pat,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                          <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{pat.title}</td>
                          <td style={{ padding:"10px 12px", color:"#666" }}>{pat.patent_no||"-"}</td>
                          <td style={{ padding:"10px 12px", color:"#888" }}>{pat.year||"-"}</td>
                          <td style={{ padding:"10px 12px" }}>
                            <span style={{ padding:"2px 7px", borderRadius:5, fontSize:9, fontWeight:600, background:pat.status==="Granted"?"#EAF3DE":"#FAEEDA", color:pat.status==="Granted"?"#27500A":"#633806" }}>{pat.status||"Filed"}</span>
                          </td>
                          <td style={{ padding:"10px 12px", color:P, fontSize:11, cursor:"pointer" }}>👁</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Achievements */}
            {activeTab==="achievements" && (
              <div style={{ overflowX:"auto" }}>
                {achievements.length===0 ? (
                  <div style={{ padding:24, textAlign:"center", color:"#aaa", fontSize:12 }}>No achievements found</div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:"#f8f8fb" }}>
                        {["Title","Issuer","Category","Year","Actions"].map(h=><th key={h} style={{ padding:"8px 12px", color:"#888", fontWeight:500, textAlign:"left", borderBottom:"1px solid #eee", whiteSpace:"nowrap" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {achievements.map((ach,i)=>(
                        <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                          <td style={{ padding:"10px 12px", fontWeight:500, color:"#1a1a1a" }}>{ach.title}</td>
                          <td style={{ padding:"10px 12px", color:"#666" }}>{ach.issuer||"-"}</td>
                          <td style={{ padding:"10px 12px", color:"#888" }}>{ach.category||"-"}</td>
                          <td style={{ padding:"10px 12px", color:"#888" }}>{ach.year||"-"}</td>
                          <td style={{ padding:"10px 12px", color:P, fontSize:11, cursor:"pointer" }}>👁</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Analytics */}
            {activeTab==="analytics" && (
              <div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  {/* Publications By Year */}
                  <div style={{ background:"#fafafc", borderRadius:10, padding:"14px 16px", border:"1px solid #f0f0f5" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Publications by Year</div>
                    {pubsByYear.length===0 ? <div style={{ fontSize:11, color:"#aaa" }}>No data</div> : (
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead><tr style={{ background:"#f0f0f5" }}><th style={{ padding:"5px 8px", textAlign:"left", color:"#888" }}>Year</th><th style={{ padding:"5px 8px", textAlign:"right", color:"#888" }}>Count</th></tr></thead>
                        <tbody>
                          {pubsByYear.map((py,i)=>(
                            <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                              <td style={{ padding:"5px 8px", color:"#333" }}>{py.year}</td>
                              <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:600, color:P }}>{py.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* Quartile Breakdown */}
                  <div style={{ background:"#fafafc", borderRadius:10, padding:"14px 16px", border:"1px solid #f0f0f5" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Quartile Breakdown</div>
                    {(data.quartile_breakdown||[]).length===0 ? <div style={{ fontSize:11, color:"#aaa" }}>No data</div> : (
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                        <thead><tr style={{ background:"#f0f0f5" }}><th style={{ padding:"5px 8px", textAlign:"left", color:"#888" }}>Quartile</th><th style={{ padding:"5px 8px", textAlign:"right", color:"#888" }}>Count</th></tr></thead>
                        <tbody>
                          {(data.quartile_breakdown||[]).map((q,i)=>(
                            <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                              <td style={{ padding:"5px 8px", color:"#333" }}>{q.quartile}</td>
                              <td style={{ padding:"5px 8px", textAlign:"right", fontWeight:600, color:P }}>{q.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* Research Areas */}
                  <div style={{ gridColumn:"1/-1", background:"#fafafc", borderRadius:10, padding:"14px 16px", border:"1px solid #f0f0f5" }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Research Areas</div>
                    {areas.length===0 ? <div style={{ fontSize:11, color:"#aaa" }}>No research areas defined</div> : (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {areas.map((a,i)=>(
                          <div key={i} style={{ background:"rgba(91,61,245,0.08)", borderRadius:8, padding:"8px 12px", display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:12, fontWeight:500, color:P }}>{a.area_name||a.area}</span>
                            <span style={{ fontSize:10, color:"#888" }}>{a.pub_count||0} pubs</span>
                            {a.expertise_percent && <span style={{ fontSize:10, color:P, fontWeight:600 }}>{a.expertise_percent}%</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar - Quick Stats */}
        <div>
          {/* Info Card */}
          <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"14px 16px", marginBottom:12 }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Quick Info</div>
            {[
              ["🆔","ID",f.faculty_id],
              ["🎓","Designation",f.designation||roleLabel],
              ["🏫","Google Scholar",f.google_scholar_id||"—"],
              ["📊","Research Score",f.research_score||"0"],
              ["📅","Joined",f.joining_year||"—"],
            ].map(([icon,label,val])=>(
              <div key={label} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", fontSize:11 }}>
                <span>{icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ color:"#888", fontSize:9 }}>{label}</div>
                  <div style={{ color:"#1a1a1a", fontWeight:500, fontSize:10 }}>{val}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Research Areas mini */}
          {areas.length>0 && (
            <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Research Areas</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {areas.slice(0,5).map((a,i)=>(
                  <span key={i} style={{ background:"rgba(91,61,245,0.08)", color:P, padding:"2px 8px", borderRadius:5, fontSize:9, fontWeight:500 }}>{a.area_name||a.area}</span>
                ))}
              </div>
            </div>
          )}

          {/* Metrics Summary */}
          <div style={{ background:"#fff", borderRadius:12, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"14px 16px" }}>
            <div style={{ fontSize:12, fontWeight:600, color:"#1a1a1a", marginBottom:10 }}>Metrics Summary</div>
            {[
              ["Total Publications",k.total_publications||0,P],
              ["Total Citations",k.total_citations||0,"#0C447C"],
              ["h-index",k.h_index||0,"#27500A"],
              ["i10-index",k.i10_index||0,"#633806"],
              ["Avg Impact Factor",k.avg_impact_factor ?? "N/A","#085041"],
              ["This Year",k.publications_this_year||0,"#A32D2D"],
            ].map(([label,val,color])=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:11, borderBottom:"1px solid #f5f5f5" }}>
                <span style={{ color:"#888" }}>{label}</span>
                <span style={{ fontWeight:600, color }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ VIEW COMPONENTS ═══

function OverviewView({ dashboard, schools, depts, faculty, facultyDetails, facultyDetailsLoading, expandedSchools, setExpandedSchools, selSchoolId, setSelSchoolId, setSchoolModal, setDeptModal, handleDeleteSchool, handleDeleteDept, setEditModal, setEditForm, setModal, handleDeactivate, handleDelete, P, viewFacultyProfile }) {
  const [selDeptId, setSelDeptId] = useState(null);
  const [expandedDepts, setExpandedDepts] = useState({});
  const [treeSearch, setTreeSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(null);

  const selSchool = schools.find(s=>s.school_id===selSchoolId)||null;
  const selDept = selDeptId ? depts.find(d=>d.dept_id===selDeptId)||null : null;
  const selSchoolDepts = selSchool ? depts.filter(d=>d.school_id===selSchool.school_id) : [];
  const selSchoolFaculty = selSchool ? faculty.filter(f=>selSchoolDepts.some(d=>d.dept_id===f.dept_id)) : [];
  const selDeptFaculty = selDept ? faculty.filter(f=>f.dept_id===selDept.dept_id) : [];
  const departmentStats = (dashboard.dept_breakdown || []).map(item => {
    const department = depts.find(d => d.dept_id === item.dept_id);
    return { ...item, school_name:schools.find(s => s.school_id === department?.school_id)?.school_name || "Unassigned" };
  }).sort((a, b) => (b.publications || 0) - (a.publications || 0));
  const topDepartments = departmentStats.slice(0, 5);
  const maxDepartmentPublications = Math.max(...topDepartments.map(d => d.publications || 0), 1);
  const schoolStats = schools.map(s => {
    const schoolDepartments = depts.filter(d => d.school_id === s.school_id);
    const schoolDepartmentIds = new Set(schoolDepartments.map(d => d.dept_id));
    return {
      ...s,
      department_count:schoolDepartments.length,
      faculty_count:faculty.filter(f => f.is_active && schoolDepartmentIds.has(f.dept_id)).length,
      publication_count:departmentStats.filter(d => schoolDepartmentIds.has(d.dept_id)).reduce((total, d) => total + (d.publications || 0), 0),
    };
  });
  const allPublications = (facultyDetails || []).flatMap(f => (f.publications || []).map(pub => ({
    ...pub,
    faculty_id:f.faculty_id,
    faculty_name:f.name,
    dept_name:f.dept_name,
  })));
  const publicationCountsByYear = allPublications.reduce((counts, pub) => {
    if (pub.year) counts[pub.year] = (counts[pub.year] || 0) + 1;
    return counts;
  }, {});
  const publicationYearStats = Object.entries(publicationCountsByYear)
    .map(([year, count]) => ({ year:Number(year), count }))
    .sort((a, b) => a.year - b.year)
    .slice(-6);
  const maxYearlyPublications = Math.max(...publicationYearStats.map(item => item.count), 1);
  const recentPublications = [...allPublications]
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || (b.citations_count || 0) - (a.citations_count || 0))
    .slice(0, 4);

  const q = treeSearch.toLowerCase().trim();
  const matchingIds = useMemo(() => {
    if (!q) return null;
    const m = { schools: new Set(), depts: new Set(), faculty: new Set() };
    schools.forEach(s => { if (s.school_name.toLowerCase().includes(q)) m.schools.add(s.school_id); });
    depts.forEach(d => { if (d.dept_name.toLowerCase().includes(q)||d.dept_code.toLowerCase().includes(q)) m.depts.add(d.dept_id); });
    faculty.forEach(f => { if (f.name.toLowerCase().includes(q)) m.faculty.add(f.faculty_id); });
    return m;
  }, [q, schools, depts, faculty]);

  const schoolMatches = (s) => !matchingIds || matchingIds.schools.has(s.school_id) || sDepts(s).some(d=>deptMatches(d));
  const deptMatches = (d) => !matchingIds || matchingIds.depts.has(d.dept_id) || dFac(d).some(f=>facMatches(f));
  const facMatches = (f) => !matchingIds || matchingIds.faculty.has(f.faculty_id);
  const sDepts = (s) => depts.filter(d=>d.school_id===s.school_id);
  const dFac = (d) => faculty.filter(f=>f.dept_id===d.dept_id);
  const sFac = (s) => faculty.filter(f=>sDepts(s).some(d=>d.dept_id===f.dept_id));

  const autoExpanded = useMemo(() => {
    if (!q) return {};
    const e = {};
    schools.forEach(s => {
      if (matchingIds?.schools.has(s.school_id) || sDepts(s).some(d=>matchingIds?.depts.has(d.dept_id))) e[s.school_id] = true;
    });
    return e;
  }, [q]);

  const effectiveExpanded = {...expandedSchools, ...autoExpanded};

  const closeMenu = () => setMenuOpen(null);

  const FacBadge = ({ role, size=10 }) => (
    <span style={{ fontSize:size, padding:"1px 6px", borderRadius:4, fontWeight:500,
      background:role==="dean_rd"?"#E1F5EE":role==="hod"?"#E6F1FB":"#EEEDFE",
      color:role==="dean_rd"?"#085041":role==="hod"?"#0C447C":P,
    }}>{role==="dean_rd"?"Dean":role==="hod"?"HOD":"Faculty"}</span>
  );

  const roleIcon = (role) => role==="dean_rd"?"👨‍🏫":role==="hod"?"👨‍🏫":"👨‍🏫";

  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:12, marginBottom:18 }}>
        {[
          ["🏛","Schools",dashboard.kpis.total_schools,"#EEEDFE",P],
          ["🏫","Departments",dashboard.kpis.total_departments,"#E6F1FB","#0C447C"],
          ["👥","Faculty",dashboard.kpis.total_faculty,"#EAF3DE","#27500A"],
          ["💬","Citations",dashboard.kpis.total_citations?.toLocaleString(),"#FAEEDA","#633806"],
          ["📄","Publications",dashboard.kpis.total_publications,"#E1F5EE","#085041"],
          ["🎓","PhD Faculty",dashboard.kpis.phd_faculty,"#EEEDFE",P],
          ["📚","This Year",dashboard.kpis.publications_this_year,"#FCEBEB","#A32D2D"],
        ].map(([icon,label,val,bg,color]) => (
          <div key={label} style={{ background:"#fff", borderRadius:16, padding:"14px 16px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:38,height:38,borderRadius:10,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{icon}</div>
              <div>
                <div style={{ fontSize:11,color:"#888" }}>{label}</div>
                <div style={{ fontSize:20,fontWeight:700,color }}>{val}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:14 }}>
        <div style={{ width:340, background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16, flexShrink:0, display:"flex", flexDirection:"column" }}>
          <div style={{ position:"relative", marginBottom:10 }}>
            <input value={treeSearch} onChange={e=>setTreeSearch(e.target.value)} placeholder="🔍 Search schools, departments, faculty..." style={{ width:"100%", padding:"8px 10px 8px 30px", border:"1px solid #e0e0e8", borderRadius:8, fontSize:12, outline:"none", background:"#f8f8fb", boxSizing:"border-box" }} />
            <span style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#aaa" }}>🔍</span>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:600, color:"#1a1a1a" }}>Organization Explorer</span>
            <span onClick={()=>setSchoolModal(true)} style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500 }}>+ Add School</span>
          </div>
          <div style={{ flex:1, overflowY:"auto", maxHeight:"calc(100vh - 320px)" }}>
            <div style={{ fontSize:12, fontWeight:500, color:P, marginBottom:6, padding:"4px 0" }}>🏛 University</div>
            <div style={{ borderLeft:"2px solid #e8e8ee", marginLeft:8, paddingLeft:10 }}>
              {schools.filter(s=>schoolMatches(s)).map(s=>{
                const isExp = effectiveExpanded[s.school_id];
                const deptsHere = sDepts(s);
                const facHere = sFac(s);
                return (
                  <div key={s.school_id} style={{ marginBottom:4 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 6px", borderRadius:5, cursor:"pointer", background:selSchoolId===s.school_id&&!selDeptId?"#EEEDFE":"transparent", fontSize:11, position:"relative" }}
                      onClick={()=>{setSelSchoolId(s.school_id);setSelDeptId(null);setExpandedSchools({...expandedSchools,[s.school_id]:!expandedSchools[s.school_id]});}}>
                      <span style={{ fontSize:9, color:"#aaa", width:10 }}>{isExp?"▾":"▸"}</span>
                      <span>🏛</span>
                      <span style={{ fontWeight:selSchoolId===s.school_id&&!selDeptId?600:400, color:selSchoolId===s.school_id&&!selDeptId?P:"#333", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.school_name}</span>
                      <span style={{ fontSize:9, color:"#888", whiteSpace:"nowrap" }}>{deptsHere.length}d · {facHere.length}f</span>
                      <span onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===('s_'+s.school_id)?null:'s_'+s.school_id);}} style={{ fontSize:14, color:"#999", cursor:"pointer", padding:"0 2px", lineHeight:1 }}>⋮</span>
                      {menuOpen===('s_'+s.school_id) && (
                        <div style={{ position:"absolute", left:0, top:"100%", background:"#fff", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", border:"1px solid #eee", zIndex:50, minWidth:150, padding:"4px 0" }}
                          onMouseLeave={closeMenu}>
                          {["Add Department","Edit School","Delete School"].map((act,i)=>{
                            const acts = [
                              ()=>{closeMenu();setSelSchoolId(s.school_id);setSelDeptId(null);setDeptModal(true);},
                              ()=>{closeMenu();setEditForm({school_id:s.school_id,school_name:s.school_name});setEditModal(true);},
                              ()=>{closeMenu();handleDeleteSchool(s.school_id,s.school_name);},
                            ];
                            return <div key={act} onClick={acts[i]} style={{ padding:"7px 14px", fontSize:11, cursor:"pointer", color:"#333", display:"flex", alignItems:"center", gap:6 }}>{act}</div>;
                          })}
                        </div>
                      )}
                    </div>
                    {isExp && deptsHere.filter(d=>deptMatches(d)).map(d=>{
                      const dFacHere = dFac(d);
                      const isDeptExp = expandedDepts[d.dept_id];
                      return (
                        <div key={d.dept_id}>
                          <div style={{ display:"flex", alignItems:"center", gap:4, padding:"4px 6px 4px 18px", fontSize:11, cursor:"pointer", borderRadius:4, background:selDeptId===d.dept_id?"#EEEDFE":"transparent", color:selDeptId===d.dept_id?P:"#555", position:"relative" }}
                            onClick={()=>{setSelDeptId(d.dept_id);setSelSchoolId(s.school_id);setExpandedDepts({...expandedDepts,[d.dept_id]:!expandedDepts[d.dept_id]});}}>
                            <span style={{ fontSize:9, color:"#aaa", width:10 }}>{isDeptExp?"▾":"▸"}</span>
                            <span>📁</span>
                            <span style={{ fontWeight:selDeptId===d.dept_id?500:400, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.dept_code} - {d.dept_name}</span>
                            <span style={{ fontSize:9, color:"#888" }}>{dFacHere.length}f</span>
                            <span onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===('d_'+d.dept_id)?null:'d_'+d.dept_id);}} style={{ fontSize:14, color:"#999", cursor:"pointer", padding:"0 2px", lineHeight:1 }}>⋮</span>
                            {menuOpen===('d_'+d.dept_id) && (
                              <div style={{ position:"absolute", left:0, top:"100%", background:"#fff", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", border:"1px solid #eee", zIndex:50, minWidth:150, padding:"4px 0" }}
                                onMouseLeave={closeMenu}>
                                {["View Department","Edit Department","Delete Department","Assign HOD"].map((act,i)=>{
                                  const acts = [
                                    ()=>{closeMenu();setSelDeptId(d.dept_id);setSelSchoolId(s.school_id);},
                                    ()=>{closeMenu();setSelDeptId(d.dept_id);setSelSchoolId(s.school_id);const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty");setEditForm({dept_id:d.dept_id,dept_code:d.dept_code,dept_name:d.dept_name,school_id:d.school_id,hod_faculty_id:d.hod_faculty_id||"",faculty_list:hodOpts});setEditModal(true);},
                                    ()=>{closeMenu();handleDeleteDept(d.dept_id,d.dept_name);},
                                    ()=>{closeMenu();setSelDeptId(d.dept_id);setSelSchoolId(s.school_id);const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty");setEditForm({dept_id:d.dept_id,dept_code:d.dept_code,dept_name:d.dept_name,school_id:d.school_id,hod_faculty_id:d.hod_faculty_id||"",faculty_list:hodOpts});setEditModal(true);},
                                  ];
                                  return <div key={act} onClick={acts[i]} style={{ padding:"7px 14px", fontSize:11, cursor:"pointer", color:"#333" }}>{act}</div>;
                                })}
                              </div>
                            )}
                          </div>
                          {isDeptExp && dFacHere.filter(f=>f.role==="hod"&&facMatches(f)).map(f=>(
                            <div key={f.faculty_id} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 6px 3px 30px", fontSize:11, cursor:"pointer", borderRadius:4, color:"#555", position:"relative" }}
                              onClick={()=>viewFacultyProfile(f.faculty_id)}>
                              <span>👤</span>
                              <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</span>
                              <FacBadge role={f.role} size={9} />
                              <span onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===('f_'+f.faculty_id)?null:'f_'+f.faculty_id);}} style={{ fontSize:14, color:"#999", cursor:"pointer", padding:"0 2px", lineHeight:1 }}>⋮</span>
                              {menuOpen===('f_'+f.faculty_id) && (
                                <div style={{ position:"absolute", left:0, top:"100%", background:"#fff", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", border:"1px solid #eee", zIndex:50, minWidth:150, padding:"4px 0" }}
                                  onMouseLeave={closeMenu}>
                                  {["View Profile","Edit","Deactivate","Delete"].map((act,i)=>{
                                    const acts = [
                                      ()=>{closeMenu();viewFacultyProfile(f.faculty_id);},
                                      ()=>{closeMenu();setEditForm({...f});setEditModal(true);},
                                      ()=>{closeMenu();handleDeactivate(f.faculty_id,f.name);},
                                      ()=>{closeMenu();handleDelete(f.faculty_id,f.name);},
                                    ];
                                    return <div key={act} onClick={acts[i]} style={{ padding:"7px 14px", fontSize:11, cursor:"pointer", color:act==="Delete"?"#A32D2D":"#333" }}>{act}</div>;
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {isExp && deptsHere.length===0 && <div style={{ padding:"4px 6px 4px 18px", fontSize:10, color:"#aaa" }}>No departments</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <button onClick={()=>setSchoolModal(true)} style={{ width:"100%", marginTop:10, padding:"7px", background:P, color:"#fff", borderRadius:8, fontSize:11, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add School</button>
        </div>

        <div style={{ flex:1, background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16, minHeight:300 }}>
          {selDept ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>📁 {selDept.dept_name}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Code: {selDept.dept_code} · {selDeptFaculty.length} Faculty</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>{const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty");setEditForm({dept_id:selDept.dept_id,dept_code:selDept.dept_code,dept_name:selDept.dept_name,school_id:selDept.school_id,hod_faculty_id:selDept.hod_faculty_id||"",faculty_list:hodOpts});setEditModal(true);}} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid "+P,color:P,fontSize:11,background:"#fff",cursor:"pointer" }}>✏ Edit</button>
                  <button onClick={()=>handleDeleteDept(selDept.dept_id,selDept.dept_name)} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,background:"#fff",cursor:"pointer" }}>🗑</button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  ["Assigned HOD",faculty.find(f=>f.faculty_id===selDept.hod_faculty_id)?.name||"Not assigned","#E6F1FB","#0C447C"],
                  ["Faculty Count",selDeptFaculty.length,"#EEEDFE",P],
                  ["Department ID","#"+selDept.dept_id,"#f5f5f5","#666"],
                ].map(([l,v,bg,c])=>(
                  <div key={l} style={{ background:bg, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:"#333", marginBottom:8 }}>Faculty ({selDeptFaculty.length})</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                  <thead>
                    <tr style={{ background:"#f8f8fb" }}>
                      {["Name","Email","Role","Designation","Status","Actions"].map(h=><th key={h} style={{ padding:"7px 10px",fontSize:10,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {selDeptFaculty.map(f=>(
                      <tr key={f.faculty_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                        <td style={{ padding:"7px 10px", fontWeight:500, cursor:"pointer", color:P }} onClick={()=>viewFacultyProfile(f.faculty_id)}>{f.name}</td>
                        <td style={{ padding:"7px 10px", color:"#555" }}>{f.email}</td>
                        <td style={{ padding:"7px 10px" }}><FacBadge role={f.role} /></td>
                        <td style={{ padding:"7px 10px", color:"#555" }}>{f.designation}</td>
                        <td style={{ padding:"7px 10px" }}>
                          <span style={{ fontSize:9, padding:"2px 6px", borderRadius:4, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                        </td>
                        <td style={{ padding:"7px 10px" }}>
                          <div style={{ display:"flex", gap:3 }}>
                            <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"2px 6px",borderRadius:4,border:"1px solid "+P,color:P,fontSize:10,cursor:"pointer" }}>✏</span>
                            {f.is_active
                              ? <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"2px 6px",borderRadius:4,border:"1px solid #633806",color:"#633806",fontSize:10,cursor:"pointer" }}>⏸</span>
                              : <span onClick={()=>handleDelete(f.faculty_id,f.name)} style={{ padding:"2px 6px",borderRadius:4,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:10,cursor:"pointer" }}>🗑</span>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : selSchool ? (
            <>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>🏛 {selSchool.school_name}</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{selSchoolDepts.length} Departments · {selSchoolFaculty.length} Faculty</div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>{setSelSchoolId(selSchool.school_id);setDeptModal(true);}} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid "+P,color:P,fontSize:11,background:"#fff",cursor:"pointer" }}>+ Add Department</button>
                  <button onClick={()=>handleDeleteSchool(selSchool.school_id,selSchool.school_name)} style={{ padding:"6px 12px",borderRadius:6,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,background:"#fff",cursor:"pointer" }}>🗑</button>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
                {[
                  ["Total Departments",selSchoolDepts.length,"#E6F1FB","#0C447C"],
                  ["Total Faculty",selSchoolFaculty.length,"#EEEDFE",P],
                  ["Dean",faculty.find(f=>f.role==="dean_rd"&&f.school_id===selSchool.school_id)?.name||"Not assigned","#E1F5EE","#085041"],
                ].map(([l,v,bg,c])=>(
                  <div key={l} style={{ background:bg, borderRadius:10, padding:"10px 12px", textAlign:"center" }}>
                    <div style={{ fontSize:10, color:"#888", marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:16, fontWeight:700, color:c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:"#333", marginBottom:8 }}>Departments</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:"#f8f8fb" }}>
                    {["Department","Code","HOD","Faculty","Actions"].map(h=><th key={h} style={{ padding:"7px 10px",fontSize:10,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {selSchoolDepts.map(d=>{
                    const hod = faculty.find(f=>f.faculty_id===d.hod_faculty_id);
                    const dFac = faculty.filter(f=>f.dept_id===d.dept_id);
                    return (
                      <tr key={d.dept_id} style={{ borderBottom:"1px solid #f5f5f5", cursor:"pointer" }} onClick={()=>{setSelDeptId(d.dept_id);}}>
                        <td style={{ padding:"8px 10px", fontSize:11, fontWeight:500, color:"#1a1a1a" }}>{d.dept_name}</td>
                        <td style={{ padding:"8px 10px", fontSize:11, color:"#888" }}>{d.dept_code}</td>
                        <td style={{ padding:"8px 10px", fontSize:11, color:P }}>{hod?.name||"—"}</td>
                        <td style={{ padding:"8px 10px", fontSize:11 }}>{dFac.length}</td>
                        <td style={{ padding:"8px 10px" }}>
                          <div style={{ display:"flex", gap:3 }}>
                            <span onClick={e=>{e.stopPropagation();const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty");setEditForm({dept_id:d.dept_id,dept_code:d.dept_code,dept_name:d.dept_name,school_id:d.school_id,hod_faculty_id:d.hod_faculty_id||"",faculty_list:hodOpts});setEditModal(true);}} style={{ padding:"3px 6px",borderRadius:4,border:"1px solid "+P,color:P,fontSize:10,cursor:"pointer" }}>✏</span>
                            <span onClick={e=>{e.stopPropagation();handleDeleteDept(d.dept_id,d.dept_name);}} style={{ padding:"3px 6px",borderRadius:4,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:10,cursor:"pointer" }}>🗑</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{ padding:"8px 4px 4px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:18, flexWrap:"wrap" }}>
                <div>
                  <div style={{ fontSize:17, fontWeight:700, color:"#1a1a1a" }}>Institution overview</div>
                  <div style={{ fontSize:11, color:"#888", marginTop:3 }}>Research activity across NIET. Select a school or department to explore its details.</div>
                </div>
                <span style={{ fontSize:10, color:"#777", background:"#f7f6ff", border:"1px solid #eceafd", borderRadius:20, padding:"5px 9px" }}>Updated from current portal data</span>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, marginBottom:18 }}>
                {[
                  { label:"Publications this year", value:dashboard.kpis.publications_this_year || 0, growth:dashboard.kpis.growth?.publications, color:"#085041", bg:"#E1F5EE" },
                  { label:"Total citations", value:(dashboard.kpis.total_citations || 0).toLocaleString(), growth:dashboard.kpis.growth?.citations, color:"#633806", bg:"#FAEEDA" },
                ].map(metric => (
                  <div key={metric.label} style={{ padding:"14px 16px", borderRadius:12, background:metric.bg, display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                    <div>
                      <div style={{ fontSize:10, color:"#666" }}>{metric.label}</div>
                      <div style={{ fontSize:22, fontWeight:700, color:metric.color, marginTop:2 }}>{metric.value}</div>
                    </div>
                    <span style={{ fontSize:10, color:metric.growth == null ? "#777" : metric.growth >= 0 ? "#27500A" : "#A32D2D", background:"rgba(255,255,255,0.65)", padding:"5px 8px", borderRadius:8, whiteSpace:"nowrap" }}>
                      {metric.growth == null ? "Year-over-year unavailable" : `${metric.growth > 0 ? "+" : ""}${metric.growth}% YoY`}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.05fr) minmax(0, 0.95fr)", gap:14 }}>
                <section style={{ border:"1px solid #eeeef4", borderRadius:12, padding:"14px 16px", minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div style={{ fontSize:12, fontWeight:650, color:"#222" }}>Leading departments</div>
                    <span style={{ fontSize:10, color:"#888" }}>By publications</span>
                  </div>
                  {topDepartments.length === 0 ? (
                    <div style={{ padding:"24px 8px", textAlign:"center", fontSize:11, color:"#999" }}>Department research data will appear here.</div>
                  ) : topDepartments.map((department, index) => (
                    <div key={department.dept_id} style={{ display:"flex", alignItems:"center", gap:9, padding:"9px 0", borderTop:index ? "1px solid #f3f3f6" : "none" }}>
                      <span style={{ width:22, height:22, borderRadius:7, background:index === 0 ? "#EEEDFE" : "#f5f5f8", color:index === 0 ? P : "#777", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>{index + 1}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{department.dept_name}</div>
                        <div style={{ fontSize:9, color:"#999", marginTop:2 }}>{department.school_name} · {department.faculty_count || 0} faculty</div>
                        <div style={{ height:4, background:"#f0eff7", borderRadius:4, marginTop:5, overflow:"hidden" }}>
                          <div style={{ width:`${Math.max(((department.publications || 0) / maxDepartmentPublications) * 100, 2)}%`, height:"100%", background:P, borderRadius:4 }} />
                        </div>
                      </div>
                      <strong style={{ fontSize:12, color:P, minWidth:24, textAlign:"right" }}>{department.publications || 0}</strong>
                    </div>
                  ))}
                </section>

                <section style={{ border:"1px solid #eeeef4", borderRadius:12, padding:"14px 16px", minWidth:0 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:8 }}>
                    <div style={{ fontSize:12, fontWeight:650, color:"#222" }}>Explore schools</div>
                    <span style={{ fontSize:10, color:"#888" }}>{schoolStats.length} total</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:7, maxHeight:270, overflowY:"auto" }}>
                    {schoolStats.map(school => (
                      <button key={school.school_id} type="button" onClick={() => { setSelSchoolId(school.school_id); setSelDeptId(null); setExpandedSchools({ ...expandedSchools, [school.school_id]:true }); }} style={{ width:"100%", border:"1px solid #f0f0f4", background:"#fff", borderRadius:9, padding:"9px 10px", display:"flex", alignItems:"center", gap:9, textAlign:"left", cursor:"pointer" }}>
                        <span style={{ width:30, height:30, borderRadius:8, background:"#EEEDFE", color:P, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>⌂</span>
                        <span style={{ flex:1, minWidth:0 }}>
                          <span style={{ display:"block", fontSize:10, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{school.school_name}</span>
                          <span style={{ display:"block", fontSize:9, color:"#888", marginTop:2 }}>{school.department_count} departments · {school.faculty_count} faculty</span>
                        </span>
                        <span style={{ textAlign:"right", flexShrink:0 }}>
                          <strong style={{ display:"block", fontSize:11, color:P }}>{school.publication_count}</strong>
                          <span style={{ fontSize:8, color:"#999" }}>publications</span>
                        </span>
                      </button>
                    ))}
                    {schoolStats.length === 0 && <div style={{ padding:"24px 8px", textAlign:"center", fontSize:11, color:"#999" }}>Add a school to start organizing the institution.</div>}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

      {!selSchool && !selDept && (
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.05fr) minmax(0, 0.95fr)", gap:14, marginTop:14 }}>
          <section style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"16px 18px", minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:12 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:650, color:"#222" }}>Publication output by year</div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>Annual publication records</div>
              </div>
              <span style={{ fontSize:10, color:"#777" }}>{allPublications.length.toLocaleString()} total</span>
            </div>
            {facultyDetailsLoading ? (
              <div style={{ height:112, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#999" }}>Loading publication data…</div>
            ) : publicationYearStats.length === 0 ? (
              <div style={{ height:112, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#999" }}>No publication year data available.</div>
            ) : (
              <div style={{ display:"flex", alignItems:"stretch", gap:12, minHeight:112, overflowX:"auto", padding:"4px 2px 0" }}>
                {publicationYearStats.map(item => (
                  <div key={item.year} style={{ flex:"1 0 48px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", gap:5 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:P }}>{item.count}</span>
                    <div style={{ width:"min(100%, 42px)", height:68, display:"flex", alignItems:"flex-end", background:"#f0eff8", borderRadius:"6px 6px 3px 3px", overflow:"hidden" }}>
                      <div style={{ width:"100%", height:`${(item.count / maxYearlyPublications) * 100}%`, minHeight:4, background:`linear-gradient(180deg, #8b7cf6 0%, ${P} 100%)`, borderRadius:"5px 5px 0 0" }} />
                    </div>
                    <span style={{ fontSize:10, color:"#555", fontWeight:600 }}>{item.year}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"16px 18px", minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div style={{ fontSize:12, fontWeight:650, color:"#222" }}>Recent publications</div>
              <span style={{ fontSize:10, color:"#888" }}>Latest publication years</span>
            </div>
            {facultyDetailsLoading ? (
              <div style={{ padding:"28px 8px", textAlign:"center", fontSize:11, color:"#999" }}>Loading publication data…</div>
            ) : recentPublications.length === 0 ? (
              <div style={{ padding:"28px 8px", textAlign:"center", fontSize:11, color:"#999" }}>No publications to show yet.</div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column" }}>
                {recentPublications.map((pub, index) => (
                  <button key={pub.pub_id || `${pub.faculty_id}-${index}`} type="button" onClick={() => viewFacultyProfile(pub.faculty_id)} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 2px", border:0, borderTop:index ? "1px solid #f1f1f5" : "none", background:"transparent", textAlign:"left", cursor:"pointer" }}>
                    <span style={{ width:28, height:28, borderRadius:8, background:"#EEEDFE", color:P, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>{pub.year || "—"}</span>
                    <span style={{ flex:1, minWidth:0 }}>
                      <span style={{ display:"block", fontSize:10, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pub.title}</span>
                      <span style={{ display:"block", fontSize:9, color:"#888", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{pub.faculty_name} · {pub.dept_name || "Unassigned"}</span>
                    </span>
                    <span style={{ fontSize:9, color:"#777", whiteSpace:"nowrap" }}>{pub.citations_count || 0} citations</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function SchoolsView({ schools, depts, faculty, expandedSchools, setExpandedSchools, selSchoolId, setSelSchoolId, setSchoolModal, setDeptModal, handleDeleteSchool, handleDeleteDept, setEditModal, setEditForm, P, setImportEntity }) {
  const selSchool = schools.find(s=>s.school_id===selSchoolId)||null;
  const selSchoolDepts = selSchool ? depts.filter(d=>d.school_id===selSchool.school_id) : [];
  const selSchoolFaculty = selSchool ? faculty.filter(f=>selSchoolDepts.some(d=>d.dept_id===f.dept_id)) : [];
  const schoolStats = schools.map(school => {
    const departments = depts.filter(d=>d.school_id===school.school_id);
    const departmentIds = new Set(departments.map(d=>d.dept_id));
    const schoolFaculty = faculty.filter(f=>departmentIds.has(f.dept_id));
    return { ...school, departments, facultyCount:schoolFaculty.length, dean:schoolFaculty.find(f=>f.role==="dean_rd") };
  });
  const facultyScale = Math.max(...schoolStats.map(school=>school.facultyCount), 1);
  const departmentActivity = (selSchool ? selSchoolDepts : depts)
    .map(department => ({ ...department, schoolName:schools.find(s=>s.school_id===department.school_id)?.school_name, facultyCount:faculty.filter(person=>person.dept_id===department.dept_id).length }))
    .sort((a,b)=>b.facultyCount-a.facultyCount || a.dept_name.localeCompare(b.dept_name))
    .slice(0,6);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:14, alignItems:"stretch" }}>
      <div style={{ width:320, background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16, flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:12 }}>Schools Management</div>
        <div style={{ borderLeft:"2px solid #e8e8ee", marginLeft:8, paddingLeft:12 }}>
          {schools.map(s=>{
            const isExpanded = expandedSchools[s.school_id];
            const sDepts = depts.filter(d=>d.school_id===s.school_id);
            return (
              <div key={s.school_id} style={{ marginBottom:6 }}>
                <div onClick={()=>{setSelSchoolId(s.school_id);setExpandedSchools({...expandedSchools,[s.school_id]:!isExpanded});}} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 8px", borderRadius:6, cursor:"pointer", background:selSchoolId===s.school_id?"#EEEDFE":"transparent", fontSize:12 }}>
                  <span style={{ fontSize:10, color:"#aaa" }}>{isExpanded?"▾":"▸"}</span>
                  <span>🏛</span>
                  <span style={{ fontWeight:selSchoolId===s.school_id?600:400, color:selSchoolId===s.school_id?P:"#333" }}>{s.school_name}</span>
                  <span style={{ fontSize:10, color:"#888", marginLeft:"auto" }}>{sDepts.length} depts</span>
                </div>
                {isExpanded && sDepts.map(d=>{
                  const dFac = faculty.filter(f=>f.dept_id===d.dept_id);
                  return (
                    <div key={d.dept_id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px 4px 28px", fontSize:11, color:"#666" }}>
                      <span>📁</span>
                      <span>{d.dept_code}</span>
                      <span style={{ fontSize:10, color:"#aaa", marginLeft:"auto" }}>{dFac.length} fac</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <button onClick={()=>setSchoolModal(true)} style={{ width:"100%", marginTop:12, padding:"8px", background:P, color:"#fff", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add School</button>
        <button onClick={()=>setImportEntity("schools")} style={{ width:"100%", marginTop:8, padding:"8px", background:"#fff", color:P, borderRadius:8, fontSize:12, fontWeight:500, border:"1px solid "+P, cursor:"pointer" }}>📥 Import Schools</button>
      </div>
      <div style={{ flex:1, background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16 }}>
        {selSchool ? (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>{selSchool.school_name}</div>
                <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{selSchoolDepts.length} Departments · {selSchoolFaculty.length} Faculty</div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setDeptModal(true)} style={{ background:P, color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add Department</button>
                <button onClick={()=>handleDeleteSchool(selSchool.school_id,selSchool.school_name)} style={{ background:"#FCEBEB", color:"#A32D2D", padding:"8px 14px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>🗑</button>
              </div>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f8f8fb" }}>
                  {["Department","Code","HOD","Faculty","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {selSchoolDepts.map(d=>{
                  const hod = faculty.find(f=>f.faculty_id===d.hod_faculty_id);
                  const dFac = faculty.filter(f=>f.dept_id===d.dept_id);
                  return (
                    <tr key={d.dept_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                      <td style={{ padding:"10px 12px", fontSize:12, fontWeight:500, color:"#1a1a1a" }}>{d.dept_name}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:"#888" }}>{d.dept_code}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:P }}>{hod?.name||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:12 }}>{dFac.length}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <span onClick={()=>{const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty"); setEditForm({dept_id:d.dept_id,dept_code:d.dept_code,dept_name:d.dept_name,school_id:d.school_id,hod_faculty_id:d.hod_faculty_id||"",faculty_list:hodOpts}); setEditModal(true);}} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+P, color:P, fontSize:11, cursor:"pointer" }}>✏</span>
                          <span onClick={()=>handleDeleteDept(d.dept_id,d.dept_name)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #A32D2D", color:"#A32D2D", fontSize:11, cursor:"pointer" }}>🗑</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div style={{ padding:"8px 4px 4px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, marginBottom:16, flexWrap:"wrap" }}>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:"#1a1a1a" }}>Schools overview</div>
                <div style={{ fontSize:11, color:"#888", marginTop:3 }}>Explore school structure and open a school to manage its departments.</div>
              </div>
              <button onClick={()=>setSchoolModal(true)} style={{ background:P, color:"#fff", padding:"8px 14px", borderRadius:8, fontSize:11, fontWeight:600, border:"none", cursor:"pointer" }}>+ Add School</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:16 }}>
              {[
                { label:"Schools", value:schools.length, color:P, bg:"#EEEDFE" },
                { label:"Departments", value:depts.length, color:"#085041", bg:"#E1F5EE" },
                { label:"Faculty members", value:faculty.length, color:"#633806", bg:"#FAEEDA" },
              ].map(metric=><div key={metric.label} style={{ padding:"12px 14px", borderRadius:11, background:metric.bg }}>
                <div style={{ fontSize:10, color:"#666" }}>{metric.label}</div>
                <div style={{ fontSize:21, fontWeight:700, color:metric.color, marginTop:3 }}>{metric.value.toLocaleString()}</div>
              </div>)}
            </div>
            {schoolStats.length ? (
              <section style={{ border:"1px solid #eeeef4", borderRadius:12, overflow:"hidden" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 14px", background:"#fafafd", borderBottom:"1px solid #eeeef4" }}>
                  <div style={{ fontSize:12, fontWeight:650, color:"#222" }}>School directory</div>
                  <span style={{ fontSize:10, color:"#888" }}>Select a school to view details</span>
                </div>
                <div style={{ maxHeight:310, overflowY:"auto" }}>
                  {schoolStats.map((school,index)=><button key={school.school_id} type="button" onClick={()=>{setSelSchoolId(school.school_id);setExpandedSchools({...expandedSchools,[school.school_id]:true});}} style={{ width:"100%", display:"grid", gridTemplateColumns:"minmax(0,1fr) 76px 76px minmax(90px,0.8fr) 18px", alignItems:"center", gap:10, padding:"11px 14px", border:0, borderBottom:index===schoolStats.length-1?0:"1px solid #f0f0f4", background:"#fff", textAlign:"left", cursor:"pointer" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:9, minWidth:0 }}>
                      <span style={{ width:30, height:30, borderRadius:8, background:"#EEEDFE", color:P, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>⌂</span>
                      <span style={{ minWidth:0 }}>
                        <span style={{ display:"block", fontSize:11, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{school.school_name}</span>
                        <span style={{ display:"block", fontSize:9, color:"#888", marginTop:2 }}>{school.dean ? `Dean: ${school.dean.name}` : "Dean not assigned"}</span>
                      </span>
                    </span>
                    <span style={{ textAlign:"right" }}><strong style={{ display:"block", fontSize:12, color:"#333" }}>{school.departments.length}</strong><span style={{ fontSize:9, color:"#888" }}>departments</span></span>
                    <span style={{ textAlign:"right" }}><strong style={{ display:"block", fontSize:12, color:P }}>{school.facultyCount}</strong><span style={{ fontSize:9, color:"#888" }}>faculty</span></span>
                    <span style={{ height:5, background:"#f0eff7", borderRadius:5, overflow:"hidden" }}><span style={{ display:"block", width:`${faculty.length ? Math.max(school.facultyCount/faculty.length*100,2) : 0}%`, height:"100%", background:P, borderRadius:5 }} /></span>
                    <span style={{ color:P, fontSize:16 }}>›</span>
                  </button>)}
                </div>
              </section>
            ) : (
              <div style={{ padding:"32px 12px", textAlign:"center", border:"1px dashed #ddd9f4", borderRadius:12, color:"#888", fontSize:12 }}>No schools yet. Add a school to start organizing the institution.</div>
            )}
          </div>
        )}
      </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:14 }}>
        <section style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"16px 18px", minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:13 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:650, color:"#222" }}>Faculty across schools</div>
              <div style={{ fontSize:10, color:"#888", marginTop:3 }}>Compare faculty distribution by school</div>
            </div>
            <span style={{ fontSize:10, color:"#777", background:"#f7f6ff", borderRadius:20, padding:"5px 9px" }}>{faculty.length} total</span>
          </div>
          {schoolStats.length ? <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
            {schoolStats.map(school=><div key={school.school_id} style={{ display:"grid", gridTemplateColumns:"minmax(90px, 0.8fr) minmax(70px, 1fr) 28px", alignItems:"center", gap:10 }}>
              <span title={school.school_name} style={{ fontSize:10, color:"#555", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{school.school_name}</span>
              <span style={{ height:7, background:"#f0eff7", borderRadius:8, overflow:"hidden" }}><span style={{ display:"block", width:`${school.facultyCount/facultyScale*100}%`, height:"100%", minWidth:school.facultyCount?4:0, background:`linear-gradient(90deg, #8b7cf6 0%, ${P} 100%)`, borderRadius:8 }} /></span>
              <strong style={{ textAlign:"right", fontSize:11, color:P }}>{school.facultyCount}</strong>
            </div>)}
          </div> : <div style={{ padding:"22px 8px", textAlign:"center", fontSize:11, color:"#999" }}>Add schools to compare faculty distribution.</div>}
        </section>
        <section style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"16px 18px", minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:13 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:650, color:"#222" }}>Department breakdown</div>
              <div style={{ fontSize:10, color:"#888", marginTop:3 }}>{selSchool ? selSchool.school_name : "Top departments across all schools"}</div>
            </div>
            <span style={{ fontSize:10, color:"#777" }}>{selSchool ? selSchoolDepts.length : depts.length} departments</span>
          </div>
          {departmentActivity.length ? <div style={{ display:"flex", flexDirection:"column" }}>
            {departmentActivity.map((department,index)=><div key={department.dept_id} style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 0", borderTop:index?"1px solid #f3f3f6":"none" }}>
              <span style={{ width:25, height:25, borderRadius:7, background:"#EEEDFE", color:P, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, flexShrink:0 }}>{index+1}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:10, fontWeight:600, color:"#333", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{department.dept_name}</div>
                <div style={{ fontSize:9, color:"#999", marginTop:2 }}>{department.schoolName || "School not assigned"}</div>
              </div>
              <strong style={{ fontSize:11, color:P, whiteSpace:"nowrap" }}>{department.facultyCount} faculty</strong>
            </div>)}
          </div> : <div style={{ padding:"22px 8px", textAlign:"center", fontSize:11, color:"#999" }}>{selSchool ? "No departments in this school yet." : "Add departments to see the breakdown."}</div>}
        </section>
      </div>
    </div>
  );
}

function DeptsView({ depts, schools, faculty, setDeptModal, setEditModal, setEditForm, handleDeleteDept, P, setImportEntity }) {
  const [deptSearch, setDeptSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const filtered = depts.filter(d=>{
    if (schoolFilter!=="all" && d.school_id!==parseInt(schoolFilter)) return false;
    if (deptSearch && !d.dept_name?.toLowerCase().includes(deptSearch.toLowerCase()) && !d.dept_code?.toLowerCase().includes(deptSearch.toLowerCase())) return false;
    return true;
  });
  return (
    <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>All Departments</div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Total: {depts.length} departments across {schools.length} schools</div>
        </div>
        <button onClick={()=>setDeptModal(true)} style={{ background:P, color:"#fff", padding:"8px 20px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add Department</button>
        <button onClick={()=>setImportEntity("departments")} style={{ background:"#fff", color:P, padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:500, border:"1px solid "+P, cursor:"pointer" }}>📥 Import</button>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <input value={deptSearch} onChange={e=>setDeptSearch(e.target.value)} placeholder="Search departments..." style={{ padding:"7px 12px", border:"1px solid #e0e0e8", borderRadius:8, fontSize:12, width:260, outline:"none", background:"#f8f8fb" }} />
        <select value={schoolFilter} onChange={e=>setSchoolFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
          <option value="all">All Schools</option>
          {schools.map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}
        </select>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:"#f8f8fb" }}>
            {["Department","Code","School","HOD","Faculty","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {filtered.map(d=>{
            const school = schools.find(s=>s.school_id===d.school_id);
            const hod = faculty.find(f=>f.faculty_id===d.hod_faculty_id);
            const dFac = faculty.filter(f=>f.dept_id===d.dept_id);
            return (
              <tr key={d.dept_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                <td style={{ padding:"8px 12px", fontSize:12, fontWeight:500, color:"#1a1a1a" }}>{d.dept_name}</td>
                <td style={{ padding:"8px 12px", fontSize:12, color:"#888" }}>{d.dept_code}</td>
                <td style={{ padding:"8px 12px", fontSize:12, color:"#0C447C" }}>{school?.school_name||"—"}</td>
                <td style={{ padding:"8px 12px", fontSize:12, color:P }}>{hod?.name||"—"}</td>
                <td style={{ padding:"8px 12px", fontSize:12 }}>{dFac.length}</td>
                <td style={{ padding:"8px 12px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <span onClick={()=>{const hodOpts=faculty.filter(f=>f.role==="hod"||f.role==="faculty"); setEditForm({dept_id:d.dept_id,dept_code:d.dept_code,dept_name:d.dept_name,school_id:d.school_id,hod_faculty_id:d.hod_faculty_id||"",faculty_list:hodOpts}); setEditModal(true);}} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid "+P, color:P, fontSize:11, cursor:"pointer" }}>✏</span>
                    <span onClick={()=>handleDeleteDept(d.dept_id,d.dept_name)} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #A32D2D", color:"#A32D2D", fontSize:11, cursor:"pointer" }}>🗑</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {filtered.length===0 && <tr><td colSpan={6} style={{ padding:30, textAlign:"center", color:"#aaa", fontSize:12 }}>No departments found</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function FacultyView({ faculty, loading, filteredFaculty, roleFilter, setRoleFilter, deptFilter, setDeptFilter, depts, setModal, setEditModal, setEditForm, handleDeactivate, handleDelete, P, viewFacultyProfile, syncing, handleAdminSync, setImportEntity }) {
  const [facultyPage, setFacultyPage] = useState(0);
  const facultyPageSize = 10;
  const facultyPageCount = Math.ceil(filteredFaculty.length / facultyPageSize);
  const pageFaculty = filteredFaculty.slice(facultyPage * facultyPageSize, (facultyPage + 1) * facultyPageSize);
  useEffect(() => setFacultyPage(0), [filteredFaculty, roleFilter, deptFilter]);

  const PlatformBadges = ({ f }) => {
    const items = [
      { key:"scholar", label:"Scholar", connected:f.scholar_connected },
      { key:"orcid", label:"ORCID", connected:f.orcid_connected },
      { key:"scopus", label:"Scopus", connected:f.scopus_connected },
    ];
    return (
      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
        {items.map(i=>(
          <span key={i.key} style={{ fontSize:9, padding:"2px 6px", borderRadius:6, fontWeight:600,
            background:i.connected?"#EAF3DE":"#F5F5F7",
            color:i.connected?"#27500A":"#999",
            border:i.connected?"1px solid #C7DFB0":"1px solid #eee",
          }}>{i.label}{i.connected?" ✓":""}</span>
        ))}
      </div>
    );
  };
  return (
    <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Faculty Management</div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Total: {faculty.length} faculty members</div>
        </div>
        <button onClick={()=>{setModal(true);}} style={{ background:P, color:"#fff", padding:"8px 20px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add Faculty</button>
        <button onClick={()=>setImportEntity("faculty")} style={{ background:"#fff", color:P, padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:500, border:"1px solid "+P, cursor:"pointer" }}>📥 Import</button>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <select value={roleFilter} onChange={e=>{setFacultyPage(0);setRoleFilter(e.target.value);}} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
          <option value="all">All Roles</option>
          <option value="faculty">Faculty</option>
          <option value="hod">HOD</option>
          <option value="dean_rd">Dean</option>
        </select>
        <select value={deptFilter} onChange={e=>{setFacultyPage(0);setDeptFilter(e.target.value);}} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
          <option value="all">All Departments</option>
          {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f8f8fb" }}>
              {["Name","Email","Role","Department","Platforms","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{padding:30,textAlign:"center"}}>Loading...</td></tr>
            : pageFaculty.map(f=>(
              <tr key={f.faculty_id} style={{ borderBottom:"1px solid #f5f5f5", opacity:f.is_active?1:0.5 }}>
                <td style={{ padding:"8px 12px", fontWeight:500, cursor:"pointer" }} onClick={()=>viewFacultyProfile(f.faculty_id)}>
                  <span style={{ color:P, borderBottom:"1px dashed rgba(91,61,245,0.3)" }}>{f.name}</span>
                </td>
                <td style={{ padding:"8px 12px", color:"#555" }}>{f.email}</td>
                <td style={{ padding:"8px 12px" }}>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, fontWeight:500,
                    background:f.role==="dean_rd"?"#E1F5EE":f.role==="hod"?"#E6F1FB":"#EEEDFE",
                    color:f.role==="dean_rd"?"#085041":f.role==="hod"?"#0C447C":P,
                  }}>{f.role==="dean_rd"?"Dean":f.role==="hod"?"HOD":"Faculty"}</span>
                </td>
                <td style={{ padding:"8px 12px", color:"#555" }}>{f.dept_name||"—"}</td>
                <td style={{ padding:"8px 12px" }}><PlatformBadges f={f} /></td>
                <td style={{ padding:"8px 12px" }}>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                </td>
                <td style={{ padding:"8px 12px" }}>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid "+P,color:P,fontSize:11,cursor:"pointer" }}>✏</span>
                    {f.is_active
                      ? <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #633806",color:"#633806",fontSize:11,cursor:"pointer" }}>⏸</span>
                      : <span onClick={()=>handleDelete(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,cursor:"pointer" }}>🗑</span>
                    }
                    <span onClick={()=>handleAdminSync(f.faculty_id)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #0C447C",color:"#0C447C",fontSize:10,cursor:"pointer", whiteSpace:"nowrap" }}>
                      {syncing===f.faculty_id ? "⏳ Syncing..." : "🔄 Sync"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loading && filteredFaculty.length > 0 && <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginTop:14, flexWrap:"wrap" }}>
        <span style={{ fontSize:11, color:"#777" }}>Showing {facultyPage * facultyPageSize + 1}–{Math.min((facultyPage + 1) * facultyPageSize, filteredFaculty.length)} of {filteredFaculty.length} faculty members</span>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button type="button" onClick={()=>setFacultyPage(page=>Math.max(0,page-1))} disabled={facultyPage===0} style={{ padding:"6px 10px", border:"1px solid #e3e1ed", borderRadius:7, background:facultyPage===0?"#f8f8fb":"#fff", color:facultyPage===0?"#aaa":P, fontSize:11, cursor:facultyPage===0?"not-allowed":"pointer" }}>Previous</button>
          <span style={{ padding:"0 5px", fontSize:11, color:"#666" }}>Page {facultyPage+1} of {facultyPageCount}</span>
          <button type="button" onClick={()=>setFacultyPage(page=>Math.min(facultyPageCount-1,page+1))} disabled={facultyPage>=facultyPageCount-1} style={{ padding:"6px 10px", border:"1px solid #e3e1ed", borderRadius:7, background:facultyPage>=facultyPageCount-1?"#f8f8fb":"#fff", color:facultyPage>=facultyPageCount-1?"#aaa":P, fontSize:11, cursor:facultyPage>=facultyPageCount-1?"not-allowed":"pointer" }}>Next</button>
        </div>
      </div>}
    </div>
  );
}

function ExportView({ faculty, schools, depts, P, showMsg, setActiveView }) {
  const handleExport = (type) => {
    try {
      let csv = "", filename = "";
      if (type === "faculty") {
        csv = "Name,Email,Role,Department,Designation,PhD,Joining Year,Active\n" +
          faculty.map(f=>`"${f.name}","${f.email}","${f.role}","${f.dept_name||""}","${f.designation||""}","${f.is_phd?"Yes":"No"}","${f.joining_year||""}","${f.is_active?"Yes":"No"}"`).join("\n");
        filename = "faculty_export.csv";
      } else if (type === "depts") {
        csv = "Department,Code,School,HOD\n" +
          depts.map(d=>{const s=schools.find(s=>s.school_id===d.school_id); return `"${d.dept_name}","${d.dept_code}","${s?.school_name||""}","${d.hod_faculty_id||""}"`;}).join("\n");
        filename = "departments_export.csv";
      } else {
        csv = "School,Departments\n" +
          schools.map(s=>`"${s.school_name}","${depts.filter(d=>d.school_id===s.school_id).length}"`).join("\n");
        filename = "schools_export.csv";
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showMsg("success", `✅ ${filename} downloaded`);
    } catch { showMsg("error", "Export failed"); }
    setActiveView("overview");
  };

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:"30px 28px", textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>📥</div>
        <div style={{ fontSize:18, fontWeight:600, color:"#1a1a1a", marginBottom:6 }}>Export Data</div>
        <div style={{ fontSize:12, color:"#888", marginBottom:24 }}>Download system data as CSV files</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {[
            { label:"Export Faculty List", icon:"👥", type:"faculty", desc:"All faculty, HODs, and Deans with roles and departments" },
            { label:"Export Departments", icon:"🏫", type:"depts", desc:"All departments with school assignments" },
            { label:"Export Schools", icon:"🏛", type:"schools", desc:"All schools with department counts" },
          ].map(item=>(
            <div key={item.type} onClick={()=>handleExport(item.type)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:12, background:"#f8f8fb", cursor:"pointer", border:"1px solid #f0f0f5", transition:"background 0.15s" }}>
              <span style={{ fontSize:24 }}>{item.icon}</span>
              <div style={{ flex:1, textAlign:"left" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>{item.label}</div>
                <div style={{ fontSize:11, color:"#888" }}>{item.desc}</div>
              </div>
              <span style={{ fontSize:12, color:P, fontWeight:600 }}>Download →</span>
            </div>
          ))}
        </div>
        <button onClick={()=>setActiveView("overview")} style={{ marginTop:18, padding:"8px 24px", background:"#f0f0f5", color:"#666", border:"none", borderRadius:8, fontSize:12, cursor:"pointer" }}>Back to Dashboard</button>
      </div>
    </div>
  );
}

// ═══ FACULTY DETAILS VIEW ═══
function FacultyDetailsView({ facultyDetails, facultyDetailsLoading, fdSearch, setFdSearch, fdRoleFilter, setFdRoleFilter, fdDeptFilter, setFdDeptFilter, depts, expandedFac, setExpandedFac, P, fdViewing, setFdViewing }) {
  const [publicationPage, setPublicationPage] = useState(0);
  const [facultyPage, setFacultyPage] = useState(0);
  const publicationsPerPage = 5;
  const facultiesPerPage = 10;

  useEffect(() => {
    setPublicationPage(0);
  }, [fdViewing?.faculty_id]);

  useEffect(() => {
    setFacultyPage(0);
  }, [fdSearch, fdRoleFilter, fdDeptFilter]);

  const fdFiltered = facultyDetails.filter(f => {
    if (fdRoleFilter !== "all" && f.role !== fdRoleFilter) return false;
    if (fdDeptFilter !== "all" && f.dept_id !== parseInt(fdDeptFilter)) return false;
    if (!fdSearch) return true;
    const q = fdSearch.toLowerCase();
    return f.name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q) || f.dept_name?.toLowerCase().includes(q);
  });

  const toggleFac = (id) => setExpandedFac(p => ({ ...p, [id]: !p[id] }));
  const facultyPageCount = Math.ceil(fdFiltered.length / facultiesPerPage);
  const firstFaculty = facultyPage * facultiesPerPage;
  const visibleFaculty = fdFiltered.slice(firstFaculty, firstFaculty + facultiesPerPage);

  const changeFacultyPage = (nextPage) => {
    setFacultyPage(nextPage);
    requestAnimationFrame(() => document.getElementById("faculty-details-list")?.scrollIntoView({ behavior:"smooth", block:"start" }));
  };

  if (fdViewing) {
    const f = fdViewing;
    const publications = f.publications || [];
    const pageCount = Math.ceil(publications.length / publicationsPerPage);
    const firstPublication = publicationPage * publicationsPerPage;
    const visiblePublications = publications.slice(firstPublication, firstPublication + publicationsPerPage);

    const changePublicationPage = (nextPage) => {
      setPublicationPage(nextPage);
      requestAnimationFrame(() => document.getElementById("faculty-publications-list")?.scrollIntoView({ behavior:"smooth", block:"start" }));
    };

    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <span onClick={()=>setFdViewing(null)} style={{ color:P, fontSize:13, cursor:"pointer", fontWeight:500 }}>← Back to Faculty List</span>
          <span style={{ color:"#ddd" }}>|</span>
          <span style={{ fontSize:13, fontWeight:600 }}>{f.name} — Publications ({f.publications.length})</span>
        </div>
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"10px 16px", fontSize:12, display:"flex", gap:20, flex:1 }}>
            <div><span style={{ color:"#888" }}>Role:</span> <strong>{f.role}</strong></div>
            <div><span style={{ color:"#888" }}>Dept:</span> <strong>{f.dept_name}</strong></div>
            <div><span style={{ color:"#888" }}>Designation:</span> <strong>{f.designation}</strong></div>
            <div><span style={{ color:"#888" }}>h-index:</span> <strong>{f.h_index}</strong></div>
            <div><span style={{ color:"#888" }}>Total Pubs:</span> <strong>{f.total_publications}</strong></div>
            <div><span style={{ color:"#888" }}>Citations:</span> <strong>{f.total_citations}</strong></div>
          </div>
        </div>
        <div id="faculty-publications-list" style={{ display:"flex", flexDirection:"column", gap:12, scrollMarginTop:12 }}>
          {visiblePublications.map(p => {
            const isConf = p.publication_type === "Conference";
            const desc = p.description || "";
            const citData = p.citations_by_year || [];
            const maxCit = Math.max(...citData.map(c => c.count || 0), 1);
            return (
              <div key={p.pub_id} style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"16px 20px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a", flex:1 }}>{p.title}</div>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:500, whiteSpace:"nowrap", background:isConf ? "#FAEEDA" : "#E6F1FB", color:isConf ? "#633806" : "#0C447C" }}>{isConf ? "Conference" : "Journal"}</span>
                </div>
                <div style={{ fontSize:11, color:"#666", marginBottom:4 }}>
                  {isConf ? (p.conference_name || p.journal_name) : p.journal_name}
                  {p.year ? <span style={{color:"#aaa"}}> · {p.year}</span> : ""}
                  {p.citations_count > 0 ? <span style={{color:"#aaa"}}> · {p.citations_count} citations</span> : ""}
                  {p.quartile && p.quartile !== "N/A" ? <span style={{color:"#aaa"}}> · {p.quartile}</span> : ""}
                  {p.indexing && p.indexing !== "None" ? <span style={{color:"#aaa"}}> · {p.indexing}</span> : ""}
                </div>
                {desc && (
                  <p style={{ fontSize:11, color:"#555", lineHeight:1.6, margin:"6px 0 8px", whiteSpace:"pre-wrap" }}>{desc}</p>
                )}
                {citData.length > 0 && (
                  <div style={{ marginTop:12, padding:"12px 14px", background:"#fafaff", border:"1px solid #e8e7f5", borderRadius:10 }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:8 }}>
                      <span style={{ fontSize:11, fontWeight:600, color:"#333" }}>Citations by year</span>
                      <span style={{ fontSize:10, color:"#666" }}>Publication total: <strong style={{ color:P }}>{p.citations_count || 0}</strong></span>
                    </div>
                    <div style={{ display:"flex", alignItems:"flex-end", gap:10, overflowX:"auto", padding:"4px 2px 2px" }}>
                      {citData.map(c => {
                        const count = Number(c.count) || 0;
                        const barHeight = (count / maxCit) * 100;
                        return (
                          <div key={c.year} aria-label={`${c.year}: ${count} citations`} style={{ flex:"0 0 48px", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                            <span style={{ fontSize:12, lineHeight:1.2, fontWeight:700, color:"#312e81" }}>{count}</span>
                            <div style={{ width:28, height:68, display:"flex", alignItems:"flex-end", background:"#eeedfb", borderRadius:5, overflow:"hidden" }}>
                              <div style={{ width:"100%", height:`${barHeight}%`, minHeight:count > 0 ? 5 : 2, background:`linear-gradient(180deg, #7c6af2 0%, ${P} 100%)`, borderRadius:"4px 4px 0 0" }} />
                            </div>
                            <span style={{ fontSize:11, lineHeight:1.2, fontWeight:600, color:"#444" }}>{c.year}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ fontSize:10, color:"#aaa", marginTop:4, display:"flex", gap:12 }}>
                  {p.doi ? <span>DOI: {p.doi}</span> : null}
                  {p.publisher ? <span>Publisher: {p.publisher}</span> : null}
                </div>
              </div>
            );
          })}
          {publications.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>No publications found for this faculty member</div>}
        </div>
        {pageCount > 1 && (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginTop:16, padding:"12px 14px", background:"#fff", border:"1px solid #eee", borderRadius:10 }}>
            <span style={{ fontSize:12, color:"#666" }}>
              Showing {firstPublication + 1}–{Math.min(firstPublication + publicationsPerPage, publications.length)} of {publications.length} publications
            </span>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button type="button" disabled={publicationPage === 0} onClick={() => changePublicationPage(publicationPage - 1)} style={{ padding:"7px 12px", border:"1px solid #ddd", borderRadius:7, background:publicationPage === 0 ? "#f6f6f6" : "#fff", color:publicationPage === 0 ? "#aaa" : "#333", cursor:publicationPage === 0 ? "not-allowed" : "pointer" }}>Previous</button>
              <span aria-live="polite" style={{ minWidth:76, textAlign:"center", fontSize:12, color:"#555" }}>Page {publicationPage + 1} of {pageCount}</span>
              <button type="button" disabled={publicationPage >= pageCount - 1} onClick={() => changePublicationPage(publicationPage + 1)} style={{ padding:"7px 12px", border:"1px solid #ddd", borderRadius:7, background:publicationPage >= pageCount - 1 ? "#f6f6f6" : P, color:publicationPage >= pageCount - 1 ? "#aaa" : "#fff", cursor:publicationPage >= pageCount - 1 ? "not-allowed" : "pointer" }}>Next</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:16, fontWeight:600, marginBottom:4 }}>Faculty Details</div>
      <div style={{ fontSize:11, color:"#888", marginBottom:14 }}>View all faculty members with their publication descriptions</div>

      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input value={fdSearch} onChange={e=>setFdSearch(e.target.value)} placeholder="Search faculty by name or email..." style={{ flex:1, minWidth:200, padding:"7px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }} />
        <select value={fdRoleFilter} onChange={e=>setFdRoleFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }}>
          <option value="all">All Roles</option>
          <option value="faculty">Faculty</option>
          <option value="hod">HOD</option>
          <option value="dean_rd">Dean</option>
        </select>
        <select value={fdDeptFilter} onChange={e=>setFdDeptFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }}>
          <option value="all">All Departments</option>
          {depts.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
      </div>

      {facultyDetailsLoading ? (
        <div style={{ textAlign:"center", padding:40 }}><div className="spinner" /></div>
      ) : fdFiltered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#aaa" }}>No faculty match your filters</div>
      ) : (
        <>
        <div id="faculty-details-list" style={{ display:"flex", flexDirection:"column", gap:8, scrollMarginTop:12 }}>
          {visibleFaculty.map(f => (
            <div key={f.faculty_id} style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
              <div onClick={()=>toggleFac(f.faculty_id)} style={{ padding:"12px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", background:expandedFac[f.faculty_id] ? "#f8f8fb" : "#fff" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:P, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, flexShrink:0 }}>{f.name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:"#888" }}>{f.email} · {f.dept_name} · {f.designation}</div>
                </div>
                <div style={{ display:"flex", gap:12, alignItems:"center", fontSize:11, color:"#888" }}>
                  <span>📄 {f.total_publications}</span>
                  <span>📊 {f.total_citations}</span>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:500, background:f.role==="dean_rd"?"#FAEEDA":f.role==="hod"?"#E6F1FB":"#f0f0f0", color:f.role==="dean_rd"?"#633806":f.role==="hod"?"#0C447C":"#666" }}>{f.role === "dean_rd" ? "Dean" : f.role === "hod" ? "HOD" : "Faculty"}</span>
                  <span>{expandedFac[f.faculty_id] ? "▲" : "▼"}</span>
                </div>
              </div>
              {expandedFac[f.faculty_id] && (
                <div>
                  <div style={{ padding:"0 16px 12px", display:"flex", gap:8, flexWrap:"wrap" }}>
                    {f.publications.length > 0 ? (
                      f.publications.slice(0, 5).map(p => {
                        const isConf = p.publication_type === "Conference";
                        return (
                          <div key={p.pub_id} style={{ flex:"1 1 calc(50% - 6px)", minWidth:280, background:"#f9f9fc", borderRadius:8, padding:"10px 14px", cursor:"pointer" }} onClick={() => setFdViewing(f)}>
                            <div style={{ fontSize:12, fontWeight:500, color:"#333", marginBottom:3 }}>{p.title}</div>
                            <div style={{ fontSize:10, color:"#888", marginBottom:3 }}>
                              {isConf ? (p.conference_name || p.journal_name) : p.journal_name} · {p.year}
                            </div>
                            {p.description && <div style={{ fontSize:10, color:"#666", lineHeight:1.5, marginBottom:3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.description}</div>}
                            <div style={{ display:"flex", gap:6 }}>
                              <span style={{ fontSize:9, padding:"1px 6px", borderRadius:3, background:isConf?"#FAEEDA":"#E6F1FB", color:isConf?"#633806":"#0C447C" }}>{isConf ? "Conf" : "Journal"}</span>
                              {p.citations_count > 0 && <span style={{ fontSize:9, color:"#888" }}>{p.citations_count} cit</span>}
                              {p.quartile && p.quartile !== "N/A" && <span style={{ fontSize:9, color:"#888" }}>{p.quartile}</span>}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ fontSize:11, color:"#aaa", padding:"10px 0" }}>No publications</div>
                    )}
                  </div>
                  {f.publications.length > 5 && (
                    <div style={{ padding:"0 16px 12px" }}>
                      <span onClick={() => setFdViewing(f)} style={{ color:P, fontSize:11, cursor:"pointer", fontWeight:500 }}>View all {f.publications.length} publications →</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      {facultyPageCount > 1 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap", marginTop:16, padding:"12px 14px", background:"#fff", border:"1px solid #eee", borderRadius:10 }}>
          <span style={{ fontSize:12, color:"#666" }}>
            Showing {firstFaculty + 1}–{Math.min(firstFaculty + facultiesPerPage, fdFiltered.length)} of {fdFiltered.length} faculty
          </span>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <button type="button" disabled={facultyPage === 0} onClick={() => changeFacultyPage(facultyPage - 1)} style={{ padding:"7px 12px", border:"1px solid #ddd", borderRadius:7, background:facultyPage === 0 ? "#f6f6f6" : "#fff", color:facultyPage === 0 ? "#aaa" : "#333", cursor:facultyPage === 0 ? "not-allowed" : "pointer" }}>Previous</button>
            <span aria-live="polite" style={{ minWidth:76, textAlign:"center", fontSize:12, color:"#555" }}>Page {facultyPage + 1} of {facultyPageCount}</span>
            <button type="button" disabled={facultyPage >= facultyPageCount - 1} onClick={() => changeFacultyPage(facultyPage + 1)} style={{ padding:"7px 12px", border:"1px solid #ddd", borderRadius:7, background:facultyPage >= facultyPageCount - 1 ? "#f6f6f6" : P, color:facultyPage >= facultyPageCount - 1 ? "#aaa" : "#fff", cursor:facultyPage >= facultyPageCount - 1 ? "not-allowed" : "pointer" }}>Next</button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

/* ═══ SECURITY VIEW ═══ */
function SecurityView({ apiGet, apiPost, P, showMsg }) {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [facultyId, setFacultyId] = useState("");
  const [facStatus, setFacStatus] = useState(null);
  const [logScope, setLogScope] = useState("all");
  const [loading, setLoading] = useState(false);
  const [resetModal, setResetModal] = useState(null);   // {faculty_id, name, email}
  const [resetPass, setResetPass] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [ov, lg, fc] = await Promise.all([
        apiGet("/admin/security/overview"),
        apiGet("/admin/security/logs", { params: { scope: logScope, limit: 100 } }),
        apiGet("/admin/faculty"),
      ]);
      setOverview(ov.data); setLogs(lg.data); setFaculty(fc.data);
    } catch (e) { showMsg("error", "Failed to load security data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [logScope]); // eslint-disable-line

  const loadFacultyStatus = async (id) => {
    if (!id) return;
    try { const r = await apiGet(`/admin/security/faculty/${id}`); setFacStatus(r.data); }
    catch (e) { showMsg("error", e.response?.data?.detail || "Failed"); setFacStatus(null); }
  };

  const act = async (fn, msgText) => {
    setBusy(true);
    try { await fn(); showMsg("success", msgText); fetchAll(); loadFacultyStatus(facultyId); }
    catch (e) { showMsg("error", e.response?.data?.detail || "Action failed"); }
    finally { setBusy(false); }
  };

  const cardStyle = { background:"#fff", borderRadius:14, padding:"16px 18px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {loading && <div className="spinner" style={{ margin:"40px auto" }} />}
      {!loading && overview && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
          {[
            ["👥", "Total Faculty", overview.total_faculty, "#5B3DF5"],
            ["🔒", "Locked Accounts", overview.locked_accounts, overview.locked_accounts ? "#A32D2D" : "#5B3DF5"],
            ["🔄", "Force Reset", overview.force_reset, overview.force_reset ? "#E6A23C" : "#5B3DF5"],
            ["✉", "Unverified Email", overview.unverified_email, "#5B3DF5"],
            ["📱", "Unverified Mobile", overview.unverified_mobile, "#5B3DF5"],
            ["⚠️", "Failed Logins", overview.failed_logins, "#5B3DF5"],
          ].map(([icon,label,val,color]) => (
            <div key={label} style={{ ...cardStyle, display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:22 }}>{icon}</span>
              <div>
                <div style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
                <div style={{ fontSize:11, color:"#888" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Faculty status lookup */}
      <div style={cardStyle}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Faculty Account Status</div>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <select value={facultyId} onChange={e => { setFacultyId(e.target.value); setFacStatus(null); }}
            style={{ ...inp, width:260, padding:"9px 12px" }}>
            <option value="">— Select faculty —</option>
            {faculty.map(f => (
              <option key={f.faculty_id} value={f.faculty_id}>{f.name} ({f.email})</option>
            ))}
          </select>
          <button onClick={() => loadFacultyStatus(facultyId)} style={{ padding:"9px 18px", background:P, color:"#fff", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>Load Status</button>
        </div>

        {facStatus && (
          <div style={{ marginTop:14, border:"1px solid #eee", borderRadius:10, padding:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:8, marginBottom:12 }}>
              {[
                ["Email", facStatus.email, facStatus.email_verified],
                ["Mobile", facStatus.mobile_number || "Not set", facStatus.mobile_verified],
              ].map(([label,val,verified]) => (
                <div key={label}>
                  <div style={{ fontSize:10, color:"#888" }}>{label}</div>
                  <div style={{ fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                    {val}
                    {verified
                      ? <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#EAF3DE", color:"#27500A" }}>✅ Verified</span>
                      : <span style={{ fontSize:9, padding:"1px 6px", borderRadius:6, background:"#FDF3D7", color:"#8a6d1a" }}>Unverified</span>}
                  </div>
                </div>
              ))}
              <div>
                <div style={{ fontSize:10, color:"#888" }}>Account State</div>
                <div style={{ fontSize:12, fontWeight:600, color: facStatus.locked ? "#A32D2D" : "#1B7A45" }}>
                  {facStatus.locked ? `🔒 Locked` : "🟢 Active"}
                  {facStatus.force_password_reset && " · ⚠ Force Reset"}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:"#888" }}>Failed Attempts</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{facStatus.failed_attempts}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:"#888" }}>Last Password Change</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{facStatus.last_password_changed ? new Date(facStatus.last_password_changed).toLocaleString() : "Never"}</div>
              </div>
            </div>

            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <button disabled={busy || facStatus.email_verified} onClick={() => act(() => apiPost(`/admin/security/faculty/${facStatus.faculty_id}/verify-contact`, { field:"email" }), "Email verified")}
                style={{ padding:"7px 14px", background: facStatus.email_verified ? "#eee" : P, color: facStatus.email_verified ? "#999" : "#fff", borderRadius:7, fontSize:11, fontWeight:500, border:"none", cursor: facStatus.email_verified ? "default" : "pointer" }}>
                ✓ Verify Email
              </button>
              <button disabled={busy || !facStatus.mobile_number || facStatus.mobile_verified} onClick={() => act(() => apiPost(`/admin/security/faculty/${facStatus.faculty_id}/verify-contact`, { field:"mobile" }), "Mobile verified")}
                style={{ padding:"7px 14px", background: (facStatus.mobile_verified || !facStatus.mobile_number) ? "#eee" : P, color: (facStatus.mobile_verified || !facStatus.mobile_number) ? "#999" : "#fff", borderRadius:7, fontSize:11, fontWeight:500, border:"none", cursor: (facStatus.mobile_verified || !facStatus.mobile_number) ? "default" : "pointer" }}>
                ✓ Verify Mobile
              </button>
              <button disabled={busy} onClick={() => act(() => apiPost(`/admin/security/faculty/${facStatus.faculty_id}/force-reset`), "Force password reset requested")}
                style={{ padding:"7px 14px", background:"#fff", color:"#E6A23C", borderRadius:7, fontSize:11, fontWeight:500, border:"1px solid #E6A23C", cursor:"pointer" }}>
                ⚠ Force Password Reset
              </button>
              <button disabled={busy || !facStatus.locked} onClick={() => act(() => apiPost(`/admin/security/faculty/${facStatus.faculty_id}/unlock`), "Account unlocked")}
                style={{ padding:"7px 14px", background:"#fff", color:"#1B7A45", borderRadius:7, fontSize:11, fontWeight:500, border:"1px solid #1B7A45", cursor: facStatus.locked ? "pointer" : "default", opacity: facStatus.locked ? 1 : 0.5 }}>
                🔓 Unlock Account
              </button>
              <button onClick={() => setResetModal({ faculty_id: facStatus.faculty_id, name: facStatus.name, email: facStatus.email })} disabled={busy}
                style={{ padding:"7px 14px", background:P, color:"#fff", borderRadius:7, fontSize:11, fontWeight:500, border:"none", cursor:"pointer" }}>
                🔑 Reset Password
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit logs */}
      <div style={cardStyle}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:600 }}>Security Audit Log</span>
          <div style={{ display:"flex", gap:6 }}>
            {[["all","All"],["login","Logins"],["otp","OTP"],["password","Passwords"]].map(([key,label]) => (
              <button key={key} onClick={() => setLogScope(key)} style={{
                padding:"5px 12px", borderRadius:6, fontSize:11, fontWeight:500, cursor:"pointer",
                background: logScope===key ? P : "#fff", color: logScope===key ? "#fff" : "#666",
                border: logScope===key ? `1px solid ${P}` : "1px solid #ddd",
              }}>{label}</button>
            ))}
          </div>
        </div>
        {logs.length === 0 ? (
          <div style={{ fontSize:12, color:"#999", padding:"20px", textAlign:"center" }}>No security events recorded yet.</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#f8f8fb" }}>
                {["Time","Faculty","Action","Status","Method","Detail","Browser","IP"].map(h => (
                  <th key={h} style={{ padding:"8px 10px", fontSize:10, color:"#888", textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(r => (
                <tr key={r.log_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                  <td style={{ padding:"8px 10px", color:"#888", fontSize:11, whiteSpace:"nowrap" }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding:"8px 10px", fontWeight:500 }}>{r.faculty_name}</td>
                  <td style={{ padding:"8px 10px", fontWeight:500 }}>{r.action}</td>
                  <td style={{ padding:"8px 10px" }}>
                    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:6, background: r.status==="success" ? "#EAF3DE" : "#FCEBEB", color: r.status==="success" ? "#27500A" : "#791F1F", fontWeight:500 }}>{r.status}</span>
                  </td>
                  <td style={{ padding:"8px 10px", color:"#555" }}>{r.method || "—"}</td>
                  <td style={{ padding:"8px 10px", color:"#555" }}>{r.detail || "—"}</td>
                  <td style={{ padding:"8px 10px", color:"#888", fontSize:11 }}>{r.device} · {r.browser}</td>
                  <td style={{ padding:"8px 10px", color:"#888", fontSize:11 }}>{r.ip_address || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"24px 28px", width:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontSize:15, fontWeight:600 }}>Reset Password — {resetModal.name}</span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:20 }} onClick={() => setResetModal(null)}>×</span>
            </div>
            <div style={{ fontSize:11, color:"#888", marginBottom:12 }}>
              Set a new password for <b>{resetModal.email}</b>. The user will be logged out of all sessions.
            </div>
            <label style={{ fontSize:11, color:"#555", display:"block", marginBottom:4 }}>New password</label>
            <input type="text" value={resetPass} onChange={e => setResetPass(e.target.value)} style={{ ...inp, marginBottom:12 }} placeholder="At least 8 chars, upper, lower, number, special" />
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setResetModal(null)} style={{ flex:1, padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:13, background:"#fff", cursor:"pointer" }}>Cancel</button>
              <button disabled={busy || !resetPass} onClick={async () => {
                setBusy(true);
                try {
                  await apiPost(`/admin/security/faculty/${resetModal.faculty_id}/reset-password`, { new_password: resetPass });
                  showMsg("success", `Password reset for ${resetModal.name}`);
                  setResetModal(null); setResetPass(""); fetchAll(); loadFacultyStatus(facultyId);
                } catch (e) { showMsg("error", e.response?.data?.detail || "Reset failed"); }
                finally { setBusy(false); }
              }} style={{ flex:2, padding:10, background:P, color:"#fff", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer" }}>
                {busy ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const lbl = { fontSize:12, color:"#555", display:"block", marginBottom:5 };
const inp = { width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, boxSizing:"border-box" };
