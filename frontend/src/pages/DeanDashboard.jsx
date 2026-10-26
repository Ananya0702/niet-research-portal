import { useEffect, useState, useCallback } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const D_COLORS = ["#534AB7","#0C447C","#27500A","#BA7517","#A32D2D","#088780","#888780"];

function KPICard({ icon, label, value, sub, bg, accent }) {
  const hasTrend = /^[↑↓]/.test(sub || "");
  const isDown = (sub || "").startsWith("↓");
  return (
    <div style={{
      position:"relative",overflow:"hidden",minWidth:0,minHeight:132,boxSizing:"border-box",
      background:"linear-gradient(145deg, #fff 0%, #fcfbff 100%)", border:"1px solid #eceaf3", borderRadius:14,
      padding:"14px 15px 13px", display:"flex", flexDirection:"column", justifyContent:"space-between", gap:12,
      boxShadow:"0 3px 12px rgba(32,24,68,0.045)",transition:"transform .16s ease, box-shadow .16s ease",
    }}>
      <div style={{ position:"absolute",left:0,top:0,bottom:0,width:3,background:accent||"#534AB7" }} />
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:8 }}>
        <div style={{ fontSize:11,fontWeight:550,color:"#777386",lineHeight:1.3,minWidth:0 }}>{label}</div>
      <div style={{
          width:36,height:36,borderRadius:11,background:bg,border:"1px solid rgba(30,25,55,0.035)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,
      }}>{icon}</div>
      </div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:25,fontWeight:750,letterSpacing:"-0.035em",lineHeight:1.05,color:"#211b35",fontVariantNumeric:"tabular-nums",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{value ?? "—"}</div>
        {sub && (hasTrend ? (
          <span style={{ display:"inline-flex",alignItems:"center",gap:4,maxWidth:"100%",marginTop:8,padding:"4px 7px",borderRadius:20,background:isDown?"#FCEBEB":"#EAF3DE",color:isDown?"#A32D2D":"#27500A",fontSize:9,fontWeight:650,lineHeight:1.25,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }} title={sub}>{sub}</span>
        ) : (
          <div title={sub} style={{ fontSize:9,color:"#858091",marginTop:7,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden" }}>{sub}</div>
        ))}
      </div>
    </div>
  );
}

