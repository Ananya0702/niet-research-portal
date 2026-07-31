import { useEffect, useState, useMemo } from "react";
import Layout from "../components/Layout";
import API, { BASE_URL } from "../services/api";

const P = "#534AB7";
const CATEGORY_COLORS = {
  "Research Funding":"#085041","Conference":"#0C447C","Journal":"#534AB7",
  "Patent / IPR":"#633806","Workshop":"#A32D2D","Seminar":"#1A6B4A",
  "FDP":"#5B3DF5","Research Grant":"#27500A","Faculty Meeting":"#791F1F",
  "Administrative Notice":"#333","Academic Notice":"#555","Student Research":"#0C447C",
  "Deadline":"#A32D2D","Awards & Achievements":"#633806","General Announcement":"#666",
};
const PRIORITY_LABELS = { critical:"Critical", high:"High", medium:"Medium", low:"Low" };
const PRIORITY_COLORS = { critical:"#A32D2D", high:"#D97706", medium:"#0C447C", low:"#22A853" };
const STATUS_COLORS = { draft:"#888", scheduled:"#D97706", published:"#22A853", expired:"#A32D2D", archived:"#999" };
const CATEGORIES = [
  "Research Funding","Conference","Journal","Patent / IPR","Workshop","Seminar",
  "FDP","Research Grant","Faculty Meeting","Administrative Notice","Academic Notice",
  "Student Research","Deadline","Awards & Achievements","General Announcement",
];
const PRIORITIES = ["critical","high","medium","low"];
const TARGET_TYPES = ["everyone","school","department","role"];

const EMPTY_FORM = {
  title:"", summary:"", description:"", category:"General Announcement", priority:"medium",
  status:"published", pinned:false, target_type:"everyone", target_school_id:null,
  target_dept_id:null, target_role:"all", publish_at:"", expires_at:"",
  registration_link:"", meeting_link:"", google_form_link:"", conference_url:"",
};

