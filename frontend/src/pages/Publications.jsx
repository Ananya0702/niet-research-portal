import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getPublications, getPubCounts, addPublication, deletePublication, getDepartments, getSchools, getMyProfile } from "../services/api";

const P = "#534AB7";
const PL = "rgba(83,74,183,0.08)";

const EMPTY = {
  title:"", journal_name:"", doi:"", indexing:"SCI", quartile:"Q1",
  impact_factor:"", year: new Date().getFullYear(), citations_count:0,
  publication_type:"", abstract:"", conference_name:"",
  conference_location:"", publisher:"", volume:"", issue:"", pages:"",
  issn:"", isbn:"", keywords:"", research_area:"", sub_area:"",
  language:"English", country:"", status:"Published",
};

const TABS = [
  { key:"all", label:"All Publications" },
  { key:"journal", label:"Journal Articles" },
  { key:"conference", label:"Conference Papers" },
];

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const Q_BG    = { Q1:"#E6F1FB", Q2:"#EAF3DE", Q3:"#FAEEDA", Q4:"#FCEBEB" };

const SCOPE_LABELS = {
  my: "My Publications",
  department: "Department Publications",
  school: "School Publications",
  faculty: "Faculty Publications",
  all: "All Publications",
};

const SOURCE_OPTIONS = [
  { key:"all", label:"All Sources" },
  { key:"manual", label:"📝 Manual" },
  { key:"google_scholar", label:"🎓 Google Scholar" },
  { key:"orcid", label:"🆔 ORCID" },
  { key:"scopus", label:"📘 Scopus" },
];

const SOURCE_BADGE_STYLE = {
  google_scholar: { bg:"#E6F1FB", color:"#0C447C", label:"Scholar" },
  orcid:          { bg:"#EEEDFE", color:P, label:"ORCID" },
  scopus:         { bg:"#EAF3DE", color:"#27500A", label:"Scopus" },
  manual:         { bg:"#F0F0F5", color:"#666", label:"Manual" },
};

const SOURCE_CARDS = [
  { key:"google_scholar", label:"Google Scholar", icon:"🎓", bg:"#E6F1FB", color:"#0C447C" },
  { key:"scopus",         label:"Scopus",         icon:"📘", bg:"#EAF3DE", color:"#27500A" },
  { key:"orcid",          label:"ORCID",          icon:"🆔", bg:"#EEEDFE", color:P },
];

function SourceBadges({ sources, source_platform }) {
  const list = (sources || []).length > 0
    ? sources.map(s => s.platform)
    : (source_platform && source_platform !== "manual" ? [source_platform] : []);
  if (list.length === 0) return <span style={{ fontSize:9, color:"#ccc" }}>—</span>;
  return (
    <div style={{ display:"flex", gap:3, flexWrap:"wrap", maxWidth:110 }}>
      {list.map(pl => {
        const s = SOURCE_BADGE_STYLE[pl] || SOURCE_BADGE_STYLE.manual;
        return (
          <span key={pl} title={`Available on ${s.label}`} style={{ fontSize:8, padding:"1px 5px", borderRadius:4, fontWeight:600, background:s.bg, color:s.color, whiteSpace:"nowrap" }}>{s.label}</span>
        );
      })}
    </div>
  );
}

