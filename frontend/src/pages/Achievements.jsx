import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = {
  title: "", category: "Award", issuer: "", year: 2024, amount: "",
};

export default function Achievements() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);

  const fetchData = () => {
    const id = localStorage.getItem("faculty_id");
    API.get(`/faculty/${id}/dashboard`)
      .then(res => setItems(res.data.achievements || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/achievements/", {
        ...form,
        year:   parseInt(form.year),
        amount: form.amount ? parseFloat(form.amount) : null,
      });
      setModal(false);
      setForm(EMPTY);
      fetchData();
    } finally {
      setSaving(false);
    }
  };

  const catStyle = (c) =>
    c === "Award"     ? { bg: "#FAEEDA", color: "#633806", icon: "🏆" } :
    c === "Grant"     ? { bg: "#EAF3DE", color: "#27500A", icon: "💰" } :
    c === "Patent"    ? { bg: "#EEEDFE", color: "#534AB7", icon: "💡" } :
    c === "Fellowship"? { bg: "#E6F1FB", color: "#0C447C", icon: "🎓" } :
                        { bg: "#F1EFE8", color: "#444441", icon: "⭐" };

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Achievements & Honours</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Awards, grants, fellowships and recognitions · {items.length} total
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff",
          padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>+ Add Achievement</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> :
          items.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: "#aaa",
              background: "#fff", borderRadius: 12, border: "1px solid #eee",
            }}>No achievements yet. Add your first one!</div>
          ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12,
          }}>
            {items.map((a, i) => {
              const cs = catStyle(a.category);
              return (
                <div key={i} style={{
                  background: "#fff", border: "1px solid #eee",
                  borderRadius: 12, padding: 18,
                  display: "flex", gap: 14, alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: cs.bg, display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: 22, flexShrink: 0,
                  }}>{cs.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600,
                      color: "#1a1a1a", marginBottom: 4, lineHeight: 1.4 }}>
                      {a.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                      {a.issuer}
                    </div>
                    <div style={{ display: "flex",
                      justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10,
                        background: cs.bg, color: cs.color, fontWeight: 500,
                      }}>{a.category}</span>
                      <span style={{ fontSize: 12, color: "#888" }}>{a.year}</span>
                    </div>
                    {a.amount && (
                      <div style={{ fontSize: 12, color: "#27500A",
                        fontWeight: 600, marginTop: 6 }}>
                        ₹{a.amount.toLocaleString()}
                      </div>
                    )}
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
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add Achievement</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Title *</label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={inp} placeholder="e.g. Best Researcher Award 2024" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Issuing Organisation *</label>
                <input required value={form.issuer}
                  onChange={e => setForm({ ...form, issuer: e.target.value })}
                  style={inp} placeholder="e.g. NIET Greater Noida" />
              </div>
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={inp}>
                    {["Award","Grant","Patent","Fellowship","Other"].map(o =>
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
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Amount (₹) — for grants only</label>
                <input type="number" value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  style={inp} placeholder="Leave blank if not applicable" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>{saving ? "Saving..." : "Save Achievement"}</button>
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