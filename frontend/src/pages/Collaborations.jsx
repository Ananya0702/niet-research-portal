import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = {
  institute_name: "", collab_type: "Research MoU",
  start_date: "", status: "Active",
};

export default function Collaborations() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);

  const fetchData = () => {
    API.get("/collaborations/")
      .then(res => setItems(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/collaborations/", form);
      setModal(false);
      setForm(EMPTY);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this collaboration?")) {
      await API.delete(`/collaborations/${id}`);
      fetchData();
    }
  };

  const typeIcon = (t) =>
    t === "International"         ? "🌍" :
    t === "Industry Partnership"  ? "🏢" :
    t === "Govt Collaboration"    ? "🏛" :
    t === "Professional Body"     ? "🎖" : "🤝";

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Collaborations</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Research MoUs and partnerships · {items.length} total
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff", padding: "9px 18px",
          borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>+ Add Collaboration</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> :
          items.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: "#aaa",
              background: "#fff", borderRadius: 12, border: "1px solid #eee",
            }}>No collaborations yet. Click "+ Add Collaboration" to add your first one.</div>
          ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {items.map(c => (
              <div key={c.collab_id} style={{
                background: "#fff", border: "1px solid #eee",
                borderRadius: 12, padding: 18,
              }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>
                  {typeIcon(c.collab_type)}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600,
                  color: "#1a1a1a", marginBottom: 6 }}>
                  {c.institute_name}
                </div>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 10 }}>
                  {c.collab_type}
                  {c.start_date && ` · Since ${c.start_date.slice(0,4)}`}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "center" }}>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 12,
                    fontWeight: 500,
                    background: c.status === "Active" ? "#EAF3DE" : "#F1EFE8",
                    color:      c.status === "Active" ? "#27500A" : "#555",
                  }}>{c.status}</span>
                  <button onClick={() => handleDelete(c.collab_id)} style={{
                    fontSize: 11, color: "#A32D2D", background: "#FCEBEB",
                    padding: "3px 10px", borderRadius: 5, border: "none",
                  }}>Remove</button>
                </div>
              </div>
            ))}
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
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add Collaboration</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Institute / Organisation Name *</label>
                <input required value={form.institute_name}
                  onChange={e => setForm({ ...form, institute_name: e.target.value })}
                  style={inp} placeholder="e.g. IIT Delhi, TCS Innovation Labs" />
              </div>
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Type</label>
                  <select value={form.collab_type}
                    onChange={e => setForm({ ...form, collab_type: e.target.value })}
                    style={inp}>
                    {["Research MoU","Industry Partnership","International",
                      "Professional Body","Govt Collaboration"].map(o =>
                      <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={inp}>
                    {["Active","Inactive"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Start Date</label>
                <input type="date" value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  style={inp} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>{saving ? "Saving..." : "Save Collaboration"}</button>
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