export default function Announcements() {
  const role = localStorage.getItem("role") || "faculty";
  const isAdmin = localStorage.getItem("admin_token") ? true : false;
  const canCreate = role === "dean_rd" || role === "hod" || isAdmin;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [existingAtts, setExistingAtts] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ category:"", priority:"", status:"" });
  const [schools, setSchools] = useState([]);
  const [allDepts, setAllDepts] = useState([]);

  const fetchItems = async () => {
    try {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (filters.category) p.set("category", filters.category);
      if (filters.priority) p.set("priority", filters.priority);
      if (filters.status) p.set("status", filters.status);
      const res = await API.get(`/announcements/?${p.toString()}`);
      setItems(res.data);
    } catch {} finally { setLoading(false); }
  };
  const fetchStats = async () => { try { const r=await API.get("/announcements/stats"); setStats(r.data); } catch {} };
  const fetchSchools = async () => { try { const r=await API.get("/publications/pub/schools"); setSchools(r.data); } catch {} };
  const fetchDepts = async () => { try { const r=await API.get("/publications/pub-depts"); setAllDepts(r.data); } catch {} };

  useEffect(() => { fetchItems(); fetchStats(); fetchSchools(); fetchDepts(); }, []);

  const deptOptions = useMemo(() => {
    if (!form.target_school_id) return [];
    return allDepts.filter(d => d.school_id === form.target_school_id);
  }, [form.target_school_id, allDepts]);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (payload.publish_at) { const d=new Date(payload.publish_at); payload.publish_at = d.toISOString(); }
      if (payload.expires_at) { const d=new Date(payload.expires_at); payload.expires_at = d.toISOString(); }
      let annId = editing?.announcement_id;
      if (editing) {
        await API.put(`/announcements/${editing.announcement_id}`, payload);
      } else {
        const created = await API.post("/announcements/", payload);
        annId = created.data.announcement_id;
      }
      if (newFiles.length > 0) {
        setUploading(true);
        const fd = new FormData();
        newFiles.forEach(f => fd.append("files", f));
        await API.post(`/announcements/${annId}/attachments`, fd);
      }
      setShowForm(false); setForm(EMPTY_FORM); setEditing(null);
      setNewFiles([]); setExistingAtts([]);
      fetchItems(); fetchStats();
    } catch (err) { alert(err.response?.data?.detail || "Error saving announcement"); }
    finally { setSaving(false); setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await API.delete(`/announcements/${id}`);
    fetchItems(); fetchStats();
    if (detail?.announcement_id === id) setDetail(null);
  };

  const handleDuplicate = async (a) => {
    const { announcement_id, created_by, created_at, updated_at, read_count, attachment_count, ...rest } = a;
    setForm({ ...EMPTY_FORM, ...rest, title: rest.title + " (Copy)", status:"draft" });
    setEditing(null); setShowForm(true);
  };

  const togglePin = async (a) => {
    await API.put(`/announcements/${a.announcement_id}`, { pinned: !a.pinned });
    fetchItems();
    if (detail?.announcement_id === a.announcement_id) setDetail({...detail, pinned: !a.pinned});
  };

  const changeStatus = async (a, status) => {
    await API.put(`/announcements/${a.announcement_id}`, { status });
    fetchItems(); fetchStats();
    if (detail?.announcement_id === a.announcement_id) setDetail({...detail, status});
  };

  const markRead = async (id) => {
    try { await API.post(`/announcements/${id}/read`); } catch {}
  };

  const openDetail = async (a) => {
    setDetail(a);
    if (!a.read_count || a.read_count === 0) markRead(a.announcement_id);
  };

  const openEdit = (a) => {
    const formData = {
      title: a.title||"", summary: a.summary||"", description: a.description||"",
      category: a.category||"General Announcement", priority: a.priority||"medium",
      status: a.status||"published", pinned: a.pinned||false,
      target_type: a.target_type||"everyone", target_school_id: a.target_school_id||null,
      target_dept_id: a.target_dept_id||null, target_role: a.target_role||"all",
      publish_at: a.publish_at ? a.publish_at.slice(0,16) : "",
      expires_at: a.expires_at ? a.expires_at.slice(0,16) : "",
      registration_link: a.registration_link||"", meeting_link: a.meeting_link||"",
      google_form_link: a.google_form_link||"", conference_url: a.conference_url||"",
    };
    setEditing(a); setForm(formData); setShowForm(true);
    setNewFiles([]);
    setExistingAtts(a.attachments || []);
  };

  const handleRemoveExisting = async (attId) => {
    try {
      await API.delete(`/announcements/attachments/${attId}`);
      setExistingAtts(prev => prev.filter(x => x.attachment_id !== attId));
      setDetail(prev => prev ? {...prev, attachments: (prev.attachments||[]).filter(x=>x.attachment_id!==attId), attachment_count: Math.max(0,(prev.attachment_count||0)-1)} : prev);
      fetchItems();
    } catch (err) { alert(err.response?.data?.detail || "Failed to delete attachment"); }
  };

  const Badge = ({ text, color, bg }) => (
    <span style={{ display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:500,
      padding:"2px 7px",borderRadius:6,color:color||"#fff",background:bg||color||"#888" }}>{text}</span>
  );

  const formatBytes = (b) => { if(!b) return "0 B"; if(b<1024) return `${b} B`; if(b<1024*1024) return `${(b/1024).toFixed(1)} KB`; return `${(b/1024/1024).toFixed(1)} MB`; };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"}) : "—";
  const formatDateTime = (d) => d ? new Date(d).toLocaleString("en-IN", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
  const timeAgo = (d) => { if(!d) return ""; const s=Math.floor((Date.now()-new Date(d).getTime())/1000); if(s<60) return "just now"; const m=Math.floor(s/60); if(m<60) return `${m}m ago`; const h=Math.floor(m/60); if(h<24) return `${h}h ago`; const dd=Math.floor(h/24); return `${dd}d ago`; };
  const roleLabel = (r) => r === "dean_rd" ? "Dean" : r === "hod" ? "HOD" : "Faculty";

  const pinnedItems = items.filter(i => i.pinned);
  const normalItems = items.filter(i => !i.pinned);

  return (
    <Layout>
      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #eee", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600 }}>📢 Announcements</div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>University communication & notification center</div>
        </div>
        {canCreate && (
          <button onClick={()=>{setEditing(null);setForm(EMPTY_FORM);setShowForm(true);setNewFiles([]);setExistingAtts([]);}} style={{ background:P,color:"#fff",padding:"9px 18px",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>
            + New Announcement
          </button>
        )}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>
        {/* KPI Cards */}
        {stats && (
          <div style={{ display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14 }}>
            {[
              ["📢","Total",stats.total,"#EEEDFE",P],
              ["✅","Published",stats.published,"#EAF3DE","#27500A"],
              ["📝","Drafts",stats.drafts,"#f5f5f5","#888"],
              ["⏰","Scheduled",stats.scheduled,"#FAEEDA","#633806"],
              ["⌛","Expired",stats.expired,"#FCEBEB","#A32D2D"],
              ["🔴","High Priority",stats.high_priority,"#FCEBEB","#A32D2D"],
            ].map(([icon,l,v,bg,c])=>(
              <div key={l} style={{ background:"#fff",borderRadius:12,padding:"10px 12px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",border:"1px solid #f0f0f5" }}>
                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <div style={{ width:30,height:30,borderRadius:8,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize:10,color:"#888" }}>{l}</div>
                    <div style={{ fontSize:17,fontWeight:700,color:c }}>{v}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center" }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search announcements..." style={{ padding:"7px 12px",border:"1px solid #e0e0e8",borderRadius:8,fontSize:12,outline:"none",background:"#f8f8fb",width:220 }} />
          <select value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})} style={{ padding:"6px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:11,outline:"none" }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.priority} onChange={e=>setFilters({...filters,priority:e.target.value})} style={{ padding:"6px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:11,outline:"none" }}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p=><option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
          <select value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})} style={{ padding:"6px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:11,outline:"none" }}>
            <option value="">All Status</option>
            {["draft","scheduled","published","expired","archived"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <button onClick={()=>{setSearch("");setFilters({category:"",priority:"",status:""});}} style={{ padding:"6px 12px",border:"1px solid #ddd",borderRadius:8,fontSize:11,background:"#fff",cursor:"pointer" }}>Clear</button>
        </div>

        {/* Loading / Content */}
        {loading ? <div className="spinner" />
        : items.length === 0 ? (
          <div style={{ textAlign:"center",padding:60,color:"#aaa",background:"#fff",borderRadius:12,border:"1px solid #eee" }}>
            <div style={{ fontSize:36,marginBottom:8 }}>📢</div>
            <div style={{ fontSize:14,fontWeight:500 }}>No announcements yet</div>
            <div style={{ fontSize:11,marginTop:4,color:"#aaa" }}>{canCreate ? "Click '+ New Announcement' to create one" : "Check back later for updates"}</div>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {/* Pinned items */}
            {pinnedItems.map(a => <AnnouncementCard key={a.announcement_id} a={a} role={role} canCreate={canCreate} onOpen={openDetail} onEdit={openEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} onTogglePin={togglePin} onChangeStatus={changeStatus} formatDate={formatDate} timeAgo={timeAgo} Badge={Badge} P={P} />)}
            <hr style={{ border:"none",borderTop:"1px solid #eee",margin:"4px 0" }} />
            {normalItems.map(a => <AnnouncementCard key={a.announcement_id} a={a} role={role} canCreate={canCreate} onOpen={openDetail} onEdit={openEdit} onDelete={handleDelete} onDuplicate={handleDuplicate} onTogglePin={togglePin} onChangeStatus={changeStatus} formatDate={formatDate} timeAgo={timeAgo} Badge={Badge} P={P} />)}
          </div>
        )}
      </div>

      {/* Creation/Edit Drawer */}
      {showForm && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",justifyContent:"flex-end" }} onClick={()=>setShowForm(false)}>
          <div style={{ width:560,background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 30px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 22px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ fontSize:16,fontWeight:600 }}>{editing ? "Edit Announcement" : "New Announcement"}</span>
              <span style={{ cursor:"pointer",color:"#888",fontSize:22 }} onClick={()=>setShowForm(false)}>×</span>
            </div>
            <form onSubmit={handleSubmit} style={{ padding:"18px 22px" }}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 1 – Basic Information</div>
                <div style={{ marginBottom:10 }}><label style={lbl}>Title *</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} style={inp} placeholder="Announcement title" /></div>
                <div style={{ marginBottom:10 }}><label style={lbl}>Short Summary</label><input value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} style={inp} placeholder="Brief summary (appears in cards)" /></div>
                <div style={{ marginBottom:10 }}><label style={lbl}>Detailed Description *</label><textarea required rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} style={{...inp,fontFamily:"inherit",resize:"vertical",fontSize:12}} placeholder="Full announcement content. Supports rich text&#10;&#10;Use bullet points, numbered lists, links, etc." /></div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 2 – Category & Priority</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  <div><label style={lbl}>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} style={inp}>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select></div>
                  <div><label style={lbl}>Priority</label>
                    <div style={{ display:"flex",gap:4 }}>
                      {PRIORITIES.map(p=><div key={p} onClick={()=>setForm({...form,priority:p})} style={{ flex:1,padding:"6px 4px",borderRadius:6,border:"1px solid",borderColor:form.priority===p?PRIORITY_COLORS[p]:"#e0e0e8",background:form.priority===p?PRIORITY_COLORS[p]:"#f8f8fb",color:form.priority===p?"#fff":"#333",textAlign:"center",fontSize:9,cursor:"pointer",fontWeight:500 }}>{PRIORITY_LABELS[p]}</div>)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 3 – Target Audience</div>
                <div style={{ marginBottom:8 }}><label style={lbl}>Visible To</label>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {TARGET_TYPES.map(t=><div key={t} onClick={()=>setForm({...form,target_type:t,target_school_id:null,target_dept_id:null,target_role:"all"})} style={{ padding:"5px 10px",borderRadius:6,border:"1px solid",borderColor:form.target_type===t?P:"#e0e0e8",background:form.target_type===t?P:"#f8f8fb",color:form.target_type===t?"#fff":"#333",fontSize:10,cursor:"pointer",fontWeight:500 }}>{t==="everyone"?"Everyone":t==="school"?"Specific School":t==="department"?"Specific Department":"By Role"}</div>)}
                  </div>
                </div>
                {form.target_type === "school" && (
                  <div><label style={lbl}>School</label><select value={form.target_school_id||""} onChange={e=>setForm({...form,target_school_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">Select School</option>{(schools||[]).map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
                )}
                {form.target_type === "department" && (
                  <>
                    <div style={{ marginBottom:8 }}><label style={lbl}>School</label><select value={form.target_school_id||""} onChange={e=>{setForm({...form,target_school_id:e.target.value?parseInt(e.target.value):null,target_dept_id:null})}} style={inp}><option value="">Select School</option>{(schools||[]).map(s=><option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}</select></div>
                    {form.target_school_id && (
                      <div><label style={lbl}>Department</label><select value={form.target_dept_id||""} onChange={e=>setForm({...form,target_dept_id:e.target.value?parseInt(e.target.value):null})} style={inp}><option value="">Select Department</option>{allDepts.filter(d=>d.school_id===form.target_school_id).map(d=><option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}</select></div>
                    )}
                  </>
                )}
                {form.target_type === "role" && (
                  <div><label style={lbl}>Role</label><select value={form.target_role} onChange={e=>setForm({...form,target_role:e.target.value})} style={inp}><option value="all">All Roles</option><option value="dean_rd">Dean</option><option value="hod">HOD</option><option value="faculty">Faculty</option></select></div>
                )}
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 4 – Publish & Schedule</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  <div><label style={lbl}>Schedule Publish</label><input type="datetime-local" value={form.publish_at} onChange={e=>setForm({...form,publish_at:e.target.value})} style={inp} /></div>
                  <div><label style={lbl}>Expiry Date</label><input type="datetime-local" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value})} style={inp} /></div>
                </div>
                <div style={{ marginTop:8,display:"flex",gap:4 }}>
                  {["draft","published","scheduled"].map(s=>(
                    <div key={s} onClick={()=>setForm({...form,status:s})} style={{ flex:1,padding:"6px 8px",borderRadius:6,border:"1px solid",borderColor:form.status===s?STATUS_COLORS[s]:"#e0e0e8",background:form.status===s?STATUS_COLORS[s]:"#f8f8fb",color:form.status===s?"#fff":"#333",textAlign:"center",fontSize:10,cursor:"pointer",fontWeight:500 }}>{s==="draft"?"Save as Draft":s==="published"?"Publish Now":"Schedule"}</div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 5 – External Links (Optional)</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                  <div><label style={lbl}>Registration Link</label><input value={form.registration_link} onChange={e=>setForm({...form,registration_link:e.target.value})} style={inp} placeholder="https://" /></div>
                  <div><label style={lbl}>Meeting Link</label><input value={form.meeting_link} onChange={e=>setForm({...form,meeting_link:e.target.value})} style={inp} placeholder="https://" /></div>
                  <div><label style={lbl}>Google Form</label><input value={form.google_form_link} onChange={e=>setForm({...form,google_form_link:e.target.value})} style={inp} placeholder="https://" /></div>
                  <div><label style={lbl}>Conference URL</label><input value={form.conference_url} onChange={e=>setForm({...form,conference_url:e.target.value})} style={inp} placeholder="https://" /></div>
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:8,letterSpacing:0.5 }}>Section 6 – File Attachments (Optional)</div>
                <label style={{ ...lbl, display:"flex", alignItems:"center", gap:8, padding:"10px 12px", border:"1px dashed #b5b5d6", borderRadius:8, cursor:"pointer", background:"#f8f8fc", color:"#555" }}>
                  📎 <span style={{ fontSize:12 }}>Click to attach files (PDF, DOC, XLS, PPT, images, zip, etc. — max 25 MB each)</span>
                  <input type="file" multiple style={{ display:"none" }} onChange={e=>setNewFiles([...newFiles, ...Array.from(e.target.files)])} />
                </label>

                {existingAtts.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:10,color:"#888",marginBottom:4 }}>Already attached</div>
                    {existingAtts.map(t=>(
                      <div key={t.attachment_id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:"#f5f5f8",borderRadius:6,marginBottom:4 }}>
                        <span style={{ fontSize:11,color:"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📄 {t.filename}</span>
                        <span onClick={()=>handleRemoveExisting(t.attachment_id)} style={{ fontSize:11,color:"#A32D2D",cursor:"pointer",flexShrink:0 }}>Remove</span>
                      </div>
                    ))}
                  </div>
                )}

                {newFiles.length > 0 && (
                  <div style={{ marginTop:8 }}>
                    <div style={{ fontSize:10,color:"#888",marginBottom:4 }}>New files ({newFiles.length})</div>
                    {newFiles.map((f,i)=>(
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 8px",background:"#EEEDFE",borderRadius:6,marginBottom:4 }}>
                        <span style={{ fontSize:11,color:"#444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📄 {f.name} <span style={{color:"#888"}}>({(f.size/1024).toFixed(0)} KB)</span></span>
                        <span onClick={()=>setNewFiles(newFiles.filter((_,j)=>j!==i))} style={{ fontSize:11,color:"#A32D2D",cursor:"pointer",flexShrink:0 }}>Remove</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display:"flex",gap:10,padding:"16px 0",borderTop:"1px solid #eee" }}>
                <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1,padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2,padding:10,background:P,color:"#fff",borderRadius:8,fontSize:13,fontWeight:500,border:"none",cursor:"pointer" }}>{saving?"Saving...":"Save Announcement"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Overlay */}
      {detail && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",justifyContent:"flex-end" }} onClick={()=>setDetail(null)}>
          <div style={{ width:580,background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 30px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
            <div style={{ padding:"18px 22px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
              <div style={{ flex:1,marginRight:14 }}>
                <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6,flexWrap:"wrap" }}>
                  <Badge text={detail.category} color="#fff" bg={CATEGORY_COLORS[detail.category]||"#888"} />
                  <Badge text={PRIORITY_LABELS[detail.priority]} color="#fff" bg={PRIORITY_COLORS[detail.priority]} />
                  <Badge text={detail.status.charAt(0).toUpperCase()+detail.status.slice(1)} color="#fff" bg={STATUS_COLORS[detail.status]} />
                  {detail.pinned && <Badge text="📌 Pinned" color="#633806" bg="#FAEEDA" />}
                </div>
                <div style={{ fontSize:16,fontWeight:600,color:"#1a1a1a",lineHeight:1.4 }}>{detail.title}</div>
              </div>
              <span style={{ cursor:"pointer",color:"#888",fontSize:22,flexShrink:0 }} onClick={()=>setDetail(null)}>×</span>
            </div>
            <div style={{ padding:"18px 22px" }}>
              {/* Meta */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,background:"#f8f8fb",borderRadius:10,padding:12 }}>
                {[
                  ["Posted By",detail.created_by?.name||"Unknown"],
                  ["Date",formatDateTime(detail.created_at)],
                  ["Updated",formatDateTime(detail.updated_at)],
                  ["Expires",detail.expires_at?formatDateTime(detail.expires_at):"Never"],
                  ["Target",detail.target_type==="everyone"?"Everyone":detail.target_type==="school"?"Specific School":detail.target_type==="department"?"Specific Department":"By Role"],
                  ["Reads",`${detail.read_count||0} views`],
                ].map(([l,v])=>(
                  <div key={l}><span style={{ fontSize:10,color:"#888" }}>{l}</span><div style={{ fontSize:12,color:"#333",fontWeight:500 }}>{v}</div></div>
                ))}
              </div>

              {/* Summary */}
              {detail.summary && <div style={{ marginBottom:14,padding:12,background:"#EEEDFE",borderRadius:8,borderLeft:"3px solid "+P,fontSize:12,color:"#333",lineHeight:1.5 }}>{detail.summary}</div>}

              {/* Description */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:6,letterSpacing:0.5 }}>Description</div>
                <div style={{ fontSize:12,color:"#444",lineHeight:1.7,whiteSpace:"pre-wrap" }}>{detail.description}</div>
              </div>

              {/* Links */}
              {[detail.registration_link,detail.meeting_link,detail.google_form_link,detail.conference_url].filter(Boolean).length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:6,letterSpacing:0.5 }}>Links</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    {detail.registration_link && <a href={detail.registration_link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:P,textDecoration:"none" }}>🔗 Registration Link</a>}
                    {detail.meeting_link && <a href={detail.meeting_link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:P,textDecoration:"none" }}>💻 Meeting Link</a>}
                    {detail.google_form_link && <a href={detail.google_form_link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:P,textDecoration:"none" }}>📋 Google Form</a>}
                    {detail.conference_url && <a href={detail.conference_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:P,textDecoration:"none" }}>🌐 Conference Website</a>}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {detail.attachments && detail.attachments.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11,fontWeight:600,color:"#888",textTransform:"uppercase",marginBottom:6,letterSpacing:0.5 }}>Attachments ({detail.attachments.length})</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
                    {detail.attachments.map(t=>(
                      <div key={t.attachment_id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"#f8f8fb",borderRadius:6,border:"1px solid #eee" }}>
                        <a href={`${BASE_URL}/announcements/attachments/${t.attachment_id}/download`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11,color:P,textDecoration:"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📄 {t.filename} <span style={{color:"#999"}}>({formatBytes(t.file_size)})</span></a>
                        {canCreate && <span onClick={()=>handleRemoveExisting(t.attachment_id)} style={{ fontSize:11,color:"#A32D2D",cursor:"pointer",flexShrink:0 }}>Remove</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {canCreate && (
                <div style={{ display:"flex",gap:6,flexWrap:"wrap",paddingTop:12,borderTop:"1px solid #eee" }}>
                  <button onClick={()=>{openEdit(detail);}} style={{ padding:"6px 14px",border:"1px solid "+P,color:P,borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>✏ Edit</button>
                  <button onClick={()=>togglePin(detail)} style={{ padding:"6px 14px",border:"1px solid #633806",color:"#633806",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>{detail.pinned?"📌 Unpin":"📌 Pin"}</button>
                  {detail.status === "published" && <button onClick={()=>changeStatus(detail,"archived")} style={{ padding:"6px 14px",border:"1px solid #888",color:"#888",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>📦 Archive</button>}
                  {detail.status === "draft" && <button onClick={()=>changeStatus(detail,"published")} style={{ padding:"6px 14px",border:"1px solid #22A853",color:"#22A853",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>✅ Publish</button>}
                  {detail.status !== "published" && detail.status !== "draft" && <button onClick={()=>changeStatus(detail,"published")} style={{ padding:"6px 14px",border:"1px solid #22A853",color:"#22A853",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>✅ Re-publish</button>}
                  <button onClick={()=>handleDuplicate(detail)} style={{ padding:"6px 14px",border:"1px solid #0C447C",color:"#0C447C",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>📋 Duplicate</button>
                  <button onClick={()=>handleDelete(detail.announcement_id)} style={{ padding:"6px 14px",border:"1px solid #A32D2D",color:"#A32D2D",borderRadius:6,fontSize:11,background:"#fff",cursor:"pointer" }}>🗑 Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function AnnouncementCard({ a, role, canCreate, onOpen, onEdit, onDelete, onDuplicate, onTogglePin, onChangeStatus, formatDate, timeAgo, Badge, P }) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <div style={{
      background:"#fff", border:"1px solid #eee", borderRadius:10,
      padding:"14px 16px", borderLeft:`3px solid ${PRIORITY_COLORS[a.priority]||"#ddd"}`,
      cursor:"pointer", transition:"box-shadow 0.15s", position:"relative",
    }} onClick={()=>onOpen(a)}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:4,flexWrap:"wrap" }}>
            {a.pinned && <span style={{ fontSize:10 }}>📌</span>}
            <Badge text={a.category} color="#fff" bg={CATEGORY_COLORS[a.category]||"#888"} />
            <Badge text={PRIORITY_LABELS[a.priority]} color="#fff" bg={PRIORITY_COLORS[a.priority]} />
            <Badge text={a.status.charAt(0).toUpperCase()+a.status.slice(1)} color="#fff" bg={STATUS_COLORS[a.status]} />
          </div>
          <div style={{ fontSize:13,fontWeight:600,color:"#1a1a1a",marginBottom:4 }}>{a.title}</div>
          {a.summary && <div style={{ fontSize:11,color:"#666",marginBottom:4,lineHeight:1.4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.summary}</div>}
          <div style={{ display:"flex",gap:8,alignItems:"center",fontSize:10,color:"#888",marginTop:4 }}>
            <span>{a.created_by?.name||"Unknown"}</span>
            <span>·</span>
            <span>{timeAgo(a.created_at)}</span>
            <span>·</span>
            <span>{a.read_count||0} views</span>
            {a.attachment_count > 0 && <span>· 📎 {a.attachment_count}</span>}
          </div>
        </div>
        <div style={{ position:"relative",flexShrink:0 }}>
          <span onClick={e=>{e.stopPropagation();setShowMenu(!showMenu);}} style={{ fontSize:16,color:"#999",cursor:"pointer",padding:"2px 4px" }}>⋮</span>
          {showMenu && (
            <div style={{ position:"absolute",right:0,top:20,background:"#fff",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",border:"1px solid #eee",zIndex:50,minWidth:140,padding:"4px 0" }}
              onMouseLeave={()=>setShowMenu(false)}>
              <div onClick={e=>{e.stopPropagation();setShowMenu(false);onOpen(a);}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#333" }}>👁 View Details</div>
              {canCreate && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onEdit(a);}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#333" }}>✏ Edit</div>}
              {canCreate && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onDuplicate(a);}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#333" }}>📋 Duplicate</div>}
              {canCreate && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onTogglePin(a);}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#333" }}>{a.pinned?"📌 Unpin":"📌 Pin"}</div>}
              {canCreate && a.status === "published" && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onChangeStatus(a,"archived");}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#888" }}>📦 Archive</div>}
              {canCreate && a.status === "draft" && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onChangeStatus(a,"published");}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#22A853" }}>✅ Publish</div>}
              {canCreate && <div onClick={e=>{e.stopPropagation();setShowMenu(false);onDelete(a.announcement_id);}} style={{ padding:"7px 14px",fontSize:11,cursor:"pointer",color:"#A32D2D" }}>🗑 Delete</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const lbl = { fontSize:11,color:"#555",display:"block",marginBottom:4 };
const inp = { width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:12,boxSizing:"border-box" };