export default function Publications() {
  const navigate = useNavigate();  const [pubs, setPubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ quartile:"", indexing:"", year_from:"", year_to:"" });
  const [source, setSource] = useState("all");
  const [counts, setCounts] = useState({ total:0, journal:0, conference:0 });
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [scope, setScope] = useState("my");
  const [userRole, setUserRole] = useState("");
  const [userSchoolId, setUserSchoolId] = useState(null);
  const [userDeptId, setUserDeptId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");

  // Decode JWT
  useEffect(() => {
    try {
      const t = localStorage.getItem("token");
      if (t) {
        const payload = JSON.parse(atob(t.split(".")[1]));
        setUserRole(payload.role || "");
        setUserSchoolId(payload.school_id || null);
        setUserDeptId(payload.dept_id || null);
      }
    } catch {}
  }, []);

  // Fetch profile (school/dept names)
  useEffect(() => {
    getMyProfile().then(r => {
      setSchoolName(r.data.school_name || "");
      setDeptName(r.data.dept_name || "");
      if (!userSchoolId) setUserSchoolId(r.data.school_id);
      if (!userDeptId) setUserDeptId(r.data.dept_id);
    }).catch(() => {});
  }, []);

  // Fetch departments and schools
  useEffect(() => {
    if (userRole === "dean_rd" && userSchoolId) {
      getDepartments(userSchoolId).then(r => setDepartments(r.data)).catch(() => {});
    }
    if (userRole === "admin") {
      getSchools().then(r => { setSchools(r.data); }).catch(() => {});
    }
  }, [userRole, userSchoolId]);

  // Admin: fetch departments when school selected
  useEffect(() => {
    if (userRole === "admin" && selectedSchoolId) {
      getDepartments(parseInt(selectedSchoolId)).then(r => setDepartments(r.data)).catch(() => {});
    }
  }, [userRole, selectedSchoolId]);

  // Define available scopes based on role
  const getScopeOptions = () => {
    switch (userRole) {
      case "faculty": return ["my"];
      case "hod": return ["my", "department"];
      case "dean_rd": return ["my", "school"];
      case "admin": return ["my", "faculty", "department", "school", "all"];
      default: return ["my"];
    }
  };
  const scopeOptions = getScopeOptions();

  // Reset scope if current one not available for role
  useEffect(() => {
    if (scopeOptions.length > 0 && !scopeOptions.includes(scope)) {
      setScope(scopeOptions[0]);
    }
  }, [userRole]);

  const paramsForAPI = useCallback(() => {
    const p = { page, per_page: perPage, search, scope };
    if (activeTab === "journal") p.pub_type = "Journal";
    else if (activeTab === "conference") p.pub_type = "Conference";
    if (filters.quartile) p.quartile = filters.quartile;
    if (filters.indexing) p.indexing = filters.indexing;
    if (filters.year_from) p.year_from = parseInt(filters.year_from);
    if (filters.year_to) p.year_to = parseInt(filters.year_to);
    if (source && source !== "all") p.source = source;
    // Dean: pass dept_id filter when department selected
    if (userRole === "dean_rd" && selectedDeptId) p.dept_id = parseInt(selectedDeptId);
    // Admin: pass school_id/dept_id based on scope
    if (userRole === "admin" && scope === "department" && selectedDeptId) p.dept_id = parseInt(selectedDeptId);
    return p;
  }, [page, perPage, activeTab, search, filters, scope, source, userRole, selectedDeptId]);

  const fetchPubs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublications(paramsForAPI());
      setPubs(res.data.publications);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [paramsForAPI]);

  const fetchCounts = useCallback(async () => {
    try {
      const params = { scope };
      if (source && source !== "all") params.source = source;
      if (userRole === "dean_rd" && selectedDeptId) params.dept_id = parseInt(selectedDeptId);
      if (userRole === "admin" && scope === "department" && selectedDeptId) params.dept_id = parseInt(selectedDeptId);
      const r = await getPubCounts(params);
      setCounts(r.data);
    } catch {}
  }, [scope, source, userRole, selectedDeptId]);

  useEffect(() => { fetchPubs(); fetchCounts(); }, [fetchPubs, fetchCounts]);

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  const handleTabChange = (tab) => { setActiveTab(tab); setPage(1); };

  const handleScopeChange = (s) => { setScope(s); setPage(1); setSelectedDeptId(""); };

  const clearFilters = () => {
    setFilters({ quartile:"", indexing:"", year_from:"", year_to:"" });
    setSource("all");
    setSearch(""); setSearchInput(""); setPage(1);
  };

  const hasFilters = filters.quartile || filters.indexing || filters.year_from || filters.year_to || search || source !== "all";

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await addPublication({
        ...form,
        impact_factor: parseFloat(form.impact_factor) || 0,
        citations_count: parseInt(form.citations_count) || 0,
        year: parseInt(form.year) || new Date().getFullYear(),
      });
      setModal(false); setForm(EMPTY); fetchPubs(); fetchCounts();
    } catch { alert("Error saving publication"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this publication?")) {
      await deletePublication(id); fetchPubs(); fetchCounts();
    }
  };

  const pubCounts = [
    { icon:"📄", label:"Total Publications", value:counts.total, bg:"#EEEDFE", color:P },
    { icon:"📚", label:"Journal Articles", value:counts.journal, bg:"#E6F1FB", color:"#0C447C" },
    { icon:"🎤", label:"Conference Papers", value:counts.conference, bg:"#FAEEDA", color:"#633806" },
  ];

  const scopeLabel = SCOPE_LABELS[scope] || "Publications";

  const isFrozen = userRole === "faculty" || userRole === "hod";

  return (
    <Layout>
      {/* Topbar */}
      <div style={{ background:"#fff", borderBottom:"1px solid #eee", padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600 }}>Publications</div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>Manage your research publications</div>
        </div>
        <button onClick={()=>setModal(true)} style={{ background:P, color:"#fff", padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add Publication</button>
      </div>

      {/* Counters */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, padding:"12px 16px 0" }}>
        {pubCounts.map(c => (
          <div key={c.label} style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:c.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize:11, color:"#888" }}>{c.label}</div>
              <div style={{ fontSize:22, fontWeight:600, lineHeight:1.2 }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Source summary cards (clickable to filter) */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, padding:"10px 16px 0" }}>
        {SOURCE_CARDS.map(sc => {
          const active = source === sc.key;
          const n = (counts.sources || {})[sc.key] || 0;
          return (
            <button key={sc.key} onClick={()=>{ setSource(active ? "all" : sc.key); setPage(1); }} style={{
              background: active ? sc.color : "#fff",
              border: active ? `1px solid ${sc.color}` : "1px solid #eee",
              borderRadius:12, padding:"10px 14px", cursor:"pointer", textAlign:"left",
              display:"flex", alignItems:"center", gap:10, transition:"all 0.15s",
              color: active ? "#fff" : "#1a1a1a",
            }}>
              <div style={{ width:34, height:34, borderRadius:9, background: active ? "rgba(255,255,255,0.18)" : sc.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{sc.icon}</div>
              <div>
                <div style={{ fontSize:11, color: active ? "rgba(255,255,255,0.85)" : "#888" }}>{sc.label}</div>
                <div style={{ fontSize:18, fontWeight:600, lineHeight:1.2 }}>{n} Publications</div>
              </div>
              {active && <span style={{ marginLeft:"auto", fontSize:11, fontWeight:600, color:"#fff" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Scope Toolbar + School/Department labels */}
      {scopeOptions.length > 1 && (
        <div style={{ display:"flex", gap:10, alignItems:"center", padding:"10px 16px 0", background:"#f7f7f8", flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"#888", fontWeight:500 }}>Publication Scope:</span>
          <div style={{ display:"flex", background:"#fff", borderRadius:8, border:"1px solid #ddd", overflow:"hidden" }}>
            {scopeOptions.map(s => (
              <div key={s} onClick={()=>handleScopeChange(s)} style={{
                padding:"6px 18px", fontSize:12, fontWeight:500, cursor:"pointer",
                background: scope===s ? P : "#fff",
                color: scope===s ? "#fff" : "#555",
                transition:"all 0.15s",
              }}>{SCOPE_LABELS[s]}</div>
            ))}
          </div>
        </div>
      )}

      {/* Frozen School / Department labels (Faculty / HOD) */}
      {isFrozen && (
        <div style={{ display:"flex", gap:16, padding:"6px 16px 0", background:"#f7f7f8", fontSize:11, color:"#888" }}>
          <span>School: <strong style={{color:"#555"}}>{schoolName || "—"}</strong> 🔒</span>
          <span>Department: <strong style={{color:"#555"}}>{deptName || "—"}</strong> 🔒</span>
        </div>
      )}

      {/* Dean: School frozen + Department dropdown */}
      {userRole === "dean_rd" && (
        <>
          <div style={{ display:"flex", gap:16, padding:"6px 16px 0", background:"#f7f7f8", fontSize:11, color:"#888" }}>
            <span>School: <strong style={{color:"#555"}}>{schoolName || "—"}</strong> 🔒</span>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", padding:"4px 16px 0", background:"#f7f7f8", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"#888", fontWeight:500 }}>Department:</span>
            <select value={selectedDeptId} onChange={e=>{setSelectedDeptId(e.target.value); setPage(1);}} style={{ padding:"4px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none", background:"#fff" }}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
            </select>
          </div>
        </>
      )}

      {/* Admin: School + Department dropdowns (nothing frozen) */}
      {userRole === "admin" && (
        <div style={{ display:"flex", gap:10, alignItems:"center", padding:"4px 16px 0", background:"#f7f7f8", flexWrap:"wrap" }}>
          <span style={{ fontSize:11, color:"#888", fontWeight:500 }}>School:</span>
          <select value={selectedSchoolId} onChange={e=>{setSelectedSchoolId(e.target.value); setSelectedDeptId(""); setPage(1);}} style={{ padding:"4px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none", background:"#fff" }}>
            <option value="">All Schools</option>
            {schools.map(s => <option key={s.school_id} value={s.school_id}>{s.school_name}</option>)}
          </select>
          <span style={{ fontSize:11, color:"#888", fontWeight:500 }}>Department:</span>
          <select value={selectedDeptId} onChange={e=>{setSelectedDeptId(e.target.value); setPage(1);}} style={{ padding:"4px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none", background:"#fff" }}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:0, padding:"8px 16px 0", background:"#f7f7f8", borderBottom:"1px solid #eee" }}>
        {TABS.map(t => (
          <div key={t.key} onClick={()=>handleTabChange(t.key)} style={{ padding:"8px 16px", fontSize:13, fontWeight:500, cursor:"pointer", color:activeTab===t.key ? P : "#888", borderBottom:activeTab===t.key ? `2px solid ${P}` : "2px solid transparent", background:activeTab===t.key ? "#fff" : "transparent", borderRadius:"4px 4px 0 0", transition:"all 0.15s" }}>{t.label}</div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{ padding:"10px 16px", background:"#f7f7f8", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ position:"relative", flex:1, minWidth:200 }}>
          <span style={{ position:"absolute", left:10, top:"50%", transform:"translateY(-50%)", fontSize:13, color:"#aaa" }}>🔍</span>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSearch()} placeholder={`Search ${scopeLabel.toLowerCase()} by title, author, keyword, DOI...`} style={{ width:"100%", padding:"7px 12px 7px 32px", border:"1px solid #ddd", borderRadius:8, fontSize:12, outline:"none", background:"#fff" }} />
        </div>
        <button onClick={handleSearch} style={{ padding:"7px 16px", background:P, color:"#fff", borderRadius:8, fontSize:12, border:"none", cursor:"pointer" }}>Search</button>
        <button onClick={()=>setShowFilters(!showFilters)} style={{ padding:"7px 16px", background:showFilters?PL:"#fff", color:showFilters?P:"#555", borderRadius:8, fontSize:12, border:"1px solid #ddd", cursor:"pointer" }}>⚙ Filters {hasFilters ? `(${Object.values(filters).filter(Boolean).length+(search?1:0)})` : ""}</button>
        {hasFilters && <button onClick={clearFilters} style={{ padding:"7px 12px", background:"#FCEBEB", color:"#A32D2D", borderRadius:8, fontSize:11, border:"none", cursor:"pointer" }}>✕ Clear</button>}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div style={{ padding:"8px 16px", background:"#f0f0f5", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", borderBottom:"1px solid #eee" }}>
          <select value={filters.quartile} onChange={e=>setFilters({...filters, quartile:e.target.value})} style={{ padding:"5px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }}>
            <option value="">All Quartiles</option>
            {["Q1","Q2","Q3","Q4"].map(q => <option key={q}>{q}</option>)}
          </select>
          <select value={source} onChange={e=>{setSource(e.target.value); setPage(1);}} style={{ padding:"5px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none", fontWeight: source!=="all"?600:400 }}>
            {SOURCE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select value={filters.indexing} onChange={e=>setFilters({...filters, indexing:e.target.value})} style={{ padding:"5px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }}>
            <option value="">All Indexing</option>
            {["SCI","SCIE","Scopus","UGC Care","None"].map(i => <option key={i}>{i}</option>)}
          </select>
          <input type="number" placeholder="Year from" value={filters.year_from} onChange={e=>setFilters({...filters, year_from:e.target.value})} style={{ width:90, padding:"5px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }} />
          <input type="number" placeholder="Year to" value={filters.year_to} onChange={e=>setFilters({...filters, year_to:e.target.value})} style={{ width:90, padding:"5px 10px", border:"1px solid #ddd", borderRadius:6, fontSize:11, outline:"none" }} />
        </div>
      )}

      {/* Table */}
      <div style={{ flex:1, overflowY:"auto", padding:16 }}>
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", overflow:"hidden" }}>
          {activeTab === "conference" ? (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9f9f9" }}>
                  {["Title","Authors","Conference Name","Location","Year","Publisher","Citations","Indexing","Source","Action"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", fontSize:11, color:"#888", textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:"center" }}><div className="spinner" /></td></tr>
                ) : pubs.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:60, textAlign:"center", color:"#aaa", fontSize:14 }}>No conference papers found in {scopeLabel.toLowerCase()}</td></tr>
                ) : pubs.map(p => (
                  <tr key={p.pub_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                    <td style={{ padding:"10px 14px", fontSize:12, color:P, cursor:"pointer", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} onClick={()=>navigate(`/publications/${p.pub_id}`)}>{p.title}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.faculty_name || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.conference_name || p.journal_name || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#888" }}>{p.conference_location || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11 }}>{p.year}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#888" }}>{p.publisher || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11 }}>{p.citations_count}</td>
                    <td style={{ padding:"10px 14px", fontSize:10, color:"#888" }}>{p.indexing}</td>
                    <td style={{ padding:"10px 14px" }}><SourceBadges sources={p.sources} source_platform={p.source_platform} /></td>
                    <td style={{ padding:"10px 14px" }}>
                      <button onClick={()=>handleDelete(p.pub_id)} style={{ fontSize:10, color:"#A32D2D", background:"#FCEBEB", padding:"2px 8px", borderRadius:4, border:"none", cursor:"pointer" }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === "journal" ? (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9f9f9" }}>
                  {["Title","Authors","Journal","Year","Quartile","IF","Citations","Indexing","Source","Action"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", fontSize:11, color:"#888", textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:"center" }}><div className="spinner" /></td></tr>
                ) : pubs.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:60, textAlign:"center", color:"#aaa", fontSize:14 }}>No journal articles found in {scopeLabel.toLowerCase()}</td></tr>
                ) : pubs.map(p => (
                  <tr key={p.pub_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                    <td style={{ padding:"10px 14px", fontSize:12, color:P, cursor:"pointer", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} onClick={()=>navigate(`/publications/${p.pub_id}`)}>{p.title}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.faculty_name || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.journal_name || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11 }}>{p.year}</td>
                    <td style={{ padding:"10px 14px" }}>
                      {p.quartile && p.quartile !== "N/A" ? (
                        <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:500, background:Q_BG[p.quartile]||"#f0f0f0", color:Q_COLORS[p.quartile]||"#888" }}>{p.quartile}</span>
                      ) : <span style={{ fontSize:10, color:"#ccc" }}>—</span>}
                    </td>
                    <td style={{ padding:"10px 14px", fontSize:11 }}>{p.impact_factor || "—"}</td>
                    <td style={{ padding:"10px 14px", fontSize:11 }}>{p.citations_count}</td>
                    <td style={{ padding:"10px 14px", fontSize:10, color:"#888" }}>{p.indexing}</td>
                    <td style={{ padding:"10px 14px" }}><SourceBadges sources={p.sources} source_platform={p.source_platform} /></td>
                    <td style={{ padding:"10px 14px" }}>
                      <button onClick={()=>handleDelete(p.pub_id)} style={{ fontSize:10, color:"#A32D2D", background:"#FCEBEB", padding:"2px 8px", borderRadius:4, border:"none", cursor:"pointer" }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#f9f9f9" }}>
                  {["Title","Authors","Type","Journal / Conference","Year","Quartile","Citations","Indexing","Source","Action"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", fontSize:11, color:"#888", textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ padding:40, textAlign:"center" }}><div className="spinner" /></td></tr>
                ) : pubs.length === 0 ? (
                  <tr><td colSpan={10} style={{ padding:60, textAlign:"center", color:"#aaa", fontSize:14 }}>No publications found in {scopeLabel.toLowerCase()}</td></tr>
                ) : pubs.map(p => {
                  const pt = p.publication_type === "Conference" ? "Conference" : "Journal";
                  const isConf = pt === "Conference";
                  return (
                    <tr key={p.pub_id} style={{ borderBottom:"1px solid #f5f5f5" }}>
                      <td style={{ padding:"10px 14px", fontSize:12, color:P, cursor:"pointer", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} onClick={()=>navigate(`/publications/${p.pub_id}`)}>{p.title}</td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.faculty_name || "—"}</td>
                      <td style={{ padding:"10px 14px" }}>
                        <span style={{ fontSize:10, padding:"2px 8px", borderRadius:4, fontWeight:500, background:isConf ? "#FAEEDA" : "#E6F1FB", color:isConf ? "#633806" : "#0C447C" }}>{pt}</span>
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:11, color:"#555", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{isConf ? (p.conference_name || p.journal_name || "—") : (p.journal_name || "—")}</td>
                      <td style={{ padding:"10px 14px", fontSize:11 }}>{p.year}</td>
                      <td style={{ padding:"10px 14px" }}>
                        {p.quartile && p.quartile !== "N/A" ? (
                          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:4, fontWeight:500, background:Q_BG[p.quartile]||"#f0f0f0", color:Q_COLORS[p.quartile]||"#888" }}>{p.quartile}</span>
                        ) : <span style={{ fontSize:10, color:"#ccc" }}>—</span>}
                      </td>
                      <td style={{ padding:"10px 14px", fontSize:11 }}>{p.citations_count}</td>
                      <td style={{ padding:"10px 14px", fontSize:10, color:"#888" }}>{p.indexing}</td>
                      <td style={{ padding:"10px 14px" }}><SourceBadges sources={p.sources} source_platform={p.source_platform} /></td>
                      <td style={{ padding:"10px 14px" }}>
                        <button onClick={()=>handleDelete(p.pub_id)} style={{ fontSize:10, color:"#A32D2D", background:"#FCEBEB", padding:"2px 8px", borderRadius:4, border:"none", cursor:"pointer" }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:14, alignItems:"center" }}>
            <button disabled={page===1} onClick={()=>setPage(page-1)} style={{ padding:"6px 14px", borderRadius:6, border:"1px solid #ddd", background:"#fff", fontSize:11, cursor:page===1?"not-allowed":"pointer", opacity:page===1?0.5:1 }}>← Prev</button>
            {Array.from({length:Math.min(totalPages,5)}, (_,i)=>{
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <div key={p} onClick={()=>setPage(p)} style={{ width:28, height:28, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:500, cursor:"pointer", background:page===p?P:"#fff", color:page===p?"#fff":"#555", border:page===p?"none":"1px solid #eee" }}>{p}</div>
              );
            })}
            <button disabled={page===totalPages} onClick={()=>setPage(page+1)} style={{ padding:"6px 14px", borderRadius:6, border:"1px solid #ddd", background:"#fff", fontSize:11, cursor:page===totalPages?"not-allowed":"pointer", opacity:page===totalPages?0.5:1 }}>Next →</button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {modal && (
        <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>
          <div style={{ background:"#fff", borderRadius:14, padding:"24px 28px", width:550, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <span style={{ fontSize:16, fontWeight:600 }}>Add Publication</span>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }} onClick={()=>setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Publication Type</label>
                <select value={form.publication_type} onChange={e=>setForm({...form, publication_type:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
                  <option value="">Auto-detect</option>
                  <option value="Journal">Journal Article</option>
                  <option value="Conference">Conference Paper</option>
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Paper Title *</label>
                <input type="text" required value={form.title} onChange={e=>setForm({...form, title:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Journal / Conference Name *</label>
                  <input type="text" required value={form.journal_name} onChange={e=>setForm({...form, journal_name:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Publisher</label>
                  <input type="text" value={form.publisher} onChange={e=>setForm({...form, publisher:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Year</label>
                  <input type="number" value={form.year} onChange={e=>setForm({...form, year:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Quartile</label>
                  <select value={form.quartile} onChange={e=>setForm({...form, quartile:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
                    {["Q1","Q2","Q3","Q4","N/A"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Indexing</label>
                  <select value={form.indexing} onChange={e=>setForm({...form, indexing:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }}>
                    {["SCI","SCIE","Scopus","UGC Care","None"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Volume</label>
                  <input type="text" value={form.volume} onChange={e=>setForm({...form, volume:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Issue</label>
                  <input type="text" value={form.issue} onChange={e=>setForm({...form, issue:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Pages</label>
                  <input type="text" value={form.pages} onChange={e=>setForm({...form, pages:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>DOI</label>
                  <input type="text" value={form.doi} onChange={e=>setForm({...form, doi:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
                <div>
                  <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Impact Factor</label>
                  <input type="number" step="0.01" value={form.impact_factor} onChange={e=>setForm({...form, impact_factor:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} />
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Keywords (comma separated)</label>
                <input type="text" value={form.keywords} onChange={e=>setForm({...form, keywords:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13 }} placeholder="e.g. Blockchain, Smart Contract, Security" />
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, color:"#555", display:"block", marginBottom:5 }}>Abstract</label>
                <textarea rows={3} value={form.abstract} onChange={e=>setForm({...form, abstract:e.target.value})} style={{ width:"100%", padding:"9px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:13, fontFamily:"inherit" }} />
              </div>
              <div style={{ display:"flex", gap:10, marginTop:18 }}>
                <button type="button" onClick={()=>setModal(false)} style={{ flex:1, padding:10, border:"1px solid #ddd", borderRadius:8, fontSize:13, background:"#fff", cursor:"pointer" }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ flex:2, padding:10, background:P, color:"#fff", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:saving?"not-allowed":"pointer" }}>{saving ? "Saving..." : "Save Publication"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
