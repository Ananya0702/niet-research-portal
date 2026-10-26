import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import * as XLSX from "xlsx";

const EMPTY = {
  title: "",
  department: "",
  school: "",
  ipr_type: "Patent",
  title_type: "National",
  patent_number: "",
  publication_number: "",
  status: "Filed",
  year: new Date().getFullYear(),
  filing_date: "",
  publication_date: "",
  grant_date: "",
};

const IPR_TYPES    = ["Patent", "Design", "Copyright", "Trademark"];
const TITLE_TYPES  = ["National", "International"];
const STATUS_TYPES = ["Filed", "Published", "Granted"];

const DEPT_OPTIONS = [
  "Computer Science & Engineering",
  "Electronics & Communication Engg.",
  "Mechanical Engineering",
  "Electrical & Electronics Engg.",
  "Artificial Intelligence & Data Science",
  "Applied Sciences",
];

const SCHOOL_OPTIONS = [
  "School of Engineering & Technology",
  "School of Management",
  "School of Applied Sciences",
  "School of Computer Applications",
];

const TYPE_ICON = {
  Patent:    "💡",
  Design:    "🎨",
  Copyright: "©️",
  Trademark: "™️",
};

const TYPE_COLOR = {
  Patent:    { bg: "#EEEDFE", color: "#534AB7" },
  Design:    { bg: "#E6F1FB", color: "#0C447C" },
  Copyright: { bg: "#EAF3DE", color: "#27500A" },
  Trademark: { bg: "#FAEEDA", color: "#633806" },
};

const STATUS_COLOR = {
  Filed:     { bg: "#FAEEDA", color: "#633806" },
  Published: { bg: "#E6F1FB", color: "#0C447C" },
  Granted:   { bg: "#EAF3DE", color: "#27500A" },
};

