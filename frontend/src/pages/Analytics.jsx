import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from "recharts";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const T_COLORS = ["#534AB7","#185FA5","#0F6E56","#BA7517","#A32D2D","#088780","#888780","#993556"];
const I_COLORS = { SCI:"#0C447C", SCIE:"#27500A", Scopus:"#BA7517", "UGC Care":"#534AB7", None:"#aaa" };

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: "16px 18px", flex: 1,
    }}>
      <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || "#1a1a1a" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/faculty/me/analytics")
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div style={{ padding: 40, textAlign: "center" }}>
        <div className="spinner" />
        <p style={{ color: "#888", marginTop: 12 }}>Loading analytics...</p>
      </div>
    </Layout>
  );

  if (!data) return null;

  const { summary, publications_by_year, quartile_trend,
          citations_by_year, indexing_breakdown, topic_breakdown } = data;

  return (
    <Layout>
      {/* Topbar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", flexShrink: 0,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Analytics</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          Deep dive into your research performance
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* Summary Cards */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <StatCard label="Total Publications" value={summary.total_publications} sub="All time" color="#534AB7" />
          <StatCard label="Q1 Publications"    value={summary.q1_publications}    sub={`${summary.q1_percent}% of total`} color="#0C447C" />
          <StatCard label="Total Citations"     value={summary.total_citations?.toLocaleString()} sub="All time" color="#27500A" />
          <StatCard label="Avg Impact Factor"   value={summary.avg_impact_factor ?? "N/A"} sub="Across all papers" color="#BA7517" />
          <StatCard label="Years Active"         value={summary.years_active}      sub="Years with publications" color="#085041" />
        </div>

        {/* Row 1 — Line charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div style={card}>
            <div style={cardTitle}>Publications Per Year</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={publications_by_year}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#534AB7"
                  strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={card}>
            <div style={cardTitle}>Citations Per Year</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={citations_by_year}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#27500A"
                  strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2 — Quartile trend stacked bar */}
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={cardTitle}>Publication Quality Trend — Quartile Breakdown Per Year</div>
          <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
            Ideally Q1 (blue) should grow over time — higher = better journal quality
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={quartile_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Q1" stackId="a" fill={Q_COLORS.Q1} />
              <Bar dataKey="Q2" stackId="a" fill={Q_COLORS.Q2} />
              <Bar dataKey="Q3" stackId="a" fill={Q_COLORS.Q3} />
              <Bar dataKey="Q4" stackId="a" fill={Q_COLORS.Q4} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3 — Indexing + Topic */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

          <div style={card}>
            <div style={cardTitle}>Publications by Indexing Type</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
              <PieChart width={140} height={140}>
                <Pie data={indexing_breakdown} dataKey="count"
                  nameKey="indexing" innerRadius={40} outerRadius={62}>
                  {indexing_breakdown.map((entry, i) => (
                    <Cell key={i}
                      fill={I_COLORS[entry.indexing] || T_COLORS[i] || "#aaa"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
              <div style={{ flex: 1 }}>
                {indexing_breakdown.map((d, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "5px 0",
                    borderBottom: "1px solid #f5f5f5",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                        background: I_COLORS[d.indexing] || T_COLORS[i],
                      }} />
                      <span style={{ fontSize: 12 }}>{d.indexing}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600,
                      color: "#1a1a1a" }}>{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>Publications by Research Topic (ML-classified)</div>
            <div style={{ marginTop: 12 }}>
              {topic_breakdown.slice(0, 8).map((t, i) => {
                const max = topic_breakdown[0]?.count || 1;
                const pct = Math.round(t.count / max * 100);
                return (
                  <div key={i} style={{ marginBottom: 9 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      marginBottom: 3 }}>
                      <span style={{ fontSize: 12 }}>{t.topic}</span>
                      <span style={{ fontSize: 12, color: "#888" }}>{t.count}</span>
                    </div>
                    <div style={{ height: 5, background: "#f0f0f0",
                      borderRadius: 3, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${pct}%`,
                        background: T_COLORS[i] || "#888",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

const card = {
  background: "#fff", border: "1px solid #eee",
  borderRadius: 12, padding: "14px 16px",
};
const cardTitle = {
  fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4,
};