export default function DeanDashboard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [error,     setError]     = useState(false);
  const [errorMsg,  setErrorMsg]  = useState("");
  const [deptId,    setDeptId]    = useState(null); // null = all depts in assigned school
  const [source,    setSource]    = useState("all");

  const SOURCE_OPTIONS = [
    { key:"all", label:"All Sources" },
    { key:"manual", label:"📝 Manual" },
    { key:"google_scholar", label:"🎓 Google Scholar" },
    { key:"orcid", label:"🆔 ORCID" },
    { key:"scopus", label:"📘 Scopus" },
  ];

  const load = useCallback((did, src) => {
    const params = {};
    if (did) params.dept_id = did;
    if (src && src !== "all") params.source = src;
    return API.get("/dean/dashboard", { params }).then(res => {
      setData(res.data);
      setError(false);
      return res.data;
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    load(deptId, source)
      .catch((err) => {
        console.error("Dean dashboard error:", err);
        setError(true);
        setErrorMsg(err.response?.data?.detail || err.message || "Error loading data.");
      })
      .finally(() => setLoading(false));
  }, [load, deptId, source]);

  const handleDeptChange = (did) => {
    setDeptId(did);
  };

  if (loading) return (
    <Layout>
      <div style={{ padding:40, textAlign:"center" }}>
        <div className="spinner" />
        <p style={{ color:"#888", marginTop:12 }}>Loading Dean Dashboard...</p>
      </div>
    </Layout>
  );

  if (error || !data) return (
    <Layout>
      <div style={{ padding:40 }}>
        <p style={{ color:"red", fontSize:15, fontWeight:600 }}>Error loading data</p>
        <p style={{ color:"#666", fontSize:12, marginTop:6 }}>{errorMsg || "Could not retrieve dean dashboard figures."}</p>
        <button onClick={() => { setError(false); setLoading(true); load(deptId, source).finally(() => setLoading(false)); }} style={{ marginTop:14, padding:"8px 18px", background:"#534AB7", color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:12 }}>
          Retry
        </button>
      </div>
    </Layout>
  );

  const {
    scope, kpis, publications_by_year, citations_by_year,
    quartile_breakdown, publications_by_dept,
    top_faculty, dept_scorecard, latest_publications,
  } = data;

  const g = kpis.growth || {};
  const growthStr = (pct, abs) =>
    pct === null || pct === undefined ? "" :
    `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last year${abs && abs !== 0 ? ` (${abs >= 0 ? "+" : ""}${abs})` : ""}`;

  const schoolName   = scope?.school_name || "Your School";
  const departments  = scope?.departments || [];
  const deptOptions  = departments;
  const selectedDept = departments.find(d => d.dept_id === deptId) || null;

  return (
    <Layout>

      {/* Topbar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #eee",
        padding:"12px 20px", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600 }}>
            NIET Research Analytics Portal
          </div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
            {!deptId
              ? `Overview of research performance across all departments of ${schoolName} · ${new Date().getFullYear()}`
              : `Showing data for ${selectedDept.dept_name} · ${new Date().getFullYear()}`}
          </div>
        </div>

        {/* School & Department Filters */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"#888" }}>Filter by:</span>

          {/* School Dropdown — locked to assigned school */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <select
              disabled
              value={schoolName}
              style={{
                padding:"7px 14px", borderRadius:20,
                border:"1px solid #ddd", fontSize:12,
                fontWeight:500, color:"#534AB7",
                background:"#EEEDFE", cursor:"not-allowed",
                outline:"none", opacity:0.9,
              }}>
              <option value={schoolName}>{schoolName}</option>
            </select>
            <span title="Locked to your assigned school" style={{ fontSize:12, color:"#888", cursor:"help" }}>🔒</span>
          </div>

          {/* Department Dropdown — editable within school */}
          <select
            value={deptId ?? ""}
            onChange={e => handleDeptChange(e.target.value === "" ? null : parseInt(e.target.value, 10))}
            style={{
              padding:"7px 14px", borderRadius:20,
              border:"1px solid #ddd", fontSize:12,
              fontWeight:500, color:"#534AB7",
              background:"#EEEDFE", cursor:"pointer",
              outline:"none",
            }}>
            <option value="">All Departments</option>
            {deptOptions.map(dept => (
              <option key={dept.dept_id} value={dept.dept_id}>
                {dept.dept_code} — {dept.dept_name}
              </option>
            ))}
          </select>

          {/* Source Filter Dropdown */}
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            style={{
              padding:"7px 14px", borderRadius:20,
              border:"1px solid #ddd", fontSize:12,
              fontWeight:600, color: source !== "all" ? "#0C447C" : "#555",
              background: source !== "all" ? "#E6F1FB" : "#fff", cursor:"pointer",
              outline:"none",
            }}>
            {SOURCE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          {/* Clear Department Filter */}
          {deptId && (
            <span
              onClick={() => handleDeptChange(null)}
              style={{
                fontSize:11, color:"#A32D2D", cursor:"pointer",
                background:"#FCEBEB", padding:"4px 10px",
                borderRadius:12, fontWeight:500,
              }}>✕ Clear</span>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {refreshing && (
          <div style={{
            position:"fixed", top:14, right:20, zIndex:20,
            background:"#534AB7", color:"#fff", fontSize:11,
            padding:"6px 14px", borderRadius:16, boxShadow:"0 4px 12px rgba(83,74,183,0.4)",
          }}>
            <span className="spinner" style={{ display:"inline-block", width:11, height:11, marginRight:6, verticalAlign:-1 }} /> Refreshing…
          </div>
        )}

        {/* KPI Cards */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",
          gap:12, marginBottom:16,
        }}>
          <KPICard icon="📄" label="Total Publications"
            value={kpis.total_publications}
            sub={growthStr(g.publications, g.publications_abs)} bg="#EEEDFE" accent="#534AB7" />
          <KPICard icon="📚" label="Publications This Year"
            value={kpis.publications_this_year}
            sub={growthStr(g.publications, g.publications_abs)} bg="#E6F1FB" accent="#185FA5" />
          <KPICard icon="💬" label="Total Citations"
            value={kpis.total_citations?.toLocaleString()}
            sub={growthStr(g.citations)} bg="#EAF3DE" accent="#27500A" />
          <KPICard icon="👥" label="Active Faculty"
            value={kpis.active_faculty}
            sub={!deptId ? `across all depts of ${schoolName}` : selectedDept.dept_name}
            bg="#FAEEDA" accent="#BA7517" />
          <KPICard icon="🏆" label="h-index (Institution)"
            value={kpis.inst_h_index}
            sub="Computed from publications" bg="#E1F5EE" accent="#0F6E56" />
          <KPICard icon="🎯" label="Avg Impact Factor"
            value={kpis.avg_impact_factor ?? "N/A"}
            sub={growthStr(g.impact_factor)} bg="#FCEBEB" accent="#A32D2D" />
        </div>

        {/* Charts Row */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:10, marginBottom:14,
        }}>

          {/* Publications trend */}
          <div style={card}>
            <div style={cardTitle}>Publications Over the Years</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={publications_by_year}>
                <XAxis dataKey="year" tick={{ fontSize:10 }} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count"
                  stroke="#534AB7" strokeWidth={2} dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Publications by Dept donut */}
          <div style={card}>
            <div style={cardTitle}>Publications by Department</div>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <PieChart width={120} height={130}>
                <Pie
                  data={publications_by_dept}
                  dataKey="count"
                  nameKey="dept"
                  innerRadius={35}
                  outerRadius={55}>
                  {publications_by_dept.map((d, i) => (
                    <Cell
                      key={i}
                      fill={D_COLORS[i] || "#aaa"}
                      opacity={!deptId || deptId === (departments.find(x => x.dept_code === d.dept) || {}).dept_id ? 1 : 0.25}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n, p) => [v, p.payload.name]} />
              </PieChart>
              <div>
                {publications_by_dept.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const dept = departments.find(x => x.dept_code === d.dept);
                      if (dept) handleDeptChange(dept.dept_id);
                    }}
                    style={{
                      display:"flex", alignItems:"center",
                      gap:5, marginBottom:4, cursor:"pointer",
                      opacity: !deptId || deptId === (departments.find(x => x.dept_code === d.dept) || {}).dept_id
                        ? 1 : 0.4,
                    }}>
                    <span style={{
                      width:7, height:7, borderRadius:2,
                      background: D_COLORS[i] || "#aaa", flexShrink:0,
                    }} />
                    <span style={{ fontSize:11, color:"#555", width:52 }}>
                      {d.dept}
                    </span>
                    <span style={{ fontSize:11, color:"#888" }}>
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quartile breakdown */}
          <div style={card}>
            <div style={cardTitle}>Publications by Journal Quartile</div>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <PieChart width={120} height={120}>
                <Pie data={quartile_breakdown} dataKey="count"
                  nameKey="quartile" innerRadius={35} outerRadius={55}>
                  {quartile_breakdown.map((entry, i) => (
                    <Cell key={i} fill={Q_COLORS[entry.quartile] || "#aaa"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              <div>
                {quartile_breakdown.map((q, i) => (
                  <div key={i} style={{
                    display:"flex", alignItems:"center",
                    gap:6, marginBottom:5,
                  }}>
                    <span style={{
                      width:8, height:8, borderRadius:2,
                      background: Q_COLORS[q.quartile] || "#aaa", flexShrink:0,
                    }} />
                    <span style={{ fontSize:12, width:28 }}>{q.quartile}</span>
                    <span style={{ fontSize:12, color:"#888" }}>{q.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Middle Row */}
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>

          {/* Top Faculty */}
          <div style={{ ...card, flex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:12 }}>
              <span style={cardTitle}>
                Top Faculty — By Research Score
                {deptId &&
                  <span style={{ fontSize:11, color:"#534AB7",
                    marginLeft:8, fontWeight:400 }}>
                    ({selectedDept.dept_name})
                  </span>}
              </span>
              {deptId && (
                <span onClick={() => handleDeptChange(null)} style={{
                  fontSize:11, color:"#534AB7", cursor:"pointer",
                }}>Show All</span>
              )}
            </div>
            {top_faculty.length === 0 ? (
              <div style={{ padding:"20px 0", textAlign:"center",
                color:"#aaa", fontSize:13 }}>
                No faculty data for {selectedDept?.dept_name || schoolName}
              </div>
            ) : (
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["#","Faculty","Dept","Score","Pubs","Citations"].map(h => (
                    <th key={h} style={{
                      padding:"6px 8px", fontSize:11, color:"#888",
                      textAlign:"left", borderBottom:"1px solid #eee",
                      fontWeight:500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top_faculty.map((f, i) => (
                  <tr key={f.faculty_id}>
                    <td style={{ padding:"8px 8px", fontSize:12,
                      color:"#888" }}>{i + 1}</td>
                    <td style={{ padding:"8px 8px", fontSize:12,
                      color:"#185FA5", fontWeight:500 }}>{f.name}</td>
                    <td style={{ padding:"8px 8px" }}>
                      <span style={{
                        fontSize:11, padding:"2px 7px", borderRadius:5,
                        background:"#EEEDFE", color:"#534AB7", fontWeight:500,
                      }}>{f.dept_code}</span>
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12,
                      color:"#534AB7", fontWeight:600 }}>
                      {f.research_score}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {f.publications}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {f.citations}
                    </td>
                </tr>
              ))}
              </tbody>
            </table>
            )}
          </div>

          {/* Citations trend */}
          <div style={{ ...card, flex:1 }}>
            <div style={cardTitle}>Citations Over the Years</div>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={citations_by_year}>
                <XAxis dataKey="year" tick={{ fontSize:10 }} />
                <YAxis tick={{ fontSize:10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count"
                  stroke="#27500A" strokeWidth={2} dot={{ r:3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Department Scorecard */}
        <div style={{ ...card, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:12 }}>
            <span style={cardTitle}>
              Department Scorecard & Rankings
              {deptId &&
                <span style={{ fontSize:11, color:"#534AB7",
                  marginLeft:8, fontWeight:400 }}>
                  — filtered to {selectedDept.dept_name}
                </span>}
            </span>
            <span style={{ fontSize:11, color:"#888" }}>
              Score = (Q1×4 + Pubs×2 + Citations×0.01)
            </span>
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Rank","Department","Publications","Q1 Papers",
                  "Citations","Faculty","Score"].map(h => (
                  <th key={h} style={{
                    padding:"7px 10px", fontSize:11, color:"#888",
                    textAlign:"left", borderBottom:"1px solid #eee",
                    fontWeight:500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dept_scorecard.map((d, i) => (
                <tr key={d.dept_id}
                  style={{
                    background: d.dept_id === deptId
                      ? "#EEEDFE" : i===0 ? "#FAFAFA" : "#fff",
                  }}>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{
                      fontSize:12, fontWeight:600,
                      color: i===0?"#BA7517":i===1?"#888":
                             i===2?"#A32D2D":"#aaa",
                    }}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </span>
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:13,
                    fontWeight:500, color:"#1a1a1a" }}>{d.dept_name}</td>
                  <td style={{ padding:"9px 10px", fontSize:12 }}>
                    {d.publications}
                  </td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{
                      fontSize:11, padding:"2px 7px", borderRadius:5,
                      background:"#E6F1FB", color:"#0C447C", fontWeight:500,
                    }}>{d.q1_papers} Q1</span>
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:12 }}>
                    {d.citations}
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:12 }}>
                    {d.faculty_count}
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:14,
                    fontWeight:700, color:"#534AB7" }}>{d.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Latest Publications */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:12 }}>
            <span style={cardTitle}>
              Latest Publications
              {deptId &&
                <span style={{ fontSize:11, color:"#534AB7",
                  marginLeft:8, fontWeight:400 }}>({selectedDept.dept_name})</span>}
            </span>
            <span style={{ fontSize:12, color:"#534AB7", cursor:"pointer" }}>
              View All
            </span>
          </div>
          {latest_publications.length === 0 ? (
            <div style={{ padding:"20px 0", textAlign:"center",
              color:"#aaa", fontSize:13 }}>
              No publications found for {selectedDept?.dept_name || schoolName}
            </div>
          ) : (
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {["Title","Faculty","Dept","Journal",
                  "Quartile","IF","Year"].map(h => (
                  <th key={h} style={{
                    padding:"6px 10px", fontSize:11, color:"#888",
                    textAlign:"left", borderBottom:"1px solid #eee",
                    fontWeight:500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latest_publications.map((p, i) => (
                <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                  <td style={{
                    padding:"9px 10px", fontSize:12, color:"#185FA5",
                    maxWidth:240, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>{p.title}</td>
                  <td style={{ padding:"9px 10px", fontSize:12,
                    color:"#333" }}>{p.faculty_name}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{
                      fontSize:11, padding:"2px 7px", borderRadius:5,
                      background:"#EEEDFE", color:"#534AB7", fontWeight:500,
                    }}>{p.dept_code}</span>
                  </td>
                  <td style={{
                    padding:"9px 10px", fontSize:11, color:"#555",
                    maxWidth:160, overflow:"hidden",
                    textOverflow:"ellipsis", whiteSpace:"nowrap",
                  }}>{p.journal_name}</td>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{
                      fontSize:11, padding:"2px 7px", borderRadius:5,
                      fontWeight:500,
                      background: p.quartile==="Q1"?"#E6F1FB":
                                  p.quartile==="Q2"?"#EAF3DE":"#FAEEDA",
                      color:      p.quartile==="Q1"?"#0C447C":
                                  p.quartile==="Q2"?"#27500A":"#633806",
                    }}>{p.quartile}</span>
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:12 }}>
                    {p.impact_factor || "-"}
                  </td>
                  <td style={{ padding:"9px 10px", fontSize:12 }}>
                    {p.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

      </div>
    </Layout>
  );
}

const card = {
  background:"#fff", border:"1px solid #eee",
  borderRadius:12, padding:"14px 16px",
};
const cardTitle = {
  fontSize:13, fontWeight:600, color:"#1a1a1a",
};
