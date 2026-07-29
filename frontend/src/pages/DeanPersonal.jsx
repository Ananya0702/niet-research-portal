import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const A_COLORS = ["#534AB7","#185FA5","#0F6E56","#BA7517","#A32D2D","#888780"];

export default function DeanPersonal() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem("faculty_id");
    API.get(`/faculty/${id}/dashboard`)
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ padding:40, textAlign:"center" }}>
        <div className="spinner" />
        <p style={{ color:"#888", marginTop:12 }}>Loading personal research...</p>
      </div>
    </Layout>
  );

  if (!data) return null;

  const { faculty, kpis, publications_by_year, citations_by_year,
          quartile_breakdown, research_areas, recent_publications,
          achievements } = data;

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
            My Personal Research Profile
          </div>
          <div style={{ fontSize:12, color:"#888", marginTop:2 }}>
            {faculty.name} · {faculty.designation} · Personal research metrics
          </div>
        </div>
        <div style={{
          fontSize:11, background:"#EAF3DE", color:"#27500A",
          padding:"5px 12px", borderRadius:20, fontWeight:500,
        }}>👤 Personal View</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* KPI Cards */}
        <div style={{
          display:"grid", gridTemplateColumns:"repeat(6,1fr)",
          gap:10, marginBottom:14,
        }}>
          {[
            ["📄","Total Publications",    kpis.total_publications,    "#EEEDFE"],
            ["📚","Publications This Year",kpis.publications_this_year,"#E6F1FB"],
            ["💬","Total Citations",        kpis.total_citations?.toLocaleString(),"#EAF3DE"],
            ["📈","h-index",               kpis.h_index,               "#FAEEDA"],
            ["👥","i10-index",             kpis.i10_index,             "#E1F5EE"],
            ["🎯","Avg Impact Factor",     kpis.avg_impact_factor,     "#FCEBEB"],
          ].map(([icon,label,value,bg]) => (
            <div key={label} style={{
              background:"#fff", border:"1px solid #eee", borderRadius:12,
              padding:"14px 16px", display:"flex", alignItems:"center", gap:12,
            }}>
              <div style={{
                width:42, height:42, borderRadius:10, background:bg,
                display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:19,
              }}>{icon}</div>
              <div>
                <div style={{ fontSize:11, color:"#888" }}>{label}</div>
                <div style={{ fontSize:20, fontWeight:600 }}>{value ?? "—"}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr",
          gap:10, marginBottom:14,
        }}>
          <div style={card}>
            <div style={ct}>Publications Over the Years</div>
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

          <div style={card}>
            <div style={ct}>Publications by Quartile</div>
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
                      background: Q_COLORS[q.quartile] || "#aaa",
                    }} />
                    <span style={{ fontSize:12, width:28 }}>{q.quartile}</span>
                    <span style={{ fontSize:12, color:"#888" }}>{q.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={ct}>Citations Over the Years</div>
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

        {/* Bottom Row */}
        <div style={{ display:"flex", gap:10 }}>

          {/* Recent Publications */}
          <div style={{ ...card, flex:2 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:12 }}>
              <span style={ct}>My Publications</span>
              <span style={{ fontSize:12, color:"#534AB7",
                cursor:"pointer" }}
                onClick={() => window.location.href="/publications"}>
                View All →
              </span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr>
                  {["Title","Journal","Year","Quartile","IF","Citations"].map(h => (
                    <th key={h} style={{
                      padding:"6px 8px", fontSize:11, color:"#888",
                      textAlign:"left", borderBottom:"1px solid #eee",
                      fontWeight:500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent_publications.length === 0 ? (
                  <tr><td colSpan={6} style={{
                    padding:"30px", textAlign:"center", color:"#aaa", fontSize:13,
                  }}>
                    No publications yet. Click Sync Google Scholar to import your papers.
                  </td></tr>
                ) : recent_publications.map(p => (
                  <tr key={p.pub_id}>
                    <td style={{
                      padding:"8px 8px", fontSize:12, color:"#185FA5",
                      maxWidth:200, overflow:"hidden",
                      textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>{p.title}</td>
                    <td style={{
                      padding:"8px 8px", fontSize:11, color:"#555",
                      maxWidth:130, overflow:"hidden",
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
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {p.impact_factor}
                    </td>
                    <td style={{ padding:"8px 8px", fontSize:12 }}>
                      {p.citations_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Research Areas */}
          <div style={{ ...card, flex:1 }}>
            <div style={ct}>My Research Areas</div>
            <div style={{ marginTop:12 }}>
              {research_areas.length === 0 ? (
                <div style={{ color:"#aaa", fontSize:12, padding:"20px 0",
                  textAlign:"center" }}>
                  Sync Scholar to populate research areas
                </div>
              ) : research_areas.slice(0,6).map((a, i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex",
                    justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:12 }}>{a.area}</span>
                    <span style={{ fontSize:12, color:"#888" }}>{a.percent}%</span>
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

          {/* Achievements */}
          {achievements.length > 0 && (
            <div style={{ ...card, flex:1 }}>
              <div style={ct}>My Achievements</div>
              <div style={{ marginTop:12 }}>
                {achievements.map((a, i) => (
                  <div key={i} style={{
                    display:"flex", gap:10, alignItems:"flex-start",
                    padding:"7px 0", borderBottom:"1px solid #f0f0f0",
                  }}>
                    <div style={{
                      width:30, height:30, borderRadius:7, flexShrink:0,
                      display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:14,
                      background: a.category==="Award"?"#FAEEDA":
                                  a.category==="Grant"?"#EAF3DE":"#EEEDFE",
                    }}>
                      {a.category==="Award"?"🏆":
                       a.category==="Grant"?"💰":"💡"}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:500 }}>
                        {a.title}
                      </div>
                      <div style={{ fontSize:11, color:"#888", marginTop:1 }}>
                        {a.issuer} · {a.year}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
const ct = {
  fontSize:13, fontWeight:600, color:"#1a1a1a", marginBottom:0,
};