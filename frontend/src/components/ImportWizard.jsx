import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { adminImportRows, getImportTemplate } from "../services/api";

const ENTITY_LABEL = { schools: "Schools", departments: "Departments", faculty: "Faculty" };
const MODES = [
  { key: "upsert",  label: "Upsert",  desc: "Insert new + update existing (recommended)" },
  { key: "insert",  label: "Insert Only", desc: "Add new records; error if already exists" },
  { key: "update",  label: "Update Existing", desc: "Only update records that already exist" },
];

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ImportWizard({ entity, P, onClose, onDone }) {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState("upsert");
  const [validation, setValidation] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const handleFile = (file) => {
    setErr(""); setRows([]); setValidation(null); setResult(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (!json.length) { setErr("File is empty or has no data rows."); return; }
        setRows(json);
        setFileName(file.name);
        setStep("preview");
      } catch (ex) { setErr("Could not parse file. Use a CSV or Excel (.xlsx) file."); }
    };
    reader.readAsArrayBuffer(file);
  };

  const runValidate = async () => {
    setBusy(true); setErr("");
    try {
      const res = await adminImportRows(entity, mode, rows, true);
      setValidation(res.data);
      setStep("validate");
    } catch (ex) { setErr(ex.response?.data?.detail || "Validation failed"); }
    finally { setBusy(false); }
  };

  const runImport = async () => {
    setBusy(true); setErr("");
    try {
      const res = await adminImportRows(entity, mode, rows, false);
      setResult(res.data);
      setStep("results");
      if (onDone) onDone();
    } catch (ex) { setErr(ex.response?.data?.detail || "Import failed"); }
    finally { setBusy(false); }
  };

  const downloadTemplate = async (fmt, sample) => {
    try {
      const res = await getImportTemplate(entity, fmt, sample);
      downloadBlob(res.data, `${entity}_template${sample ? "_sample" : ""}.${fmt}`);
    } catch (ex) { setErr("Template download failed"); }
  };

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const previewRows = rows.slice(0, 20);
  const sum = validation?.summary || {};
  const res = result?.results || {};

  const chip = (label, val, color) => (
    <div key={label} style={{ background:"#f8f8fb", borderRadius:10, padding:"10px 14px", minWidth:110 }}>
      <div style={{ fontSize:20, fontWeight:700, color }}>{val}</div>
      <div style={{ fontSize:11, color:"#888" }}>{label}</div>
    </div>
  );

  const modal = {
    position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300,
  };
  const card = { background:"#fff", borderRadius:14, width:780, maxWidth:"95vw", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" };
  const head = { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:"1px solid #eee" };
  const body = { padding:"18px 20px", overflowY:"auto", flex:1 };
  const btn = { padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:500, border:"none", cursor:"pointer", background:P, color:"#fff" };
  const ghost = { padding:"9px 16px", borderRadius:8, fontSize:13, border:`1px solid ${P}`, color:P, background:"#fff", cursor:"pointer" };

  const steps = [
    { key:"upload",   label:"Upload" },
    { key:"preview",  label:"Preview" },
    { key:"validate", label:"Validate" },
    { key:"import",   label:"Import Mode" },
    { key:"results",  label:"Results" },
  ];
  const stepIndex = steps.findIndex(s => s.key === step);

  return (
    <div style={modal}>
      <div style={card}>
        <div style={head}>
          <span style={{ fontSize:15, fontWeight:600 }}>Import {ENTITY_LABEL[entity]} <span style={{ color:"#aaa", fontSize:12, fontWeight:400 }}>CSV / Excel</span></span>
          <span style={{ cursor:"pointer", color:"#888", fontSize:20 }} onClick={onClose}>×</span>
        </div>

        <div style={{ display:"flex", gap:6, padding:"12px 20px 0", flexWrap:"wrap" }}>
          {steps.map((s, i) => (
            <div key={s.key} style={{ fontSize:11, fontWeight:600, padding:"5px 12px", borderRadius:14,
              background: i <= stepIndex ? P : "#eee", color: i <= stepIndex ? "#fff" : "#888" }}>{s.label}</div>
          ))}
        </div>

        <div style={body}>
          {err && <div style={{ background:"#FCEBEB", color:"#791F1F", padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:14 }}>{err}</div>}

          {step === "upload" && (
            <div>
              <div style={{ fontSize:13, color:"#555", marginBottom:12 }}>Upload a CSV or Excel (.xlsx) file. Headers are matched flexibly (e.g. <b>School Name</b>, <b>school_name</b>, <b>Dept Code</b>).</div>
              <div onClick={() => fileRef.current.click()} style={{ border:"2px dashed #ccc", borderRadius:12, padding:"36px 20px", textAlign:"center", cursor:"pointer", color:"#888", fontSize:13, background:"#fafafd" }}>
                <div style={{ fontSize:28, marginBottom:6 }}>📄</div>
                Click to choose a file — .csv or .xlsx
              </div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:"none" }}
                     onChange={e => handleFile(e.target.files[0])} />
              <div style={{ marginTop:16, fontSize:12, color:"#888" }}>No file handy? Download a template:</div>
              <div style={{ display:"flex", gap:8, marginTop:8, flexWrap:"wrap" }}>
                <button style={ghost} onClick={() => downloadTemplate("csv", true)}>⬇ CSV Template (with sample)</button>
                <button style={ghost} onClick={() => downloadTemplate("csv", false)}>⬇ CSV Template</button>
                <button style={ghost} onClick={() => downloadTemplate("xlsx", true)}>⬇ Excel Template (with sample)</button>
                <button style={ghost} onClick={() => downloadTemplate("xlsx", false)}>⬇ Excel Template</button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div style={{ fontSize:13, color:"#555", marginBottom:12 }}>
                <b>{fileName}</b> — {rows.length} data rows detected. Showing first {previewRows.length}:
              </div>
              {previewRows.length ? (
                <div style={{ overflowX:"auto", border:"1px solid #eee", borderRadius:10 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#f8f8fb" }}>
                        {headers.map(h => <th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#888", textAlign:"left", borderBottom:"1px solid #eee", fontWeight:500 }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid #f5f5f5" }}>
                          {headers.map(h => <td key={h} style={{ padding:"7px 10px", color:"#333", whiteSpace:"nowrap" }}>{String(r[h] ?? "")}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div style={{ color:"#888", fontSize:13 }}>No rows to show.</div>}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:16 }}>
                <button style={ghost} onClick={() => setStep("upload")}>← Back</button>
                <button style={btn} onClick={runValidate}>{busy ? "Validating..." : "Continue → Validate"}</button>
              </div>
            </div>
          )}

          {step === "validate" && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Validation Summary — {fileName}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
                {chip("Total Rows", validation?.total_rows ?? 0, "#1a1a1a")}
                {chip("Valid / Ready", validation?.valid_rows ?? 0, "#27500A")}
                {chip("Will Insert", sum.to_insert ?? 0, P)}
                {chip("Will Update", sum.to_update ?? 0, "#0C447C")}
                {chip("Duplicates", sum.duplicates ?? 0, sum.duplicates ? "#A32D2D" : "#888")}
                {chip("Missing Fields", sum.missing_fields ?? 0, sum.missing_fields ? "#E6A23C" : "#888")}
                {chip("Invalid Email", sum.invalid_email ?? 0, sum.invalid_email ? "#E6A23C" : "#888")}
                {chip("Unknown School", sum.unknown_school ?? 0, sum.unknown_school ? "#E6A23C" : "#888")}
                {chip("Unknown Dept", sum.unknown_department ?? 0, sum.unknown_department ? "#E6A23C" : "#888")}
              </div>
              {validation?.row_errors?.length > 0 && (
                <div style={{ border:"1px solid #F3D8D8", background:"#FFF9F9", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#791F1F", marginBottom:8 }}>{validation.row_errors.length} row(s) with errors (skipped)</div>
                  {validation.row_errors.slice(0, 30).map((r, i) => (
                    <div key={i} style={{ fontSize:12, color:"#555", padding:"3px 0", borderBottom:"1px dashed #eee" }}>
                      <b>Row {r.row}</b> · {r.name}: {r.errors.join("; ")}
                    </div>
                  ))}
                  {validation.row_errors.length > 30 && <div style={{ fontSize:11, color:"#888", marginTop:6 }}>+{validation.row_errors.length - 30} more…</div>}
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
                <button style={ghost} onClick={() => setStep("preview")}>← Back</button>
                <button style={btn} onClick={() => setStep("import")}>Continue → Import Mode</button>
              </div>
            </div>
          )}

          {step === "import" && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>Choose Import Mode — {fileName}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
                {MODES.map(m => (
                  <div key={m.key} onClick={() => setMode(m.key)} style={{ border:`2px solid ${mode === m.key ? P : "#e0e0e8"}`, borderRadius:10, padding:"12px 16px", cursor:"pointer", background: mode === m.key ? "#F6F4FF" : "#fff", display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ width:18, height:18, borderRadius:9, border:"2px solid", borderColor: mode === m.key ? P : "#ccc", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {mode === m.key && <span style={{ width:10, height:10, borderRadius:5, background:P }} />}
                    </span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:"#1a1a1a" }}>{m.label}</div>
                      <div style={{ fontSize:11, color:"#888" }}>{m.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:12, color:"#888", background:"#f8f8fb", borderRadius:8, padding:"10px 14px", marginBottom:16 }}>
                {validation ? `${validation.valid_rows} of ${validation.total_rows} rows are valid and will be processed. ${validation.invalid_rows} row(s) with errors will be skipped.` : "Run validation first."}
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
                <button style={ghost} onClick={() => setStep("validate")}>← Back</button>
                <button style={{ ...btn, background:"#27500A" }} onClick={runImport} disabled={busy}>{busy ? "Importing..." : "🚀 Run Import"}</button>
              </div>
            </div>
          )}

          {step === "results" && (
            <div>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>Import Complete — {fileName}</div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
                {chip("Inserted", res.inserted ?? 0, "#27500A")}
                {chip("Updated", res.updated ?? 0, "#0C447C")}
                {chip("Skipped", res.skipped ?? 0, "#888")}
                {chip("Failed", res.failed ?? 0, res.failed ? "#A32D2D" : "#888")}
                {chip("Rows with errors", result?.invalid_rows ?? 0, result?.invalid_rows ? "#E6A23C" : "#888")}
              </div>
              {result?.temp_passwords && Object.keys(result.temp_passwords).length > 0 && (
                <div style={{ border:"1px solid #E6C25E", background:"#FFFBEB", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#633806", marginBottom:6 }}>Temporary passwords for new faculty (shown once)</div>
                  {Object.entries(result.temp_passwords).map(([row, tp]) => (
                    <div key={row} style={{ fontSize:12, color:"#555", padding:"2px 0" }}>
                      Row {row} · {tp.email}: <b style={{ fontFamily:"monospace" }}>{tp.password}</b>
                    </div>
                  ))}
                  <div style={{ fontSize:11, color:"#888", marginTop:6 }}>Faculty will be asked to set their own password at first login.</div>
                </div>
              )}
              {result?.generated_ids && Object.keys(result.generated_ids).length > 0 && (
                <div style={{ border:"1px solid #C7D7FB", background:"#F5F8FF", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#0C447C", marginBottom:6 }}>Auto-generated Teacher IDs</div>
                  {Object.entries(result.generated_ids).map(([row, gi]) => (
                    <div key={row} style={{ fontSize:12, color:"#555", padding:"2px 0" }}>
                      Row {row} · {gi.email}: <b style={{ fontFamily:"monospace" }}>{gi.employee_id}</b>
                    </div>
                  ))}
                  <div style={{ fontSize:11, color:"#888", marginTop:6 }}>Teacher IDs were created automatically. Faculty can use them as usernames to log in.</div>
                </div>
              )}
              {result?.row_errors?.length > 0 && (
                <div style={{ border:"1px solid #F3D8D8", background:"#FFF9F9", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#791F1F", marginBottom:8 }}>Skipped rows</div>
                  {result.row_errors.slice(0, 30).map((r, i) => (
                    <div key={i} style={{ fontSize:12, color:"#555", padding:"3px 0", borderBottom:"1px dashed #eee" }}>
                      <b>Row {r.row}</b> · {r.name}: {r.errors.join("; ")}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
                <button style={ghost} onClick={() => { setStep("upload"); setRows([]); setValidation(null); setResult(null); setFileName(""); }}>Import Another</button>
                <button style={btn} onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
