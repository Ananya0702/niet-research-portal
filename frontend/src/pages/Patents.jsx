import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = {
  title: "", patent_number: "", status: "Filed", year: 2024,
};

export default function Patents() {
  const [patents,  setPatents]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const fetchPatents = () => {
    const id = localStorage.getItem("faculty_id");
    API.get(`/faculty/${id}/dashboard`)
      .then(res => setPatents(res.data.patents || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchPatents(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/patents/", { ...form, year: parseInt(form.year) });
      setModal(false);
      setForm(EMPTY);
      fetchPatents();
    } finally {
      setSaving(false);
    }
  };

  const statusStyle = (s) =>
    s === "Granted"   ? { bg: "#EAF3DE", color: "#27500A" } :
    s === "Published" ? { bg: "#E6F1FB", color: "#0C447C" } :
                        { bg: "#FAEEDA", color: "#633806" };

  const statusIcon = (s) =>
    s === "Granted" ? "✅" : s === "Published" ? "📋" : "📝";

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Patents</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Your filed and published patents · {patents.length} total
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff",
          padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>+ Add Patent</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> :
          patents.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: "#aaa",
              background: "#fff", borderRadius: 12, border: "1px solid #eee",
            }}>No patents yet. Click "+ Add Patent" to add your first one.</div>
          ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12,
          }}>
            {patents.map((p, i) => {
              const sc = statusStyle(p.status);
              return (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #eee",
                  borderRadius: 12, padding: 18,
                }}>
                  <div style={{ fontSize: 22, marginBottom: 10 }}>
                    {statusIcon(p.status)}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600,
                    color: "#1a1a1a", marginBottom: 8, lineHeight: 1.4 }}>
                    {p.title}
                  </div>
                  {p.patent_number && (
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                      📋 {p.patent_number}
                    </div>
                  )}
                  <div style={{ display: "flex",
                    justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      fontSize: 11, padding: "3px 8px", borderRadius: 12,
                      fontWeight: 500, background: sc.bg, color: sc.color,
                    }}>{p.status}</span>
                    <span style={{ fontSize: 12, color: "#888" }}>{p.year}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "24px 28px", width: 440,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add Patent</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Patent Title *</label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={inp} placeholder="Enter patent title" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Patent Number</label>
                <input value={form.patent_number}
                  onChange={e => setForm({ ...form, patent_number: e.target.value })}
                  style={inp} placeholder="e.g. IN202311012345" />
              </div>
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={inp}>
                    {["Filed","Published","Granted"].map(o =>
                      <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Year</label>
                  <input type="number" value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}
                    style={inp} />
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
                }}>{saving ? "Saving..." : "Save Patent"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

const lbl = { fontSize: 12, color: "#555", display: "block", marginBottom: 5 };
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
};