export default function IPR() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [filterType, setFilterType] = useState("All");
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importIssues, setImportIssues] = useState([]);
  const [importWarnings, setImportWarnings] = useState([]);
  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState("");
  const canImport = ["hod", "dean_rd"].includes(localStorage.getItem("role"));

  const fetchData = () => {
    API.get("/patents/")
      .then(res => setItems(res.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.post("/patents/", {
        ...form,
        year: parseInt(form.year),
        filing_date:      form.filing_date      || null,
        publication_date: form.publication_date || null,
        grant_date:       form.grant_date       || null,
      });
      setModal(false);
      setForm(EMPTY);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error saving IPR");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this IPR record?")) {
      await API.delete(`/patents/${id}`);
      fetchData();
    }
  };

  const readImportFile = async (file) => {
    if (!file) return;
    setImportSummary(""); setImportIssues([]); setImportWarnings([]); setImportRows([]);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
      if (!rows.length) throw new Error("The first worksheet has no data rows.");
      setImportRows(rows);
      setImportBusy(true);
      const result = await API.post("/patents/import/preview", { rows });
      setImportIssues(result.data.issues || []);
      setImportWarnings(result.data.warnings || []);
      setImportSummary(`${result.data.valid} of ${result.data.total} rows are ready to import.`);
    } catch (err) {
      setImportSummary(err.response?.data?.detail?.message || err.message || "Could not read this spreadsheet.");
    } finally { setImportBusy(false); }
  };

  const commitImport = async () => {
    setImportBusy(true);
    try {
      const result = await API.post("/patents/import", { rows: importRows });
      setImportSummary(result.data.message); setImportRows([]); setImportIssues([]); setImportWarnings([]); fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setImportSummary(detail?.message || "Import failed.");
      setImportIssues(detail?.issues || []);
    } finally { setImportBusy(false); }
  };

  // Filter logic
  const filtered = items.filter(item => {
    const matchSearch =
      !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.patent_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.publication_number?.toLowerCase().includes(search.toLowerCase()) ||
      item.department?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "All" || item.ipr_type === filterType;
    return matchSearch && matchType;
  });

  // Summary counts
  const counts = IPR_TYPES.reduce((acc, t) => {
    acc[t] = items.filter(i => i.ipr_type === t).length;
    return acc;
  }, {});

  return (
    <Layout>
      {/* Topbar */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            IPR — Intellectual Property Rights
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            Patents, Designs, Copyrights & Trademarks · {items.length} total
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
        {canImport && <button onClick={() => { setImportOpen(true); setImportSummary(""); }} style={{
          background: "#fff", color: "#534AB7", padding: "9px 16px",
          borderRadius: 8, fontSize: 13, fontWeight: 500, border: "1px solid #c8c3f5", cursor: "pointer",
        }}>Import Patents</button>}
        <button onClick={() => setModal(true)} style={{
          background: "#534AB7", color: "#fff", padding: "9px 18px",
          borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none",
          cursor: "pointer",
        }}>+ Add IPR</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {/* Summary Cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)",
          gap: 10, marginBottom: 14,
        }}>
          {IPR_TYPES.map(t => {
            const tc = TYPE_COLOR[t];
            return (
              <div key={t}
                onClick={() => setFilterType(filterType === t ? "All" : t)}
                style={{
                  background: "#fff", border: `2px solid ${filterType === t ? tc.color : "#eee"}`,
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: tc.bg, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>{TYPE_ICON[t]}</div>
                <div>
                  <div style={{ fontSize: 11, color: "#888" }}>{t}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: tc.color }}>
                    {counts[t] || 0}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + Filter Bar */}
        <div style={{
          display: "flex", gap: 10, marginBottom: 12, alignItems: "center",
        }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{
              position: "absolute", left: 12, top: "50%",
              transform: "translateY(-50%)", fontSize: 14, color: "#aaa",
            }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, patent number, department..."
              style={{
                width: "100%", padding: "9px 12px 9px 34px",
                border: "1px solid #ddd", borderRadius: 8,
                fontSize: 13, outline: "none",
              }}
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: "9px 14px", border: "1px solid #ddd",
              borderRadius: 8, fontSize: 13, outline: "none",
              background: "#fff", cursor: "pointer",
            }}>
            <option value="All">All Types</option>
            {IPR_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          {(search || filterType !== "All") && (
            <button
              onClick={() => { setSearch(""); setFilterType("All"); }}
              style={{
                padding: "9px 14px", border: "1px solid #ddd",
                borderRadius: 8, fontSize: 12, background: "#fff",
                cursor: "pointer", color: "#A32D2D",
              }}>✕ Clear</button>
          )}
          <div style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Table */}
        {loading ? <div className="spinner" /> : (
          <div style={{
            background: "#fff", borderRadius: 12,
            border: "1px solid #eee", overflow: "auto",
          }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: 60, textAlign: "center", color: "#aaa", fontSize: 14,
              }}>
                {items.length === 0
                  ? "No IPR records yet. Click '+ Add IPR' to add your first one."
                  : "No results found. Try a different search."}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9f9f9" }}>
                    {["Title","Dept / School","Type","Scope",
                      "Patent No.","Pub. No.","Status",
                      "Filing","Publication","Grant","Source fields",""].map(h => (
                      <th key={h} style={{
                        padding: "10px 12px", fontSize: 11, color: "#888",
                        textAlign: "left", borderBottom: "1px solid #eee",
                        fontWeight: 500, whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const tc = TYPE_COLOR[p.ipr_type]   || TYPE_COLOR.Patent;
                    const sc = STATUS_COLOR[p.status]   || STATUS_COLOR.Filed;
                    return (
                      <tr key={p.patent_id}
                        style={{ borderBottom: "1px solid #f5f5f5" }}>
                        <td style={{
                          padding: "10px 12px", fontSize: 12,
                          color: "#185FA5", fontWeight: 500,
                          maxWidth: 260, overflow: "hidden",
                          whiteSpace: "normal",
                        }}>{p.title}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontSize: 12, color: "#333" }}>
                            {p.department || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
                            {p.school || ""}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontSize: 11, padding: "3px 8px", borderRadius: 10,
                            fontWeight: 500, background: tc.bg, color: tc.color,
                            display: "flex", alignItems: "center", gap: 4,
                            width: "fit-content",
                          }}>
                            {TYPE_ICON[p.ipr_type]} {p.ipr_type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontSize: 11, padding: "3px 8px", borderRadius: 10,
                            fontWeight: 500,
                            background: p.title_type === "International"
                              ? "#E6F1FB" : "#EAF3DE",
                            color: p.title_type === "International"
                              ? "#0C447C" : "#27500A",
                          }}>
                            {p.title_type === "International" ? "🌍" : "🇮🇳"} {p.title_type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 12,
                          color: "#555" }}>{p.patent_number || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 12,
                          color: "#555" }}>{p.publication_number || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{
                            fontSize: 11, padding: "2px 8px", borderRadius: 10,
                            fontWeight: 500, background: sc.bg, color: sc.color,
                          }}>{p.status}</span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: 11,
                          color: "#555" }}>{p.filing_date || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11,
                          color: "#555" }}>{p.publication_date || "—"}</td>
                        <td style={{ padding: "10px 12px", fontSize: 11,
                          color: p.grant_date ? "#27500A" : "#aaa",
                          fontWeight: p.grant_date ? 500 : 400,
                        }}>{p.grant_date || "—"}</td>
                        <td style={{ padding: "8px 12px", minWidth: 130 }}>
                          {p.extra_data && Object.keys(p.extra_data).length > 0 ? (
                            <details>
                              <summary style={{ cursor: "pointer", color: "#534AB7", fontSize: 11 }}>View {Object.keys(p.extra_data).filter(key => !key.startsWith("_")).length} fields</summary>
                              <div style={{ position: "absolute", zIndex: 2, background: "white", border: "1px solid #ddd", borderRadius: 8, padding: 10, maxWidth: 360, maxHeight: 240, overflow: "auto", boxShadow: "0 8px 24px #0002" }}>
                                {Object.entries(p.extra_data).filter(([key]) => !key.startsWith("_")).map(([key, value]) => <div key={key} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, padding: "4px 0", borderBottom: "1px solid #f2f2f2", fontSize: 11 }}><b>{key}</b><span>{String(value ?? "—")}</span></div>)}
                              </div>
                            </details>
                          ) : <span style={{ color: "#aaa" }}>—</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {localStorage.getItem("role") === "faculty" && String(p.faculty_id) === localStorage.getItem("faculty_id") && <button onClick={() => handleDelete(p.patent_id)} style={{
                            fontSize: 11, color: "#A32D2D", background: "#FCEBEB",
                            padding: "3px 10px", borderRadius: 5, border: "none",
                            cursor: "pointer",
                          }}>Delete</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {importOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(18,16,35,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 24, width: 680, maxWidth: "94vw", maxHeight: "86vh", overflowY: "auto", boxShadow: "0 20px 60px #17142a35" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 18 }}>Import patent spreadsheet</strong>
              <button onClick={() => setImportOpen(false)} style={{ border: 0, background: "none", fontSize: 24, cursor: "pointer", color: "#777" }}>×</button>
            </div>
            <p style={{ color: "#6e6a7a", fontSize: 13, lineHeight: 1.55, marginTop: 0 }}>
              Choose an Excel or CSV file. The importer reads the first worksheet, matches each inventor to faculty in your assigned scope, and stores all spreadsheet columns—including future columns—with the patent.
            </p>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e => readImportFile(e.target.files?.[0])} style={{ display: "block", width: "100%", padding: 14, border: "1px dashed #bcb7da", borderRadius: 10, background: "#faf9ff", boxSizing: "border-box" }} />
            {importSummary && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: importIssues.length ? "#fff6e8" : "#f1f0ff", color: "#39324f", fontSize: 13 }}>{importSummary}</div>}
            {importRows.length > 0 && <div style={{ marginTop: 10, color: "#777", fontSize: 12 }}>{importRows.length} rows · {Object.keys(importRows[0]).length} columns detected</div>}
            {importIssues.length > 0 && <div style={{ marginTop: 10, maxHeight: 220, overflow: "auto", border: "1px solid #f1d7aa", borderRadius: 8 }}>
              {importIssues.map(issue => <div key={issue.row} style={{ padding: "9px 12px", borderBottom: "1px solid #f5ead8", fontSize: 12 }}><b>Row {issue.row}:</b> {issue.errors.join(" · ")}</div>)}
            </div>}
            {importWarnings.length > 0 && <div style={{ marginTop: 10, maxHeight: 150, overflow: "auto", border: "1px solid #f1d7aa", borderRadius: 8, background: "#fffaf1" }}>
              {importWarnings.map((item, i) => <div key={`${item.row}-${i}`} style={{ padding: "8px 12px", borderBottom: "1px solid #f5ead8", fontSize: 12, color: "#73541f" }}><b>Row {item.row}:</b> {item.warnings.join(" · ")}</div>)}
            </div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}>
              <button onClick={() => setImportOpen(false)} style={{ padding: "9px 16px", border: "1px solid #ddd", borderRadius: 8, background: "white", cursor: "pointer" }}>Close</button>
              <button disabled={importBusy || !importRows.length || importIssues.length > 0} onClick={commitImport} style={{ padding: "9px 18px", border: 0, borderRadius: 8, background: importBusy || !importRows.length || importIssues.length ? "#aaa" : "#534AB7", color: "white", fontWeight: 600, cursor: "pointer" }}>{importBusy ? "Checking…" : "Import valid rows"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "center", justifyContent: "center", zIndex: 100,
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "24px 28px",
            width: 580, maxHeight: "90vh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>Add IPR Record</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }}
                onClick={() => setModal(false)}>×</span>
            </div>

            <form onSubmit={handleAdd}>

              {/* Title */}
              <div style={{ marginBottom: 14 }}>
                <label style={lbl}>Title of IPR *</label>
                <input required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  style={inp} placeholder="Enter full title of the invention/work" />
              </div>

              {/* Dept + School */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Department</label>
                  <select value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    style={inp}>
                    <option value="">Select Department</option>
                    {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>School</label>
                  <select value={form.school}
                    onChange={e => setForm({ ...form, school: e.target.value })}
                    style={inp}>
                    <option value="">Select School</option>
                    {SCHOOL_OPTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Type + Scope */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Type of IPR *</label>
                  <select required value={form.ipr_type}
                    onChange={e => setForm({ ...form, ipr_type: e.target.value })}
                    style={inp}>
                    {IPR_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Title (Scope)</label>
                  <select value={form.title_type}
                    onChange={e => setForm({ ...form, title_type: e.target.value })}
                    style={inp}>
                    {TITLE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Patent No + Publication No */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Patent / Application Number</label>
                  <input value={form.patent_number}
                    onChange={e => setForm({ ...form, patent_number: e.target.value })}
                    style={inp} placeholder="e.g. IN202311012345" />
                </div>
                <div>
                  <label style={lbl}>Publication Number</label>
                  <input value={form.publication_number}
                    onChange={e => setForm({ ...form, publication_number: e.target.value })}
                    style={inp} placeholder="e.g. 2024/0012345" />
                </div>
              </div>

              {/* Status + Year */}
              <div style={{ display: "grid",
                gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={inp}>
                    {STATUS_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Year *</label>
                  <input type="number" required value={form.year}
                    onChange={e => setForm({ ...form, year: e.target.value })}
                    style={inp} min="2000" max="2030" />
                </div>
              </div>

              {/* Three date columns */}
              <div style={{ marginBottom: 6 }}>
                <label style={{ ...lbl, marginBottom: 8 }}>Important Dates</label>
                <div style={{ display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ ...lbl, color: "#534AB7" }}>📅 Filing Date</label>
                    <input type="date" value={form.filing_date}
                      onChange={e => setForm({ ...form, filing_date: e.target.value })}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ ...lbl, color: "#0C447C" }}>📋 Publication Date</label>
                    <input type="date" value={form.publication_date}
                      onChange={e => setForm({ ...form, publication_date: e.target.value })}
                      style={inp} />
                  </div>
                  <div>
                    <label style={{ ...lbl, color: "#27500A" }}>✅ Grant Date</label>
                    <input type="date" value={form.grant_date}
                      onChange={e => setForm({ ...form, grant_date: e.target.value })}
                      style={inp} />
                  </div>
                </div>
              </div>

              <div style={{
                fontSize: 11, color: "#888", background: "#f9f9f9",
                padding: "8px 12px", borderRadius: 8, marginTop: 12,
                marginBottom: 16,
              }}>
                💡 Leave Grant Date empty if patent is not yet granted.
                Publication Date is when it was published in the gazette.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setModal(false)} style={{
                  flex: 1, padding: 10, border: "1px solid #ddd",
                  borderRadius: 8, fontSize: 13, background: "#fff",
                  cursor: "pointer",
                }}>Cancel</button>
                <button type="submit" disabled={saving} style={{
                  flex: 2, padding: 10, background: "#534AB7",
                  color: "#fff", borderRadius: 8, fontSize: 13,
                  fontWeight: 500, border: "none", cursor: "pointer",
                }}>{saving ? "Saving..." : "Save IPR Record"}</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

const lbl = {
  fontSize: 12, color: "#555", display: "block", marginBottom: 5,
};
const inp = {
  width: "100%", padding: "9px 12px",
  border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
};
