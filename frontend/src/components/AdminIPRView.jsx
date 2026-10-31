import { useEffect, useState } from "react";
import API from "../services/api";

const EMPTY = {
  title: "", department: "", school: "", ipr_type: "Patent", title_type: "National",
  application_number: "", patent_number: "", publication_number: "", status: "Filed",
  year: new Date().getFullYear(), filing_date: "", publication_date: "", grant_date: "",
};

export default function AdminIPRView({ onMessage }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [extraRows, setExtraRows] = useState([]);
  const [query, setQuery] = useState("");

  const headers = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("admin_token")}` } });
  const load = async () => {
    setLoading(true);
    try {
      const response = await API.get("/patents/admin/all", headers());
      setRecords(response.data || []);
    } catch (error) {
      onMessage("error", error.response?.data?.detail || "Could not load IPR records.");
    } finally { setLoading(false); }
  };
  useEffect(() => {
    let cancelled = false;
    API.get("/patents/admin/all", headers())
      .then((response) => { if (!cancelled) setRecords(response.data || []); })
      .catch((error) => {
        if (!cancelled) onMessage("error", error.response?.data?.detail || "Could not load IPR records.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addRecord = async (event) => {
    event.preventDefault();
    setSaving(true);
    const extra_data = Object.fromEntries(extraRows
      .map(({ key, value }) => [key.trim(), value.trim()])
      .filter(([key, value]) => key && value));
    try {
      const result = await API.post("/patents/admin", {
        ...form,
        year: Number(form.year),
        filing_date: form.filing_date || null,
        publication_date: form.publication_date || null,
        grant_date: form.grant_date || null,
        extra_data,
      }, headers());
      setModal(false);
      setForm(EMPTY);
      setExtraRows([]);
      onMessage("success", result.data?.message || "IPR record added.");
      await load();
    } catch (error) {
      onMessage("error", error.response?.data?.detail || "Could not save IPR record.");
    } finally { setSaving(false); }
  };

  const filtered = records.filter((record) => !query || [record.title, record.department,
    record.school, record.patent_number, record.publication_number, record.application_number,
    record.record_source].some((value) => String(value || "").toLowerCase().includes(query.toLowerCase())));
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "9px 10px", border: "1px solid #dedce8", borderRadius: 8, fontSize: 12, background: "#fff" };
  const labelStyle = { display: "block", marginBottom: 5, fontSize: 11, color: "#655f70", fontWeight: 600 };

  return <div style={{ background: "#fff", border: "1px solid #eceaf2", borderRadius: 14, padding: 18 }}>
    <div style={{ display: "flex", gap: 14, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#211b35" }}>IPR Management</div>
        <div style={{ fontSize: 11, color: "#858091", marginTop: 4 }}>All faculty IPR records plus institute records shared with Deans and HODs · {records.length} total</div>
      </div>
      <button onClick={() => setModal(true)} style={{ background: "#5B3DF5", color: "#fff", border: 0, borderRadius: 8, padding: "10px 16px", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>+ Add Institute IPR</button>
    </div>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, faculty IPR, number, department…" style={{ ...inputStyle, marginBottom: 12 }} />
    <div style={{ overflowX: "auto", border: "1px solid #eeedf2", borderRadius: 10 }}>
      {loading ? <div style={{ padding: 36, textAlign: "center", color: "#817b8c", fontSize: 12 }}>Loading IPR records…</div> : filtered.length === 0 ?
        <div style={{ padding: 36, textAlign: "center", color: "#817b8c", fontSize: 12 }}>No IPR records found.</div> :
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 940 }}>
          <thead><tr style={{ background: "#f8f7fb" }}>{["Title", "Department / School", "Type", "Patent / Application No.", "Year", "Submitted by", "Review", "Extra fields"].map((title) => <th key={title} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, color: "#746f80", borderBottom: "1px solid #eeedf2", whiteSpace: "nowrap" }}>{title}</th>)}</tr></thead>
          <tbody>{filtered.map((record) => <tr key={record.patent_id} style={{ borderBottom: "1px solid #f1f0f4" }}>
            <td style={{ padding: "11px 12px", fontSize: 11, color: "#252139", fontWeight: 600, maxWidth: 330 }}>{record.title || "—"}</td>
            <td style={{ padding: "11px 12px", fontSize: 11, color: "#615c6d" }}>{record.department || "—"}<div style={{ color: "#9691a0", marginTop: 3 }}>{record.school || ""}</div></td>
            <td style={{ padding: "11px 12px", fontSize: 11 }}>{record.ipr_type || "Patent"}</td>
            <td style={{ padding: "11px 12px", fontSize: 11, color: "#615c6d" }}>{record.patent_number || record.application_number || record.publication_number || "—"}</td>
            <td style={{ padding: "11px 12px", fontSize: 11 }}>{record.year || "—"}</td>
            <td style={{ padding: "11px 12px" }}><span style={{ fontSize: 10, padding: "4px 8px", borderRadius: 20, color: record.record_source === "admin" ? "#4931c7" : "#0c5a45", background: record.record_source === "admin" ? "#eeedfe" : "#e1f5ee" }}>{record.record_source === "admin" ? "Institute record" : "Faculty submission"}</span></td>
            <td style={{ padding: "11px 12px", fontSize: 10 }}>{record.duplicate_review ? <span title={`Possible match: ${record.duplicate_review.matched_title}`} style={{ color: "#8a4b00", background: "#fff1d6", padding: "5px 8px", borderRadius: 7, whiteSpace: "nowrap" }}>⚠ Possible duplicate</span> : <span style={{ color: "#8a8592" }}>—</span>}</td>
            <td style={{ padding: "11px 12px", fontSize: 10 }}>{Object.keys(record.extra_data || {}).filter((key) => !key.startsWith("_")).length ? <details><summary style={{ cursor: "pointer", color: "#534AB7" }}>View fields</summary><div style={{ position: "absolute", zIndex: 4, background: "#fff", border: "1px solid #dedce8", borderRadius: 8, padding: 10, maxWidth: 320, maxHeight: 220, overflow: "auto", boxShadow: "0 8px 24px #0002" }}>{Object.entries(record.extra_data || {}).filter(([key]) => !key.startsWith("_")).map(([key, value]) => <div key={key} style={{ display: "grid", gridTemplateColumns: "105px 1fr", gap: 8, padding: "4px 0", borderBottom: "1px solid #f2f2f2" }}><b>{key}</b><span>{String(value ?? "—")}</span></div>)}</div></details> : <span style={{ color: "#aaa" }}>—</span>}</td>
          </tr>)}</tbody>
        </table>}
    </div>

    {modal && <div onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(false); }} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(20,16,35,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form onSubmit={addRecord} style={{ width: "min(680px, 100%)", maxHeight: "90vh", overflow: "auto", background: "white", borderRadius: 16, padding: 22, boxShadow: "0 20px 60px #17142a35" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><strong style={{ fontSize: 17, color: "#211b35" }}>Add Institute IPR</strong><button type="button" onClick={() => setModal(false)} style={{ border: 0, background: "none", fontSize: 22, color: "#777", cursor: "pointer" }}>×</button></div>
        <p style={{ fontSize: 11, lineHeight: 1.5, color: "#797484", margin: "0 0 16px" }}>This record will be visible to Admins, Deans, and HODs. Faculty accounts will not receive it.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[ ["Title of IPR *", "title", "text"], ["Department", "department", "text"], ["School", "school", "text"], ["Application number", "application_number", "text"], ["Patent number", "patent_number", "text"], ["Publication number", "publication_number", "text"], ["Year *", "year", "number"], ["Filing date", "filing_date", "date"], ["Publication date", "publication_date", "date"], ["Grant date", "grant_date", "date"] ].map(([label, key, type]) => <label key={key} style={labelStyle}>{label}<input required={key === "title" || key === "year"} type={type} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} style={inputStyle} /></label>)}
          <label style={labelStyle}>IPR type<select value={form.ipr_type} onChange={(event) => setForm({ ...form, ipr_type: event.target.value })} style={inputStyle}>{["Patent", "Design", "Copyright", "Trademark"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label style={labelStyle}>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} style={inputStyle}>{["Filed", "Published", "Granted"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label style={labelStyle}>Scope<select value={form.title_type} onChange={(event) => setForm({ ...form, title_type: event.target.value })} style={inputStyle}><option>National</option><option>International</option></select></label>
        </div>
        <div style={{ marginTop: 12, padding: 12, borderRadius: 9, background: "#f8f7fb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><strong style={{ fontSize: 11 }}>Additional fields</strong><button type="button" onClick={() => setExtraRows([...extraRows, { key: "", value: "" }])} style={{ border: "1px solid #d8d3fb", color: "#534AB7", background: "#fff", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 10 }}>+ Add field</button></div>
          {extraRows.map((row, index) => <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 28px", gap: 7, marginTop: 7 }}><input aria-label="Field name" placeholder="Column name" value={row.key} onChange={(event) => setExtraRows(extraRows.map((item, i) => i === index ? { ...item, key: event.target.value } : item))} style={inputStyle} /><input aria-label="Field value" placeholder="Value" value={row.value} onChange={(event) => setExtraRows(extraRows.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} style={inputStyle} /><button type="button" aria-label="Remove field" onClick={() => setExtraRows(extraRows.filter((_, i) => i !== index))} style={{ border: 0, background: "none", color: "#a32d2d", fontSize: 17, cursor: "pointer" }}>×</button></div>)}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 18 }}><button type="button" onClick={() => setModal(false)} style={{ border: "1px solid #ddd", background: "white", borderRadius: 8, padding: "9px 15px", cursor: "pointer" }}>Cancel</button><button disabled={saving} type="submit" style={{ border: 0, background: "#5B3DF5", color: "white", borderRadius: 8, padding: "9px 17px", fontWeight: 650, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving…" : "Save Institute IPR"}</button></div>
      </form>
    </div>}
  </div>;
}
