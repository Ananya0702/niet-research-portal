import { useState, useEffect } from "react";
import API from "../services/api";
import * as XLSX from "xlsx";

const P = "#5B3DF5";
const SIDEBAR = "#1A1626";

const SIDEBAR_ACTIVE = "rgba(91,61,245,0.15)";

const SIDEBAR_ITEMS = [
  { section: "Navigation", items: [
    { key: "overview", icon: "📊", label: "Dashboard Overview" },
    { key: "schools",  icon: "🏛", label: "Schools" },
    { key: "depts",    icon: "🏫", label: "Departments" },
    { key: "faculty",  icon: "👥", label: "Faculty" },
  ]},
  { section: "Management", items: [
    { key: "add-school", icon: "➕", label: "Add School" },
    { key: "add-dept",   icon: "➕", label: "Add Department" },
    { key: "add-faculty",icon: "➕", label: "Add Faculty" },
  ]},
  { section: "System", items: [
    { key: "export",    icon: "📥", label: "Export Data" },
  ]},
];

const DESIGNATIONS = ["Professor","Associate Professor","Assistant Professor","Senior Lecturer","Lecturer","Dean R&D","HOD",];
const ROLES = ["faculty","hod","dean_rd"];
const EMPTY_FORM = { name:"", email:"", password:"", role:"faculty", designation:"Assistant Professor", dept_id:"", is_phd:false, joining_year:new Date().getFullYear(), google_scholar_id:"", };

