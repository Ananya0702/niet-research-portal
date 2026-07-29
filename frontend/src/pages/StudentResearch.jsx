import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const EMPTY = {
  name: "", enrollment_no: "", degree: "PhD",
  status: "Active", year_joined: 2024, thesis_title: "",
};

export default function StudentResearch() {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY);
  const [saving,   setSaving]   = useState(false);

  const fetchData = () => {
    API.get("/students/")
      .then(res => setStudents(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/students/", {
        ...form,
        year_joined: parseInt(form.year_joined),
      });
      setModal(false);
      setForm(EMPTY);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error adding student");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this student researcher?")) {
      await API.delete(`/students/${id}`);
      fetchData();
    }
  };

  const degreeIcon = (d) =>
    d === "PhD" ? "🎓" : d === "MTech" ? "📘" : "📗";

  const statusStyle = (s) =>
    s === "Active"    ? { bg: "#EAF3DE", color: "#27500A" } :
    s === "Completed" ? { bg: "#E6F1FB", color: "#0C447C" } :
                        { bg: "#FCEBEB", color: "#791F1F" };

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Student Research</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            PhD & MTech students under your guidance · {students.length} total
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff", padding: "9px 18px",
          borderRadius: 8, fontSize: 13, fontWeight: 500,
        }}>+ Add Student</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> :
          students.length === 0 ? (
            <div style={{
              textAlign: "center", padding: 60, color: "#aaa",
              background: "#fff", borderRadius: 12, border: "1px solid #eee",
            }}>No students added yet. Click "+ Add Student" to add your first one.</div>
          ) : (
          <div style={{
            background: "#fff", borderRadius: 12,
            border: "1px solid #eee", overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9f9f9" }}>
                  {["Student","Enrollment No.","Degree","Thesis Title",
                    "Year Joined","Status","Action"].map(h => (
                    <th key={h} style={{
                      padding: "10px 14px", fontSize: 12, color: "#888",
                      textAlign: "left", borderBottom: "1px solid #eee",
                      fontWeight: 500,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const sc = statusStyle(s.status);
                  return (
                    <tr key={s.student_id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <td style={{ padding: "10px 14px", fontSize: 13,
                        color: "#1a1a1a", fontWeight: 500 }}>
                        {degreeIcon(s.degree)} {s.name}
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12,
                        color: "#555" }}>{s.enrollment_no}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 5,
                          background: "#EEEDFE", color: "#534AB7", fontWeight: 500,
                        }}>{s.degree}</span>
                      </td>
                      <td style={{
                        padding: "10px 14px", fontSize: 12, color: "#555",
                        maxWidth: 220, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{s.thesis_title || "—"}</td>
                      <td style={{ padding: "10px 14px",
                        fontSize: 12 }}>{s.year_joined}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 12,
                          background: sc.bg, color: sc.color, fontWeight: 500,
                        }}>{s.status}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button onClick={() => handleDelete(s.student_id)} style={{
                          fontSize: 11, color: "#A32D2D", background: "#FCEBEB",
                          padding: "3px 10px", borderRadius: 5, border: "none",
                        }}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
            background: "#fff", borderRadius: 14, padding: "24px 28px", width: 460,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add Student Researcher</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Student Name *</label>
                <input required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={inp} placeholder="Enter student name" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Enrollment Number *</label>
                <input required value={form.enrollment_no}
                  onChange={e => setForm({ ...form, enrollment_no: e.target.value })}
                  style={inp} placeholder="e.g. NIET2024CS001" />
              </div>
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Degree</label>
                  <select value={form.degree}
                    onChange={e => setForm({ ...form, degree: e.target.value })}
                    style={inp}>
                    {["PhD","MTech","BTech"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={inp}>
                    {["Active","Completed","Discontinued"].map(o =>
                      <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Year Joined</label>
                  <input type="number" value={form.year_joined}
                    onChange={e => setForm({ ...form, year_joined: e.target.value })}
                    style={inp} />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Thesis Title</label>
                <input value={form.thesis_title}
                  onChange={e => setForm({ ...form, thesis_title: e.target.value })}
                  style={inp} placeholder="Optional" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500,
                }}>{saving ? "Saving..." : "Save Student"}</button>
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