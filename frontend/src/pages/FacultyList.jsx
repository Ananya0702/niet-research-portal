import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const TREND_SVG = {
  strong_up: (
    <svg width="60" height="28" viewBox="0 0 60 28">
      <polyline points="0,24 15,18 30,10 45,6 60,2"
        fill="none" stroke="#27500A" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  up: (
    <svg width="60" height="28" viewBox="0 0 60 28">
      <polyline points="0,22 20,16 40,12 60,6"
        fill="none" stroke="#27500A" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  flat: (
    <svg width="60" height="28" viewBox="0 0 60 28">
      <polyline points="0,14 20,16 40,13 60,14"
        fill="none" stroke="#888" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  down: (
    <svg width="60" height="28" viewBox="0 0 60 28">
      <polyline points="0,6 20,10 40,16 60,22"
        fill="none" stroke="#A32D2D" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
};

const STATUS_STYLE = {
  "Star Researcher":    { bg:"#FFF8E6", color:"#BA7517", icon:"⭐" },
  "Rising Researcher":  { bg:"#E6F1FB", color:"#0C447C", icon:"🚀" },
  "Consistent":         { bg:"#EAF3DE", color:"#27500A", icon:"✅" },
  "Needs Improvement":  { bg:"#FAEEDA", color:"#633806", icon:"⚠️" },
  "At Risk":            { bg:"#FCEBEB", color:"#A32D2D", icon:"🔴" },
};

const RISK_COLOR = {
  "Low":    { color:"#27500A", bg:"#EAF3DE" },
  "Medium": { color:"#633806", bg:"#FAEEDA" },
  "High":   { color:"#A32D2D", bg:"#FCEBEB" },
};

const SCORE_COLOR = s =>
  s >= 85 ? "#27500A" :
  s >= 70 ? "#0C447C" :
  s >= 55 ? "#BA7517" : "#A32D2D";

function MiniChart({ trend }) {
  return TREND_SVG[trend] || TREND_SVG.flat;
}

function ScoreArc({ score }) {
  const r   = 40;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / 100, 1);
  const dash = pct * circ * 0.75;
  const color = SCORE_COLOR(score);
  return (
    <svg width="100" height="70" viewBox="0 0 100 80">
      <circle cx="50" cy="60" r={r} fill="none" stroke="#f0f0f0"
        strokeWidth="8" strokeDasharray={`${circ*0.75} ${circ}`}
        strokeDashoffset="0" strokeLinecap="round"
        transform="rotate(-225 50 60)" />
      <circle cx="50" cy="60" r={r} fill="none" stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset="0" strokeLinecap="round"
        transform="rotate(-225 50 60)" />
      <text x="50" y="58" textAnchor="middle"
        style={{ fontSize:16, fontWeight:700, fill:color, fontFamily:"Arial" }}>
        {score}
      </text>
    </svg>
  );
}

export default function FacultyList() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [search,     setSearch]     = useState("");
  const [sortBy,     setSortBy]     = useState("ai_score");
  const [downloading,setDownloading]= useState(false);

  useEffect(() => {
    API.get("/hod/faculty-intelligence")
      .then(res => setData(res.data))
      .catch(err => { console.error(err); setData(null); })
      .finally(() => setLoading(false));
  }, []);

  const downloadExcel = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await fetch(
        "http://127.0.0.1:8000/faculty/me/report/excel",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      a.href      = url;
      a.download  = "Faculty_Report.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <Layout>
      <div style={{ padding:40, textAlign:"center" }}>
        <div className="spinner" />
        <p style={{ color:"#888", marginTop:12 }}>
          Loading Faculty Intelligence...
        </p>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <p style={{ padding:40 }}>Error loading data.</p>
    </Layout>
  );

  const { faculty_stats, dept_health, top_areas,
          top_pubs, ai_recommendations, dept_recommendations } = data;

  const filtered = faculty_stats
    .filter(f =>
      !search ||
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.designation.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => b[sortBy] - a[sortBy]);

  return (
    <Layout>

      {/* Topbar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #eee",
        padding:"12px 20px", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20, fontWeight:700, color:"#1a1a1a" }}>
              AI Faculty Intelligence Center
            </span>
            <span style={{ fontSize:16 }}>✨</span>
          </div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
            AI-Powered Insights & Performance Analytics
          </div>
        </div>
        <button onClick={downloadExcel} disabled={downloading} style={{
          background:"#27500A", color:"#fff", padding:"9px 18px",
          borderRadius:8, fontSize:13, fontWeight:500, border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", gap:6,
        }}>
          {downloading ? "⏳ Generating..." : "📥 Export Report"}
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* Department Health Overview */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:10,
            color:"#1a1a1a" }}>Department Health Overview</div>
          <div style={{ display:"grid",
            gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr 1fr",
            gap:10 }}>

            {/* 4 health cards */}
            {[
              ["👥","Total Faculty",    dept_health.total_faculty,
               "All Active Members",    "#EEEDFE","#534AB7"],
              ["⭐","High Performers",  dept_health.high_performers,
               `${Math.round(dept_health.high_performers/dept_health.total_faculty*100)}% of Faculty`,
               "#EAF3DE","#27500A"],
              ["📈","Average Performers",dept_health.avg_performers,
               `${Math.round(dept_health.avg_performers/dept_health.total_faculty*100)}% of Faculty`,
               "#E6F1FB","#0C447C"],
              ["⚠️","Need Attention",  dept_health.need_attention,
               `${Math.round(dept_health.need_attention/dept_health.total_faculty*100)}% of Faculty`,
               "#FCEBEB","#A32D2D"],
            ].map(([icon,label,val,sub,,color]) => (
              <div key={label} style={{
                background:"#fff", border:"1px solid #eee", borderRadius:12,
                padding:"14px 12px",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8,
                  marginBottom:6 }}>
                  <span style={{ fontSize:16 }}>{icon}</span>
                  <span style={{ fontSize:11, color:"#888" }}>{label}</span>
                </div>
                <div style={{ fontSize:24, fontWeight:700, color }}>
                  {val}
                </div>
                <div style={{ fontSize:10, color:"#888", marginTop:2 }}>
                  {sub}
                </div>
              </div>
            ))}

            {/* Publication Growth */}
            <div style={{ background:"#fff", border:"1px solid #eee",
              borderRadius:12, padding:"14px 12px" }}>
              <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>
                Publication Growth
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:"#27500A" }}>
                +18%
              </div>
              <div style={{ fontSize:10, color:"#888" }}>vs last year</div>
            </div>

            {/* Citation Growth */}
            <div style={{ background:"#fff", border:"1px solid #eee",
              borderRadius:12, padding:"14px 12px" }}>
              <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>
                Citation Growth
              </div>
              <div style={{ fontSize:22, fontWeight:700, color:"#0C447C" }}>
                +25%
              </div>
              <div style={{ fontSize:10, color:"#888" }}>vs last year</div>
            </div>

            {/* Overall Score */}
            <div style={{ background:"#fff", border:"1px solid #eee",
              borderRadius:12, padding:"14px 12px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#888", marginBottom:2 }}>
                Overall Health Score
              </div>
              <div style={{ fontSize:28, fontWeight:700,
                color: dept_health.dept_score >= 80 ? "#27500A" :
                       dept_health.dept_score >= 60 ? "#BA7517" : "#A32D2D" }}>
                {dept_health.dept_score}
              </div>
              <div style={{ fontSize:11, fontWeight:600,
                color:"#27500A" }}>
                {dept_health.dept_score >= 80 ? "Excellent" :
                 dept_health.dept_score >= 60 ? "Good" : "Needs Work"}
              </div>
            </div>
          </div>
        </div>

        {/* Top 3 Rankings Row */}
        <div style={{ display:"grid",
          gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:14 }}>

          {/* Top 5 by Publications */}
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginBottom:10 }}>
              <span style={ct}>Top 5 by Publications</span>
            </div>
            {[...faculty_stats].sort((a,b)=>b.publications-a.publications)
              .slice(0,5).map((f,i) => {
              const max = faculty_stats[0]?.publications || 1;
              return (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:12, marginBottom:2 }}>
                    <span style={{ color:"#185FA5", fontWeight:500 }}>
                      {f.name}
                    </span>
                    <span style={{ fontWeight:600 }}>{f.publications}</span>
                  </div>
                  <div style={{ height:6, background:"#f0f0f0",
                    borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:3,
                      background:"#534AB7",
                      width:`${f.publications/max*100}%`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 5 by Citations */}
          <div style={card}>
            <div style={{ display:"flex", justifyContent:"space-between",
              marginBottom:10 }}>
              <span style={ct}>Top 5 by Citations</span>
            </div>
            {[...faculty_stats].sort((a,b)=>b.citations-a.citations)
              .slice(0,5).map((f,i) => {
              const max = [...faculty_stats].sort((a,b)=>b.citations-a.citations)[0]?.citations || 1;
              return (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:12, marginBottom:2 }}>
                    <span style={{ color:"#185FA5", fontWeight:500 }}>
                      {f.name}
                    </span>
                    <span style={{ fontWeight:600 }}>{f.citations}</span>
                  </div>
                  <div style={{ height:6, background:"#f0f0f0",
                    borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:3,
                      background:"#27500A",
                      width:`${f.citations/max*100}%`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top 5 by h-index */}
          <div style={card}>
            <div style={{ marginBottom:10 }}>
              <span style={ct}>Top 5 by h-index</span>
            </div>
            {[...faculty_stats].sort((a,b)=>b.h_index-a.h_index)
              .slice(0,5).map((f,i) => {
              const max = [...faculty_stats].sort((a,b)=>b.h_index-a.h_index)[0]?.h_index || 1;
              return (
                <div key={i} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:12, marginBottom:2 }}>
                    <span style={{ color:"#185FA5", fontWeight:500 }}>
                      {f.name}
                    </span>
                    <span style={{ fontWeight:600 }}>{f.h_index}</span>
                  </div>
                  <div style={{ height:6, background:"#f0f0f0",
                    borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:3,
                      background:"#BA7517",
                      width:`${f.h_index/max*100}%`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top Research Areas */}
          <div style={card}>
            <div style={{ marginBottom:10 }}>
              <span style={ct}>Top Research Areas</span>
            </div>
            {top_areas.slice(0,6).map((a,i) => {
              const colors = ["#534AB7","#27500A","#0C447C","#BA7517","#A32D2D","#888"];
              return (
                <div key={i} style={{ display:"flex", alignItems:"center",
                  gap:6, marginBottom:5 }}>
                  <div style={{
                    width:10, height:10, borderRadius:"50%",
                    background:colors[i], flexShrink:0,
                  }} />
                  <span style={{ fontSize:11, flex:1 }}>{a.area}</span>
                  <span style={{ fontSize:11, color:"#888" }}>{a.percent}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Faculty Performance Intelligence Table */}
        <div style={{ ...card, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:14 }}>
            <div>
              <span style={{ fontSize:14, fontWeight:600 }}>
                Faculty Performance Intelligence
              </span>
              <span style={{ fontSize:11, color:"#888", marginLeft:8 }}>
                ⓘ AI-computed scores
              </span>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search faculty..."
                style={{
                  padding:"6px 12px", border:"1px solid #ddd",
                  borderRadius:8, fontSize:12, outline:"none",
                }} />
              <select value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={{
                  padding:"6px 12px", border:"1px solid #ddd",
                  borderRadius:8, fontSize:12, outline:"none",
                  background:"#fff",
                }}>
                <option value="ai_score">Sort: AI Score</option>
                <option value="publications">Sort: Publications</option>
                <option value="citations">Sort: Citations</option>
                <option value="h_index">Sort: h-index</option>
              </select>
            </div>
          </div>

          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f9f9f9" }}>
                {["#","Faculty","AI Score","Trend",
                  "Predicted (Papers)","Predicted (Cit.)","Predicted (h)",
                  "Risk","Status","Actions"].map(h => (
                  <th key={h} style={{
                    padding:"8px 10px", fontSize:11, color:"#888",
                    textAlign:"left", borderBottom:"1px solid #eee",
                    fontWeight:500, whiteSpace:"nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const ss = STATUS_STYLE[f.status] || STATUS_STYLE["Consistent"];
                const rc = RISK_COLOR[f.risk]     || RISK_COLOR["Low"];
                return (
                  <tr key={f.faculty_id}
                    style={{ borderBottom:"1px solid #f5f5f5" }}>
                    <td style={{ padding:"10px 10px", fontSize:12,
                      color:"#888" }}>{i+1}</td>
                    <td style={{ padding:"10px 10px" }}>
                      <div style={{ display:"flex", alignItems:"center",
                        gap:8 }}>
                        <div style={{
                          width:32, height:32, borderRadius:"50%",
                          background:"#534AB7", color:"#fff",
                          display:"flex", alignItems:"center",
                          justifyContent:"center", fontSize:11,
                          fontWeight:700, flexShrink:0,
                        }}>{f.initials}</div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:600,
                            color:"#185FA5" }}>{f.name}</div>
                          <div style={{ fontSize:10, color:"#888" }}>
                            {f.designation}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:"10px 10px" }}>
                      <div style={{ fontSize:18, fontWeight:700,
                        color: SCORE_COLOR(f.ai_score) }}>
                        {f.ai_score}
                      </div>
                    </td>
                    <td style={{ padding:"10px 10px" }}>
                      <MiniChart trend={f.trend} />
                    </td>
                    <td style={{ padding:"10px 10px", fontSize:12,
                      color:"#27500A", fontWeight:600 }}>
                      +{f.pubs_2024 > 0 ? Math.ceil(f.pubs_2024 * 1.2) : 1}
                    </td>
                    <td style={{ padding:"10px 10px", fontSize:12,
                      color:"#0C447C", fontWeight:600 }}>
                      +{Math.ceil((f.citations || 0) * 0.18)}
                    </td>
                    <td style={{ padding:"10px 10px", fontSize:12,
                      color:"#BA7517", fontWeight:600 }}>
                      +{f.h_index > 0 ? 1 : 0}
                    </td>
                    <td style={{ padding:"10px 10px" }}>
                      <span style={{
                        fontSize:11, padding:"3px 8px", borderRadius:10,
                        fontWeight:500, background:rc.bg, color:rc.color,
                      }}>{f.risk}</span>
                    </td>
                    <td style={{ padding:"10px 10px" }}>
                      <span style={{
                        fontSize:11, padding:"3px 8px", borderRadius:10,
                        fontWeight:500, background:ss.bg, color:ss.color,
                        whiteSpace:"nowrap",
                      }}>
                        {ss.icon} {f.status}
                      </span>
                    </td>
                    <td style={{ padding:"10px 10px" }}>
                      <button onClick={() => setSelected(f)} style={{
                        fontSize:11, background:"#E6F1FB", color:"#0C447C",
                        padding:"4px 12px", borderRadius:6,
                        border:"none", cursor:"pointer",
                      }}>View</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Row */}
        <div style={{ display:"grid",
          gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>

          {/* Top Publications */}
          <div style={card}>
            <div style={{ marginBottom:10 }}>
              <span style={ct}>Top 5 Publications</span>
            </div>
            {top_pubs.map((p, i) => (
              <div key={i} style={{
                padding:"8px 0", borderBottom:"1px solid #f5f5f5",
              }}>
                <div style={{ fontSize:12, color:"#185FA5",
                  marginBottom:2, fontWeight:500,
                  overflow:"hidden", textOverflow:"ellipsis",
                  whiteSpace:"nowrap" }}>
                  {p.title}
                </div>
                <div style={{ display:"flex", justifyContent:"space-between",
                  fontSize:11, color:"#888" }}>
                  <span>{p.faculty_name}</span>
                  <span style={{ color:"#534AB7", fontWeight:600 }}>
                    {p.citations} cit.
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* AI Alerts & Recommendations */}
          <div style={card}>
            <div style={{ marginBottom:10 }}>
              <span style={ct}>AI Alerts & Recommendations</span>
            </div>
            {ai_recommendations.slice(0,4).map((f, i) => (
              <div key={i} style={{
                display:"flex", gap:10, padding:"8px 0",
                borderBottom:"1px solid #f5f5f5",
              }}>
                <div style={{ fontSize:18, flexShrink:0 }}>
                  {f.risk === "High" ? "🔴" : "⚠️"}
                </div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600,
                    color:"#1a1a1a" }}>{f.name}</div>
                  <div style={{ fontSize:11, color:"#555", marginTop:2 }}>
                    {f.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Recommendations */}
          <div style={card}>
            <div style={{ marginBottom:10 }}>
              <span style={ct}>Department Recommendations 🎯</span>
            </div>
            {dept_recommendations.map((r, i) => (
              <div key={i} style={{
                display:"flex", gap:8, padding:"6px 0",
                borderBottom:"1px solid #f5f5f5", fontSize:12, color:"#333",
              }}>
                <span style={{ color:"#27500A", fontWeight:700 }}>✓</span>
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Faculty Detail Modal */}
      {selected && (
        <div style={{
          position:"fixed", top:0, left:0, right:0, bottom:0,
          background:"rgba(0,0,0,0.5)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:100,
        }}>
          <div style={{
            background:"#fff", borderRadius:14, padding:"24px 28px",
            width:460, maxHeight:"85vh", overflowY:"auto",
          }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:40, height:40, borderRadius:"50%",
                  background:"#534AB7", color:"#fff",
                  display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:14, fontWeight:700,
                }}>{selected.initials}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700 }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize:11, color:"#888" }}>
                    {selected.designation}
                  </div>
                </div>
              </div>
              <span style={{ cursor:"pointer", color:"#888", fontSize:22 }}
                onClick={() => setSelected(null)}>×</span>
            </div>

            {/* AI Score Arc */}
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <ScoreArc score={selected.ai_score} />
              <div style={{ fontSize:12, color:"#888" }}>AI Score</div>
              <span style={{
                fontSize:11, padding:"3px 10px", borderRadius:10,
                background: STATUS_STYLE[selected.status]?.bg || "#eee",
                color:      STATUS_STYLE[selected.status]?.color || "#333",
                fontWeight:500,
              }}>
                {STATUS_STYLE[selected.status]?.icon} {selected.status}
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display:"grid",
              gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14 }}>
              {[
                ["Publications", selected.publications, "#534AB7"],
                ["Citations",    selected.citations,    "#0C447C"],
                ["h-index",      selected.h_index,      "#27500A"],
                ["i10-index",    selected.i10_index,    "#BA7517"],
                ["Q1 Papers",    selected.q1_count,     "#085041"],
                ["Q1 %",         selected.q1_percent+"%","#A32D2D"],
              ].map(([l,v,c]) => (
                <div key={l} style={{
                  background:"#f9f9f9", borderRadius:8, padding:"10px",
                  textAlign:"center",
                }}>
                  <div style={{ fontSize:18, fontWeight:700, color:c }}>
                    {v}
                  </div>
                  <div style={{ fontSize:10, color:"#888" }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Trend */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>
                Publication Trend
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <MiniChart trend={selected.trend} />
                <div style={{ fontSize:12, color:"#555" }}>
                  {selected.pubs_2023} papers in 2023 →{" "}
                  {selected.pubs_2024} papers in 2024
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div style={{
              background:"#E6F1FB", borderRadius:8,
              padding:"12px 14px", marginBottom:16,
            }}>
              <div style={{ fontSize:12, fontWeight:600,
                color:"#0C447C", marginBottom:4 }}>
                🤖 AI Recommendation
              </div>
              <div style={{ fontSize:12, color:"#333" }}>
                {selected.recommendation}
              </div>
            </div>

            <button onClick={() => setSelected(null)} style={{
              width:"100%", padding:10, background:"#534AB7",
              color:"#fff", borderRadius:8, fontSize:13,
              fontWeight:500, border:"none", cursor:"pointer",
            }}>Close</button>
          </div>
        </div>
      )}

    </Layout>
  );
}

const card = {
  background:"#fff", border:"1px solid #eee",
  borderRadius:12, padding:"14px 16px",
};
const ct = { fontSize:13, fontWeight:600, color:"#1a1a1a" };