export default function AdminPanel() {
  const [adminToken, setAdminToken] = useState(localStorage.getItem("admin_token")||"");
  const [loginForm, setLoginForm] = useState({ email:"", password:"" });
  const [loginError, setLoginError] = useState("");
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

  const [activeTab, setActiveTab] = useState("faculty");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showFacultyProfile, setShowFacultyProfile] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState(null);
  const [selectedFacultyData, setSelectedFacultyData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${adminToken}` } });
  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };
  const apiPost = (url, data) => API.post(url, data, authHeaders());
  const apiPut = (url, data) => API.put(url, data, authHeaders());
  const apiGet = (url) => API.get(url, authHeaders());
  const apiDel = (url) => API.delete(url, authHeaders());

  // ── Login ──
  const handleAdminLogin = async (e) => {
    e.preventDefault(); setLoginError("");
    try { const res = await API.post("/admin/login", loginForm); const t=res.data.access_token; localStorage.setItem("admin_token",t); setAdminToken(t); }
    catch { setLoginError("Invalid admin credentials"); }
  };

  // ── Data fetching ──
  const fetchFaculty = async () => { setLoading(true); try { const r=await apiGet("/admin/faculty"); setFaculty(r.data); } catch { setAdminToken(""); localStorage.removeItem("admin_token"); } finally { setLoading(false); } };
  const fetchDashboard = async () => { try { const r=await apiGet("/admin/dashboard"); setDashboard(r.data); } catch { /* ignore */ } };
  const fetchSchools = async () => { try { const r=await apiGet("/admin/schools"); setSchools(r.data); } catch { /* ignore */ } };
  const fetchDepts = async () => { try { const r=await apiGet("/admin/departments"); setDepts(r.data); } catch { /* ignore */ } };
  useEffect(() => { if (!adminToken) return; fetchFaculty(); fetchDashboard(); fetchSchools(); fetchDepts(); }, [adminToken]); // eslint-disable-line

  // ── Faculty CRUD ──
  const handleCreate = async (e) => { e.preventDefault(); setSaving(true); try { await apiPost("/admin/faculty", { ...form, dept_id:form.dept_id?parseInt(form.dept_id):null, joining_year:parseInt(form.joining_year), }); showMsg("success", `✅ ${form.name} created`); setModal(false); setForm(EMPTY_FORM); fetchFaculty(); } catch(err) { showMsg("error", err.response?.data?.detail||"Error"); } finally { setSaving(false); } };
  const handleUpdate = async (e) => { e.preventDefault(); setSaving(true); try { await apiPut(`/admin/faculty/${editForm.faculty_id}`, editForm); showMsg("success","✅ Updated"); setEditModal(false); fetchFaculty(); } catch { showMsg("error","Update failed"); } finally { setSaving(false); } };
  const handleDeactivate = async (id,name) => { if (!window.confirm(`Deactivate ${name}?`)) return; try { await apiDel(`/admin/faculty/${id}`); showMsg("success",`${name} deactivated`); fetchFaculty(); } catch { showMsg("error","Error"); } };
  const handleDelete = async (id,name) => { if (!window.confirm(`Permanently delete ${name}?`)) return; try { await apiDel(`/admin/faculty/${id}?hard=true`); showMsg("success",`${name} deleted`); fetchFaculty(); } catch { showMsg("error","Error"); } };

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
    <div style={{ minHeight:"100vh", background:`url('/admin-bg.jpg') center/cover no-repeat`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
      <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} />
      <div style={{ position:"relative", background:"#fff", borderRadius:16, padding:"40px 36px", width:380, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ display:"inline-flex", width:70, height:70, background:"rgba(91,61,245,0.08)", borderRadius:18, alignItems:"center", justifyContent:"center", padding:10, marginBottom:10, boxShadow:"0 0 20px rgba(91,61,245,0.12)" }}>
            <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
          </div>
          <div style={{ fontSize:13, color:"#888" }}>Admin Panel · Full System Management</div>
        </div>
        {loginError&&<div style={{ background:"#FCEBEB",color:"#791F1F",padding:"10px 14px",borderRadius:8,fontSize:13,marginBottom:16 }}>{loginError}</div>}
        <form onSubmit={handleAdminLogin}>
          <div style={{ marginBottom:14 }}><label style={lbl}>Admin Email</label><input type="email" required value={loginForm.email} onChange={e=>setLoginForm({...loginForm,email:e.target.value})} style={inp} placeholder="admin@niet.co.in" /></div>
          <div style={{ marginBottom:20 }}><label style={lbl}>Password</label><input type="password" required value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} style={inp} placeholder="••••••••" /></div>
          <button type="submit" style={{ width:"100%",padding:12,background:P,color:"#fff",borderRadius:8,fontSize:15,fontWeight:600,border:"none",cursor:"pointer" }}>Login as Admin</button>
        </form>
        <div style={{ marginTop:16,textAlign:"center" }}><a href="/" style={{ fontSize:12,color:"#888" }}>← Back to Portal Login</a></div>
      </div>
    </div>
  );

  // ── Main Dashboard ──
  return (
    <div style={{ minHeight:"100vh", background:"#f5f5f8", display:"flex" }}>

      {/* ═══ SIDEBAR ═══ */}
      <div style={{ width:sidebarOpen?240:0, overflow:"hidden", background:SIDEBAR, color:"#fff", display:"flex", flexDirection:"column", transition:"width 0.2s", flexShrink:0 }}>
        <div style={{ padding:"20px 18px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, background:P, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", padding:5, boxShadow:"0 0 14px rgba(91,61,245,0.4)" }}>
            <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain", filter:"brightness(0) invert(1)" }} />
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>NIET</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Admin Panel</div>
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
                    <span style={{ fontSize:16, width:20, textAlign:"center" }}>{item.icon}</span>
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
          {activeView==="overview" && dashboard && <OverviewView {...{dashboard,schools,depts,faculty,expandedSchools,setExpandedSchools,selSchoolId,setSelSchoolId,selSchool,selSchoolDepts,selSchoolFaculty,setSchoolModal,setDeptModal,handleDeleteSchool,handleDeleteDept,setEditModal,setEditForm,activeTab,setActiveTab,loading,filteredFaculty,roleFilter,setRoleFilter,deptFilter,setDeptFilter,setModal,handleDeactivate,handleDelete,P,showMsg,viewFacultyProfile}} />}

          {/* ═══ SCHOOLS ═══ */}
          {activeView==="schools" && <SchoolsView {...{schools,depts,faculty,expandedSchools,setExpandedSchools,selSchoolId,setSelSchoolId,setSchoolModal,setDeptModal,handleDeleteSchool,handleDeleteDept,setEditModal,setEditForm,P}} />}

          {/* ═══ DEPARTMENTS ═══ */}
          {activeView==="depts" && <DeptsView {...{depts,schools,faculty,setDeptModal,setEditModal,setEditForm,handleDeleteDept,P}} />}

          {/* ═══ FACULTY ═══ */}
          {activeView==="faculty" && <FacultyView {...{faculty,loading,filteredFaculty,roleFilter,setRoleFilter,deptFilter,setDeptFilter,depts,setModal,setEditModal,setEditForm,handleDeactivate,handleDelete,P,viewFacultyProfile}} />}

          {/* ═══ EXPORT ═══ */}
          {activeView==="export" && <ExportView {...{faculty,schools,depts,P,showMsg,setActiveView}} />}

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
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
          <div style={{ background:"#fff",borderRadius:14,padding:"24px 28px",width:400 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <span style={{ fontSize:16,fontWeight:600 }}>Create New School</span>
              <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setSchoolModal(false)}>×</span>
            </div>
            <form onSubmit={handleCreateSchool}>
              <div style={{ marginBottom:16 }}>
                <label style={lbl}>School Name *</label>
                <input required value={schoolForm.school_name} onChange={e=>setSchoolForm({...schoolForm,school_name:e.target.value})} style={inp} placeholder="e.g. School of CS & IT (SCSIT)" />
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button type="button" onClick={()=>setSchoolModal(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Creating...":"Create School"}</button>
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
            <div><label style={lbl}>Role *</label><select required value={form.role} onChange={e=>setForm({...form,role:e.target.value})} style={inp}>{ROLES.map(r=><option key={r} value={r}>{r==="dean_rd"?"Dean R&D":r==="hod"?"HOD":"Faculty"}</option>)}</select></div>
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
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
      <div style={{ background:"#fff",borderRadius:14,padding:"24px 28px",width:480 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontSize:16,fontWeight:600 }}>Edit — {editForm.name||editForm.dept_name}</span>
          <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setEditModal(false)}>×</span>
        </div>
        <form onSubmit={handleUpdate}>
          {editForm.name!==undefined ? (
            <>
              <div style={{ marginBottom:14 }}><label style={lbl}>Full Name</label><input value={editForm.name||""} onChange={e=>setEditForm({...editForm,name:e.target.value})} style={inp} /></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14 }}>
                <div><label style={lbl}>Role</label><select value={editForm.role||"faculty"} onChange={e=>setEditForm({...editForm,role:e.target.value})} style={inp}>{ROLES.map(r=><option key={r} value={r}>{r==="dean_rd"?"Dean R&D":r==="hod"?"HOD":"Faculty"}</option>)}</select></div>
                <div><label style={lbl}>Designation</label><select value={editForm.designation||""} onChange={e=>setEditForm({...editForm,designation:e.target.value})} style={inp}>{DESIGNATIONS.map(d=><option key={d}>{d}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Department</label><select value={editForm.dept_id||""} onChange={e=>setEditForm({...editForm,dept_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">No Department</option>{depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}</select></div>
              <div style={{ marginBottom:14 }}><label style={lbl}>Google Scholar ID</label><input value={editForm.google_scholar_id||""} onChange={e=>setEditForm({...editForm,google_scholar_id:e.target.value})} style={inp} placeholder="e.g. 8XXy5vkAAAAJ" /></div>
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
          ["⭐","Impact Factor",k.avg_impact_factor||"0.0","#FCEBEB","#A32D2D"],
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
              ["Avg Impact Factor",k.avg_impact_factor||"0.0","#085041"],
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

function OverviewView({ dashboard, schools, depts, faculty, expandedSchools, setExpandedSchools, selSchoolId, setSelSchoolId, selSchool, selSchoolDepts, selSchoolFaculty, setSchoolModal, setDeptModal, handleDeleteSchool, handleDeleteDept, setEditModal, setEditForm, activeTab, setActiveTab, loading, filteredFaculty, roleFilter, setRoleFilter, deptFilter, setDeptFilter, setModal, handleDeactivate, handleDelete, P, viewFacultyProfile }) {
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

      <div style={{ display:"flex", gap:14, marginBottom:18 }}>
        <div style={{ width:320, background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16, flexShrink:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>Organization Structure</span>
            <span onClick={()=>setSchoolModal(true)} style={{ fontSize:11, color:P, cursor:"pointer", fontWeight:500 }}>+ Add School</span>
          </div>
          <div style={{ fontSize:12, fontWeight:500, color:P, marginBottom:8 }}>🏛 University</div>
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
                    <span style={{ fontSize:10, color:"#888", marginLeft:"auto" }}>{sDepts.length}</span>
                  </div>
                  {isExpanded && sDepts.map(d=>{
                    const dFac = faculty.filter(f=>f.dept_id===d.dept_id);
                    return (
                      <div key={d.dept_id} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 8px 4px 28px", fontSize:11, color:"#666" }}>
                        <span>📁</span>
                        <span>{d.dept_code}</span>
                        <span style={{ fontSize:10, color:"#aaa", marginLeft:"auto" }}>{dFac.length}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <button onClick={()=>setSchoolModal(true)} style={{ width:"100%", marginTop:12, padding:"8px", background:P, color:"#fff", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add School</button>
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
                        <td style={{ padding:"10px 12px", fontSize:12, color:P, cursor:hod?"pointer":"default" }} onClick={()=>hod&&viewFacultyProfile(hod.faculty_id)}>
                          {hod ? <span style={{ borderBottom:"1px dashed rgba(91,61,245,0.3)" }}>{hod.name}</span> : "—"}
                        </td>
                        <td style={{ padding:"10px 12px", fontSize:12 }}>{dFac.length}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ display:"flex", gap:4 }}>
                            <span style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #0C447C", color:"#0C447C", fontSize:11, cursor:"pointer" }}>👁</span>
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
            <div style={{ padding:40, textAlign:"center", color:"#aaa", fontSize:13 }}>Select a school from the organization tree</div>
          )}
        </div>
      </div>

      <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16 }}>
        <div style={{ display:"flex", gap:0, borderBottom:"1px solid #eee", marginBottom:14 }}>
          {[
            { key:"faculty", label:"Faculty Management" },
            { key:"deans",   label:"Deans & HODs" },
            { key:"users",   label:"Users" },
          ].map(t=>(
            <div key={t.key} onClick={()=>setActiveTab(t.key)} style={{ padding:"10px 18px", fontSize:12, fontWeight:500, cursor:"pointer", color:activeTab===t.key?P:"#888", borderBottom:activeTab===t.key?"2px solid "+P:"2px solid transparent", transition:"all 0.15s" }}>{t.label}</div>
          ))}
        </div>

        {activeTab==="faculty" && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center" }}>
              <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
                <option value="all">All Roles</option>
                <option value="faculty">Faculty</option>
                <option value="hod">HOD</option>
                <option value="dean_rd">Dean</option>
              </select>
              <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
                <option value="all">All Departments</option>
                {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
              </select>
              <button onClick={()=>{setModal(true);}} style={{ marginLeft:"auto", background:P,color:"#fff",padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>+ Add Faculty</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8f8fb" }}>
                    {["Name","Email","Role","Department","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{padding:30,textAlign:"center"}}>Loading...</td></tr>
                  : filteredFaculty.map(f=>(
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
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid "+P,color:P,fontSize:11,cursor:"pointer" }}>✏</span>
                          {f.is_active
                            ? <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #633806",color:"#633806",fontSize:11,cursor:"pointer" }}>⏸</span>
                            : <span onClick={()=>handleDelete(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,cursor:"pointer" }}>🗑</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab==="deans" && (
          <div>
            <div style={{ display:"flex", gap:10, marginBottom:12, alignItems:"center" }}>
              <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
                <option value="all">All Departments</option>
                {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
              </select>
              <button onClick={()=>{setModal(true);}} style={{ marginLeft:"auto", background:P,color:"#fff",padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer" }}>+ Add HOD</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8f8fb" }}>
                    {["Name","Email","Role","Department","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {faculty.filter(f=>f.role==="hod"||f.role==="dean_rd").filter(f=>deptFilter==="all"||f.dept_id===parseInt(deptFilter)).map(f=>(
                    <tr key={f.faculty_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                      <td style={{ padding:"8px 12px", fontWeight:500, cursor:"pointer" }} onClick={()=>viewFacultyProfile(f.faculty_id)}>
                        <span style={{ color:P, borderBottom:"1px dashed rgba(91,61,245,0.3)" }}>{f.name}</span>
                      </td>
                      <td style={{ padding:"8px 12px", color:"#555" }}>{f.email}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, fontWeight:500,
                          background:f.role==="dean_rd"?"#E1F5EE":"#E6F1FB",
                          color:f.role==="dean_rd"?"#085041":"#0C447C",
                        }}>{f.role==="dean_rd"?"Dean":"HOD"}</span>
                      </td>
                      <td style={{ padding:"8px 12px", color:"#555" }}>{f.dept_name||"All (Dean)"}</td>
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid "+P,color:P,fontSize:11,cursor:"pointer" }}>✏</span>
                          <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #633806",color:"#633806",fontSize:11,cursor:"pointer" }}>⏸</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab==="users" && (
          <div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:"#f8f8fb" }}>
                    {["Name","Email","Role","Department","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {faculty.filter(f=>deptFilter==="all"||f.dept_id===parseInt(deptFilter)).map(f=>(
                    <tr key={f.faculty_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
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
                      <td style={{ padding:"8px 12px" }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                      </td>
                      <td style={{ padding:"8px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid "+P,color:P,fontSize:11,cursor:"pointer" }}>✏</span>
                          {f.is_active
                            ? <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #633806",color:"#633806",fontSize:11,cursor:"pointer" }}>⏸</span>
                            : <span onClick={()=>handleDelete(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,cursor:"pointer" }}>🗑</span>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SchoolsView({ schools, depts, faculty, expandedSchools, setExpandedSchools, selSchoolId, setSelSchoolId, setSchoolModal, setDeptModal, handleDeleteSchool, handleDeleteDept, setEditModal, setEditForm, P }) {
  const selSchool = schools.find(s=>s.school_id===selSchoolId)||null;
  const selSchoolDepts = selSchool ? depts.filter(d=>d.school_id===selSchool.school_id) : [];
  const selSchoolFaculty = selSchool ? faculty.filter(f=>selSchoolDepts.some(d=>d.dept_id===f.dept_id)) : [];
  return (
    <div style={{ display:"flex", gap:14 }}>
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
          <div style={{ padding:40, textAlign:"center", color:"#aaa", fontSize:13 }}>Select a school from the tree to view details</div>
        )}
      </div>
    </div>
  );
}

function DeptsView({ depts, schools, faculty, setDeptModal, setEditModal, setEditForm, handleDeleteDept, P }) {
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

function FacultyView({ faculty, loading, filteredFaculty, roleFilter, setRoleFilter, deptFilter, setDeptFilter, depts, setModal, setEditModal, setEditForm, handleDeactivate, handleDelete, P, viewFacultyProfile }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", border:"1px solid #f0f0f5", padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:600, color:"#1a1a1a" }}>Faculty Management</div>
          <div style={{ fontSize:11, color:"#888", marginTop:2 }}>Total: {faculty.length} faculty members</div>
        </div>
        <button onClick={()=>{setModal(true);}} style={{ background:P, color:"#fff", padding:"8px 20px", borderRadius:8, fontSize:12, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add Faculty</button>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:14 }}>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
          <option value="all">All Roles</option>
          <option value="faculty">Faculty</option>
          <option value="hod">HOD</option>
          <option value="dean_rd">Dean</option>
        </select>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{ padding:"6px 10px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none" }}>
          <option value="all">All Departments</option>
          {depts.map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
        </select>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#f8f8fb" }}>
              {["Name","Email","Role","Department","Status","Actions"].map(h=><th key={h} style={{ padding:"8px 12px",fontSize:11,color:"#888",textAlign:"left",borderBottom:"1px solid #eee",fontWeight:500 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{padding:30,textAlign:"center"}}>Loading...</td></tr>
            : filteredFaculty.map(f=>(
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
                <td style={{ padding:"8px 12px" }}>
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:f.is_active?"#EAF3DE":"#FCEBEB", color:f.is_active?"#27500A":"#791F1F", fontWeight:500 }}>{f.is_active?"Active":"Inactive"}</span>
                </td>
                <td style={{ padding:"8px 12px" }}>
                  <div style={{ display:"flex", gap:4 }}>
                    <span onClick={()=>{setEditForm({...f});setEditModal(true);}} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid "+P,color:P,fontSize:11,cursor:"pointer" }}>✏</span>
                    {f.is_active
                      ? <span onClick={()=>handleDeactivate(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #633806",color:"#633806",fontSize:11,cursor:"pointer" }}>⏸</span>
                      : <span onClick={()=>handleDelete(f.faculty_id,f.name)} style={{ padding:"3px 8px",borderRadius:5,border:"1px solid #A32D2D",color:"#A32D2D",fontSize:11,cursor:"pointer" }}>🗑</span>
                    }
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

const lbl = { fontSize:12, color:"#555", display:"block", marginBottom:5 };
const inp = { width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, boxSizing:"border-box" };
