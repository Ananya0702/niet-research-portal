import { useEffect, useState } from "react";
import API from "../services/api";
import Layout from "../components/Layout";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const D_COLORS = ["#534AB7","#0C447C","#27500A","#BA7517","#A32D2D","#088780","#888780"];

const SCHOOL_DEPT_MAP = {
  "School of CS & IT (SCSIT)": [
    { code: "CSE",  name: "Computer Science & Engineering" },
    { code: "IT",   name: "Information Technology" },
  ],
  "School of Emerging (SCSET)": [
    { code: "CS",    name: "Computer Science" },
    { code: "AI_DS", name: "Data Science" },
    { code: "CYS",   name: "Cyber Security" },
    { code: "MNC",   name: "Mathematics & Computing" },
    { code: "CSBS",  name: "Computer Science & Business Systems" },
    { code: "AI",    name: "Artificial Intelligence" },
    { code: "AIML",  name: "Artificial Intelligence & Machine Learning" },
    { code: "IoT",   name: "Internet of Things" },
  ],
  "School of Electronics": [
    { code: "ECE",  name: "Electronics & Communication Engineering" },
    { code: "EEE",  name: "Electrical & Electronics Engineering" },
    { code: "VLSI", name: "VLSI Design" },
  ],
  "School of Bio": [
    { code: "BT",   name: "Biotechnology" },
  ],
  "School of Mechanical Engineering": [
    { code: "ME",   name: "Mechanical Engineering" },
  ],
  "School of Management": [
    { code: "MBA",  name: "Master of Business Administration" },
  ],
  "School of Humanity & Applied Sciences": [
    { code: "APPLIED", name: "Humanities & Applied Sciences" },
  ],
  "School of Computer Applications": [
    { code: "MCA",  name: "Master of Computer Applications" },
  ],
};

const SCHOOLS = Object.keys(SCHOOL_DEPT_MAP);

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

