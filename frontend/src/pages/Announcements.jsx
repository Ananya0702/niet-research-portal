import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = { title: "", body: "", target_role: "all" };

export default function Announcements() {
  const [items,  setItems]  = useState([]);
  const [loading,setLoading]= useState(true);
  const [modal,  setModal]  = useState(false);
  const [form,   setForm]   = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const role = localStorage.getItem("role");

  const fetchData = () => {
    API.get("/announcements/")
      .then(res => setItems(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/announcements/", form);
      setModal(false);
      setForm(EMPTY);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this announcement?")) {
      await API.delete(`/announcements/${id}`);
      fetchData();
    }
  };

  const targetLabel = (t) =>
    t === "all" ? "Everyone" : t === "hod" ? "HODs only" : "Faculty only";

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Announcements</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Post updates visible to faculty and HODs
          </div>
        </div>
        {role === "dean_rd" && (
          <button onClick={() => setModal(true)} style={{
            background: "#534AB7", color: "#fff", padding: "9px 18px",
            borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none",
          }}>+ Post Announcement</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> :
          items.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#aaa",
              background: "#fff", borderRadius: 12, border: "1px solid #eee" }}>
              No announcements yet.
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}>
            {items.map(a => (
              <div key={a.announcement_id} style={{
                background: "#fff", border: "1px solid #eee",
                borderRadius: 12, padding: "16px 18px",
                borderLeft: "4px solid #534AB7",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600,
                      color: "#1a1a1a", marginBottom: 6 }}>{a.title}</div>
                    <div style={{ fontSize: 13, color: "#555",
                      lineHeight: 1.6, marginBottom: 10 }}>{a.body}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, background: "#EEEDFE", color: "#534AB7",
                        padding: "2px 8px", borderRadius: 10, fontWeight: 500,
                      }}>📢 {targetLabel(a.target_role)}</span>
                      <span style={{ fontSize: 11, color: "#aaa" }}>
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {role === "dean_rd" && (
                    <button onClick={() => handleDelete(a.announcement_id)} style={{
                      fontSize: 11, color: "#A32D2D", background: "#FCEBEB",
                      padding: "3px 10px", borderRadius: 5, border: "none",
                      cursor: "pointer", marginLeft: 12, flexShrink: 0,
                    }}>Delete</button>
                  )}
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
            background: "#fff", borderRadius: 14, padding: "24px 28px", width: 480,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Post Announcement</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Title *</label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={inp} placeholder="e.g. New Funding Call Open" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Message *</label>
                <textarea required rows={4} value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  style={{ ...inp, fontFamily: "inherit", resize: "vertical" }}
                  placeholder="Announcement details..." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Visible to</label>
                <select value={form.target_role}
                  onChange={e => setForm({ ...form, target_role: e.target.value })}
                  style={inp}>
                  <option value="all">Everyone</option>
                  <option value="hod">HODs only</option>
                  <option value="faculty">Faculty only</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>{saving ? "Posting..." : "Post Announcement"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

const lbl = { fontSize: 12, color: "#555", display: "block", marginBottom: 5 };
const inp = { width: "100%", padding: "9px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 };