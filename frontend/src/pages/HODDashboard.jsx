import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const F_COLORS = {
  "Govt. Grants":      "#0C447C",
  "Industry Sponsored":"#27500A",
  "Institute Funding": "#BA7517",
  "Others":            "#A32D2D",
};
const A_COLORS = ["#534AB7","#185FA5","#0F6E56","#BA7517","#A32D2D","#888780"];

function KPICard({ icon, label, value, sub, bg }) {
  return (
    <div style={{
      background:"#fff", border:"1px solid #eee", borderRadius:12,
      padding:"14px 16px", display:"flex", alignItems:"center", gap:14,
    }}>
      <div style={{
        width:44, height:44, borderRadius:10, background:bg,
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:20,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize:11, color:"#888" }}>{label}</div>
        <div style={{ fontSize:22, fontWeight:600, lineHeight:1.2 }}>{value ?? "—"}</div>
        {sub && <div style={{ fontSize:11, color:"#888", marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// Read-only locked filter chip
function LockedChip({ label, value }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
      <div style={{
        padding:"7px 14px", borderRadius:8, border:"1px solid #ddd",
        fontSize:12, background:"#f5f5f5", color:"#555", fontWeight:500,
        maxWidth:280, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
      }}>{value}</div>
      <span title={`${label} locked to your scope`} style={{ fontSize:12, color:"#888", cursor:"help" }}>🔒</span>
    </div>
  );
}

export default function HODDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/hod/dashboard")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ padding:40, textAlign:"center" }}>
        <div className="spinner" />
        <p style={{ color:"#888", marginTop:12 }}>Loading HOD Dashboard...</p>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <p style={{ padding:40, color:"red" }}>Error loading HOD data.</p>
    </Layout>
  );

  const {
    scope, kpis, publications_by_year, citations_by_year,
    quartile_breakdown, research_areas, top_faculty,
    funding_overview, recent_publications, dept_at_glance,
  } = data;

  const g = kpis.growth || {};
  const growthStr = (pct, abs) =>
    pct === null || pct === undefined ? "" :
    `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last year${abs && abs !== 0 ? ` (${abs >= 0 ? "+" : ""}${abs})` : ""}`;

  const schoolName = scope?.school_name || "Your School";
  const deptName   = scope?.dept_name   || "";

  return (
    <Layout>

      {/* Topbar */}
      <div style={{
        background:"#fff", borderBottom:"1px solid #eee",
        padding:"12px 20px", flexShrink:0,
        display:"flex", justifyContent:"space-between", alignItems:"center",
      }}>
        <div>
          <div style={{ fontSize:18, fontWeight:600 }}>HOD Dashboard</div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
            {deptName} Department · Academic Year {new Date().getFullYear()}
          </div>
        </div>

        {/* Locked Scope Filters */}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#888" }}>Scope:</span>
          <LockedChip label="School" value={schoolName} />
          <LockedChip label="Department" value={deptName || "—"} />
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* Scope info banner */}
        <div style={{
          background:"#EEEDFE", border:"1px solid #534AB7",
          borderRadius:8, padding:"8px 14px", marginBottom:12,
          fontSize:12, color:"#534AB7", display:"flex",
          alignItems:"center", gap:8,
        }}>
          🔍 Showing data for: <strong>{deptName || "your department"}</strong>
          <span style={{ color:"#888", marginLeft:4 }}>
            ({schoolName}) — access locked to your assigned department
          </span>
        </div>

        {/* KPI Cards */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(6,1fr)",
          gap:10, marginBottom:14,
        }}>
          <KPICard icon="📄" label="Total Publications"
            value={kpis.total_publications}
            sub={growthStr(g.publications, g.publications_abs)} bg="#EEEDFE" />
          <KPICard icon="📚" label="This Year"
            value={kpis.publications_this_year}
            sub={growthStr(g.publications, g.publications_abs)} bg="#E6F1FB" />
          <KPICard icon="💬" label="Total Citations"
            value={kpis.total_citations?.toLocaleString()}
            sub={growthStr(g.citations)} bg="#EAF3DE" />
          <KPICard icon="👥" label="Active Faculty"
            value={kpis.active_faculty}
            sub={`of ${kpis.total_faculty}`} bg="#FAEEDA" />
          <KPICard icon="🎓" label="PhD Faculty"
            value={kpis.phd_faculty}
            sub={`${kpis.phd_percent ?? "—"}% of faculty`} bg="#E1F5EE" />
          <KPICard icon="💰" label="Research Funding"
            value={`₹${kpis.total_funding_lakhs}L`}
            sub={`${funding_overview?.length ?? 0} funding sources`} bg="#FCEBEB" />
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

          {/* Quartile donut */}
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
                    display:"flex", alignItems:"center", gap:6, marginBottom:5,
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

          {/* Citations trend */}
          <div style={card}>
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

        {/* Middle Row */}
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>

          {/* Top Faculty */}
          <div style={{ ...card, flex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:12 }}>
              <span style={cardTitle}>Top Performing Faculty</span>
              <span style={{ fontSize:12, color:"#534AB7", cursor:"pointer" }}>
                View All
              </span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["#","Faculty","Publications","Citations","h-index","Score"].map(h => (
                    <th key={h} style={{
                      padding:"6px 8px", fontSize:11, color:"#888",
                      textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top_faculty.map((f, i) => (
                  <tr key={f.faculty_id}>
                    <td style={{ padding:"8px 8px", fontSize:12, color:"#888" }}>
                      {i + 1}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12,
                      color:"#185FA5", fontWeight:500 }}>{f.name}</td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {f.publications}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {f.citations}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {f.h_index}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12,
                      color:"#534AB7", fontWeight:600 }}>
                      {f.research_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Research Areas */}
          <div style={{ ...card, flex:1 }}>
            <div style={cardTitle}>Research Areas Contribution</div>
            <div style={{ marginTop:12 }}>
              {research_areas.slice(0, 6).map((a, i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",
                    justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:12 }}>{a.area}</span>
                    <span style={{ fontSize:12, color:"#888" }}>
                      {a.pub_count} ({a.percent}%)
                    </span>
                  </div>
                  <div style={{ height:5, background:"#f0f0f0",
                    borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:3,
                      width:`${a.percent}%`,
                      background: A_COLORS[i] || "#888",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Funding Overview */}
          <div style={{ ...card, flex:1 }}>
            <div style={cardTitle}>Research Funding Overview</div>
            <div style={{ display:"flex", justifyContent:"center", margin:"12px 0" }}>
              <PieChart width={120} height={120}>
                <Pie data={funding_overview} dataKey="amount"
                  nameKey="type" innerRadius={35} outerRadius={55}>
                  {funding_overview.map((entry, i) => (
                    <Cell key={i}
                      fill={F_COLORS[entry.type] || A_COLORS[i] || "#aaa"} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `₹${v}L`} />
              </PieChart>
            </div>
            {funding_overview.map((f, i) => (
              <div key={i} style={{ display:"flex",
                justifyContent:"space-between", alignItems:"center",
                marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{
                    width:8, height:8, borderRadius:2, flexShrink:0,
                    background: F_COLORS[f.type] || A_COLORS[i],
                  }} />
                  <span style={{ fontSize:11, color:"#555" }}>{f.type}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:600,
                  color:"#1a1a1a" }}>₹{f.amount}L</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display:"flex", gap:10 }}>

          {/* Recent Publications */}
          <div style={{ ...card, flex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:12 }}>
              <span style={cardTitle}>Recent Publications (Department)</span>
              <span style={{ fontSize:12, color:"#534AB7",
                cursor:"pointer" }}>View All</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Title","Journal","Year","Quartile","IF"].map(h => (
                    <th key={h} style={{
                      padding:"6px 8px", fontSize:11, color:"#888",
                      textAlign:"left", borderBottom:"1px solid #eee",
                      fontWeight:500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent_publications.map(p => (
                  <tr key={p.pub_id}>
                    <td style={{
                      padding:"8px 8px", fontSize:12, color:"#185FA5",
                      maxWidth:220, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>{p.title}</td>
                    <td style={{
                      padding:"8px 8px", fontSize:11, color:"#555",
                      maxWidth:140, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>{p.journal_name}</td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>{p.year}</td>
                    <td style={{ padding:"8px 8px" }}>
                      <span style={{
                        fontSize:11, padding:"2px 7px", borderRadius:5,
                        fontWeight:500,
                        background: p.quartile==="Q1"?"#E6F1FB":
                                    p.quartile==="Q2"?"#EAF3DE":"#FAEEDA",
                        color:      p.quartile==="Q1"?"#0C447C":
                                    p.quartile==="Q2"?"#27500A":"#633806",
                      }}>{p.quartile}</span>
                    </td>
                    <td style={{ padding:"8px 8px",
                      fontSize:12 }}>{p.impact_factor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Department at a Glance */}
          <div style={{ ...card, flex:1 }}>
            <div style={cardTitle}>Department at a Glance</div>
            <div style={{ marginTop:12 }}>
              {[
                ["👥","Total Faculty",      dept_at_glance.total_faculty],
                ["🎓","PhD Faculty",        dept_at_glance.phd_faculty],
                ["💼","Ongoing Projects",   dept_at_glance.ongoing_projects],
                ["💡","Patents Filed",      dept_at_glance.patents_filed],
                ["🤝","Collaborations",     dept_at_glance.collaborations],
                ["📋","Workshops/Seminars", dept_at_glance.workshops],
              ].map(([icon, label, value]) => (
                <div key={label} style={{
                  display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"8px 0",
                  borderBottom:"1px solid #f0f0f0",
                }}>
                  <span style={{ fontSize:12, color:"#555" }}>
                    {icon} {label}
                  </span>
                  <span style={{ fontSize:13, fontWeight:600,
                    color:"#1a1a1a" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
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