export default function DeanDashboard() {
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [selectedSchool, setSelectedSchool] = useState("All Schools");
  const [selectedDept,   setSelectedDept]   = useState("All Departments");

  useEffect(() => {
    API.get("/dean/dashboard")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ padding:40, textAlign:"center" }}>
        <div className="spinner" />
        <p style={{ color:"#888", marginTop:12 }}>Loading Dean Dashboard...</p>
      </div>
    </Layout>
  );

  if (!data) return (
    <Layout>
      <p style={{ padding:40, color:"red" }}>Error loading data.</p>
    </Layout>
  );

  const {
    kpis, publications_by_year, citations_by_year,
    quartile_breakdown, publications_by_dept,
    top_faculty, dept_scorecard, latest_publications,
  } = data;

  // ── School & Department Hierarchy ──────────────────────────────────────
  const handleSchoolChange = (school) => {
    setSelectedSchool(school);
    setSelectedDept("All Departments");
  };

  const deptOptions = selectedSchool === "All Schools"
    ? Object.values(SCHOOL_DEPT_MAP).flat()
    : SCHOOL_DEPT_MAP[selectedSchool] || [];

  const activeDeptCode = selectedDept === "All Departments"
    ? null
    : Object.values(SCHOOL_DEPT_MAP).flat()
        .find(d => d.name === selectedDept)?.code || null;

  // ── Filter helpers ──────────────────────────────────────────────────────
  const filteredFaculty = !activeDeptCode
    ? top_faculty
    : top_faculty.filter(f => f.dept_code === activeDeptCode);

  const filteredScorecard = !activeDeptCode
    ? dept_scorecard
    : dept_scorecard.filter(d => d.dept_code === activeDeptCode);

  const filteredPubs = !activeDeptCode
    ? latest_publications
    : latest_publications.filter(p => p.dept_code === activeDeptCode);

  // KPIs for selected dept
  const deptKpis = !activeDeptCode ? kpis : (() => {
    const sc = dept_scorecard.find(d => d.dept_code === activeDeptCode);
    return sc ? {
      total_publications:     sc.publications,
      publications_this_year: filteredPubs.filter(p => p.year === new Date().getFullYear()).length,
      total_citations:        sc.citations,
      active_faculty:         sc.faculty_count,
      inst_h_index:           kpis.inst_h_index,
      avg_impact_factor:      kpis.avg_impact_factor,
    } : kpis;
  })();

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
            {!activeDeptCode
              ? `Overview of research performance across all departments · ${new Date().getFullYear()}`
              : `Showing data for ${selectedDept} · ${new Date().getFullYear()}`}
          </div>
        </div>

        {/* School & Department Filters */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, color:"#888" }}>Filter by:</span>
          
          {/* School Dropdown */}
          <select
            value={selectedSchool}
            onChange={e => handleSchoolChange(e.target.value)}
            style={{
              padding:"7px 14px", borderRadius:20,
              border:"1px solid #ddd", fontSize:12,
              fontWeight:500, color:"#534AB7",
              background:"#EEEDFE", cursor:"pointer",
              outline:"none",
            }}>
            <option value="All Schools">All Schools</option>
            {SCHOOLS.map(school => (
              <option key={school} value={school}>
                {school}
              </option>
            ))}
          </select>

          {/* Department Dropdown */}
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            style={{
              padding:"7px 14px", borderRadius:20,
              border:"1px solid #ddd", fontSize:12,
              fontWeight:500, color:"#534AB7",
              background:"#EEEDFE", cursor:"pointer",
              outline:"none",
            }}>
            <option value="All Departments">All Departments</option>
            {deptOptions.map(dept => (
              <option key={dept.code} value={dept.name}>
                {dept.code} — {dept.name}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(selectedSchool !== "All Schools" || selectedDept !== "All Departments") && (
            <span
              onClick={() => {
                setSelectedSchool("All Schools");
                setSelectedDept("All Departments");
              }}
              style={{
                fontSize:11, color:"#A32D2D", cursor:"pointer",
                background:"#FCEBEB", padding:"4px 10px",
                borderRadius:12, fontWeight:500,
              }}>✕ Clear</span>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* KPI Cards */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(6,1fr)",
          gap:10, marginBottom:14,
        }}>
          <KPICard icon="📄" label="Total Publications"
            value={deptKpis.total_publications}
            sub="↑ 18.6% vs 2023" bg="#EEEDFE" />
          <KPICard icon="📚" label="Publications This Year"
            value={deptKpis.publications_this_year}
            sub="↑ 22.4% vs 2023" bg="#E6F1FB" />
          <KPICard icon="💬" label="Total Citations"
            value={deptKpis.total_citations?.toLocaleString()}
            sub="↑ 20.1% vs 2023" bg="#EAF3DE" />
          <KPICard icon="👥" label="Active Faculty"
            value={deptKpis.active_faculty}
            sub={!activeDeptCode ? "across all depts" : selectedDept}
            bg="#FAEEDA" />
          <KPICard icon="🏆" label="h-index (Institution)"
            value={deptKpis.inst_h_index}
            sub="↑ 6 vs 2023" bg="#E1F5EE" />
          <KPICard icon="🎯" label="Avg Impact Factor"
            value={deptKpis.avg_impact_factor}
            sub="↑ 0.35 vs 2023" bg="#FCEBEB" />
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
                      opacity={
                        !activeDeptCode || activeDeptCode === d.dept
                          ? 1 : 0.25
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n, p) => [v, p.payload.dept]} />
              </PieChart>
              <div>
                {publications_by_dept.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const dept = Object.values(SCHOOL_DEPT_MAP).flat()
                        .find(x => x.code === d.dept);
                      if (dept) setSelectedDept(dept.name);
                    }}
                    style={{
                      display:"flex", alignItems:"center",
                      gap:5, marginBottom:4, cursor:"pointer",
                      opacity: !activeDeptCode || activeDeptCode === d.dept
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
                {activeDeptCode &&
                  <span style={{ fontSize:11, color:"#534AB7",
                    marginLeft:8, fontWeight:400 }}>
                    ({selectedDept})
                  </span>}
              </span>
              {activeDeptCode && (
                <span onClick={() => {
                  setSelectedSchool("All Schools");
                  setSelectedDept("All Departments");
                }} style={{
                  fontSize:11, color:"#534AB7", cursor:"pointer",
                }}>Show All</span>
              )}
            </div>
            {filteredFaculty.length === 0 ? (
              <div style={{ padding:"20px 0", textAlign:"center",
                color:"#aaa", fontSize:13 }}>
                No faculty data for {selectedDept}
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
                {filteredFaculty.map((f, i) => (
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
              {activeDeptCode &&
                <span style={{ fontSize:11, color:"#534AB7",
                  marginLeft:8, fontWeight:400 }}>
                  — filtered to {selectedDept}
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
              {filteredScorecard.map((d, i) => {
                const rank = activeDeptCode ? dept_scorecard.findIndex(x => x.dept_id === d.dept_id) + 1 : i + 1;
                return (
                <tr key={d.dept_id}
                  style={{
                    background: d.dept_code === activeDeptCode
                      ? "#EEEDFE" : i===0 ? "#FAFAFA" : "#fff",
                  }}>
                  <td style={{ padding:"9px 10px" }}>
                    <span style={{
                      fontSize:12, fontWeight:600,
                      color: i===0?"#BA7517":i===1?"#888":
                             i===2?"#A32D2D":"#aaa",
                    }}>
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
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
              );
              })}
            </tbody>
          </table>
        </div>

        {/* Latest Publications */}
        <div style={card}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"center", marginBottom:12 }}>
            <span style={cardTitle}>
              Latest Publications
              {activeDeptCode &&
                <span style={{ fontSize:11, color:"#534AB7",
                  marginLeft:8, fontWeight:400 }}>({selectedDept})</span>}
            </span>
            <span style={{ fontSize:12, color:"#534AB7", cursor:"pointer" }}>
              View All
            </span>
          </div>
          {filteredPubs.length === 0 ? (
            <div style={{ padding:"20px 0", textAlign:"center",
              color:"#aaa", fontSize:13 }}>
              No publications found for {selectedDept}
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
              {filteredPubs.map((p, i) => (
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
                    {p.impact_factor}
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