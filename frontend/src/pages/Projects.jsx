import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = {
  title: "", sponsor_type: "Govt. Grants", sponsor_name: "",
  amount_lakhs: "", status: "Ongoing",
  start_date: "", end_date: "",
};

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const fetchProjects = () => {
    const id = localStorage.getItem("faculty_id");
    API.get(`/faculty/${id}/dashboard`)
      .then(res => setProjects(res.data.projects || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchProjects(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const id = localStorage.getItem("faculty_id");
      await API.post("/projects/", {
        ...form,
        faculty_id:   parseInt(id),
        amount_lakhs: parseFloat(form.amount_lakhs) || 0,
      });
      setModal(false);
      setForm(EMPTY);
      fetchProjects();
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (s) =>
    s === "Ongoing"   ? { bg: "#EAF3DE", color: "#27500A" } :
    s === "Completed" ? { bg: "#E6F1FB", color: "#0C447C" } :
                        { bg: "#FAEEDA", color: "#633806" };

  return (
    <Layout>
      {/* Topbar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Projects & Grants</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Your funded research projects · {projects.length} total
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff",
          padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>+ Add Project</button>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? (
          <div className="spinner" />
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 60, color: "#aaa",
            background: "#fff", borderRadius: 12, border: "1px solid #eee",
          }}>
            No projects yet. Click "+ Add Project" to add your first one.
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12,
          }}>
            {projects.map((p, i) => {
              const sc = statusColor(p.status);
              return (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #eee",
                  borderRadius: 12, padding: 18,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600,
                      color: "#1a1a1a", flex: 1, paddingRight: 8,
                      lineHeight: 1.4 }}>{p.title}</div>
                    <span style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 12,
                      fontWeight: 500, flexShrink: 0,
                      background: sc.bg, color: sc.color,
                    }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                    🏛 {p.sponsor_name}
                  </div>
                  <div style={{ fontSize: 12, color: "#534AB7",
                    fontWeight: 600, marginBottom: 8 }}>
                    ₹{p.amount_lakhs}L
                  </div>
                  <div style={{
                    display: "inline-block", fontSize: 11,
                    padding: "2px 8px", borderRadius: 5,
                    background: "#EEEDFE", color: "#534AB7",
                  }}>{p.sponsor_type}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "24px 28px",
            width: 480, maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add Project</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              {/* Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Project Title *</label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={inputStyle} placeholder="Enter project title" />
              </div>

              {/* Sponsor Name */}
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Sponsor / Funding Agency *</label>
                <input required value={form.sponsor_name}
                  onChange={e => setForm({ ...form, sponsor_name: e.target.value })}
                  style={inputStyle} placeholder="e.g. AICTE, TCS, SERB" />
              </div>

              {/* Sponsor Type + Amount */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Sponsor Type</label>
                  <select value={form.sponsor_type}
                    onChange={e => setForm({ ...form, sponsor_type: e.target.value })}
                    style={inputStyle}>
                    {["Govt. Grants","Industry Sponsored",
                      "Institute Funding","Others"].map(o =>
                      <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Amount (in Lakhs)</label>
                  <input type="number" value={form.amount_lakhs}
                    onChange={e => setForm({ ...form, amount_lakhs: e.target.value })}
                    style={inputStyle} placeholder="e.g. 8.5" />
                </div>
              </div>

              {/* Status + Dates */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={inputStyle}>
                    {["Ongoing","Completed","Submitted"].map(o =>
                      <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={form.start_date}
                    onChange={e => setForm({ ...form, start_date: e.target.value })}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" value={form.end_date}
                    onChange={e => setForm({ ...form, end_date: e.target.value })}
                    style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>{saving ? "Saving..." : "Save Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

const labelStyle = { fontSize: 12, color: "#555", display: "block", marginBottom: 5 };
const inputStyle = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
};