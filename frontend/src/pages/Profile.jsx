import { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import API, { BASE_URL } from "../services/api";

const P = "#5B3DF5";

const PLATFORM_LABELS = {
  google_scholar: "Google Scholar", scopus: "Scopus", orcid: "ORCID", publons: "Publons",
  wos: "Web of Science", linkedin: "LinkedIn", twitter: "Twitter/X", x: "Twitter/X",
  researchgate: "ResearchGate", github: "GitHub", website: "Personal Website",
};

const PLATFORM_ICONS = {
  "google scholar": "🧑‍🔬", scholar: "🧑‍🔬", google_scholar: "🧑‍🔬", scopus: "📘", orcid: "🆔",
  publons: "📊", "web of science": "🔬", wos: "🔬", linkedin: "🔗", twitter: "🐦", x: "🐦",
  researchgate: "🌐", github: "🐙", website: "🌍", "personal website": "🌍", portfolio: "🌍",
  "personal portfolio": "🌍", "semantic scholar": "🧠", dblp: "🗂️", ssrn: "📑", mendeley: "📚",
  "academia.edu": "🎓", academia: "🎓", kaggle: "🏅", "hugging face": "🤗", zenodo: "💾",
  figshare: "📦", medium: "✍️", youtube: "▶️", "stack overflow": "🧑‍💻", "microsoft learn": "🪟",
  microsoft: "🪟",
};

const HOST_ICON_RULES = [
  [/scholar\.google/i, "🧑‍🔬"], [/linkedin/i, "🔗"], [/twitter|^x\.com/i, "🐦"], [/github/i, "🐙"],
  [/researchgate/i, "🌐"], [/orcid/i, "🆔"], [/scopus/i, "📘"], [/semanticscholar/i, "🧠"],
  [/dblp/i, "🗂️"], [/kaggle/i, "🏅"], [/huggingface/i, "🤗"], [/zenodo/i, "💾"], [/figshare/i, "📦"],
  [/medium\.com/i, "✍️"], [/youtube/i, "▶️"], [/stackoverflow/i, "🧑‍💻"], [/mendeley/i, "📚"],
  [/ssrn/i, "📑"], [/academia\.edu/i, "🎓"],
];

const prettyName = (name) => PLATFORM_LABELS[(name || "").toLowerCase()] || (name || "").trim();

const platformIcon = (name, url) => {
  const n = (name || "").toLowerCase().trim();
  if (PLATFORM_ICONS[n]) return PLATFORM_ICONS[n];
  if (url) {
    try {
      const host = new URL(url).hostname;
      for (const [re, ic] of HOST_ICON_RULES) if (re.test(host)) return ic;
    } catch {}
  }
  return "🔗";
};

const validUrl = (u) => {
  if (!u) return false;
  if (u.length > 500) return false;
  try {
    const p = new URL(u);
    return (p.protocol === "http:" || p.protocol === "https:") && !!p.hostname;
  } catch { return false; }
};

const GENDER_OPTIONS = ["Female", "Male", "Other", "Prefer not to say"];

const ACAD_SECTIONS = {
  education: {
    title: "Education", icon: "🎓", endpoint: "/profile/education",
    fields: [
      { key: "degree", label: "Degree", type: "text", required: true },
      { key: "university", label: "University", type: "text" },
      { key: "institute", label: "Institute", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "percentage", label: "Percentage / CGPA", type: "number", step: "0.1" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    certUpload: false,
    keyField: "degree",
  },
  experience: {
    title: "Experience", icon: "💼", endpoint: "/profile/experience",
    fields: [
      { key: "organization", label: "Organization", type: "text", required: true },
      { key: "position", label: "Position", type: "text" },
      { key: "start_date", label: "Start Date", type: "date" },
      { key: "end_date", label: "End Date", type: "date" },
      { key: "is_current", label: "Currently working here", type: "checkbox" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    certUpload: false,
    keyField: "organization",
  },
  achievements: {
    title: "Achievements", icon: "🏆", endpoint: "/profile/achievements",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "category", label: "Category", type: "text" },
      { key: "issuer", label: "Issuer / Organization", type: "text" },
      { key: "year", label: "Year", type: "number" },
      { key: "achievement_date", label: "Date", type: "date" },
      { key: "description", label: "Description", type: "textarea" },
    ],
    certUpload: true,
    keyField: "title",
  },
  certifications: {
    title: "Certifications", icon: "📜", endpoint: "/profile/certifications",
    fields: [
      { key: "name", label: "Certification Name", type: "text", required: true },
      { key: "issuing_org", label: "Issuing Organization", type: "text" },
      { key: "issue_date", label: "Issue Date", type: "date" },
      { key: "expiry_date", label: "Expiry Date", type: "date" },
      { key: "credential_id", label: "Credential ID", type: "text" },
      { key: "credential_url", label: "Credential URL", type: "text" },
    ],
    certUpload: true,
    keyField: "name",
  },
};

const EMPTY_FORMS = {
  education:      { degree: "", university: "", institute: "", year: "", percentage: "", description: "" },
  experience:     { organization: "", position: "", start_date: "", end_date: "", is_current: false, description: "" },
  achievements:   { title: "", category: "Achievement", issuer: "", year: "", achievement_date: "", description: "", certificate_url: "" },
  certifications: { name: "", issuing_org: "", issue_date: "", expiry_date: "", credential_id: "", credential_url: "", certificate_url: "" },
};

const inputStyle = { width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 12, boxSizing: "border-box" };
const labelStyle = { fontSize: 11, color: "#555", display: "block", marginBottom: 3, fontWeight: 500 };

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function fmtRange(entry) {
  if (entry.is_current) return `${fmtDate(entry.start_date) || "—"} – Present`;
  return `${fmtDate(entry.start_date) || "—"} – ${fmtDate(entry.end_date) || "Present"}`;
}

function absUrl(u) {
  if (!u) return "#";
  return u.startsWith("http") ? u : BASE_URL + u;
}

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState("info");
  const [editMode, setEditMode] = useState(null); // "personal" | "professional" | null
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [acad, setAcad] = useState({ section: null, id: null, form: {} }); // academic modal
  const [areaEdit, setAreaEdit] = useState(null); // {id, name}
  const [newArea, setNewArea] = useState("");
  const [linkModal, setLinkModal] = useState(null); // {type, id, platform, url}
  const [linkErrors, setLinkErrors] = useState({});
  const [linkBusy, setLinkBusy] = useState(false);
  const [scholarId, setScholarId] = useState("");
  const [scholarResult, setScholarResult] = useState(null);
  const [orcidId, setOrcidId] = useState("");
  const [orcidResult, setOrcidResult] = useState(null);
  const [scopusId, setScopusId] = useState("");
  const [scopusResult, setScopusResult] = useState(null);
  const [recentPubs, setRecentPubs] = useState([]);
  const photoRef = useRef(null);
  const certRef = useRef(null);

  const showMsg = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

  const fetchProfile = () => {
    API.get("/profile/me")
      .then(res => {
        setProfile(res.data);
        setScholarId(res.data.google_scholar_id || "");
        setOrcidId(res.data.orcid_id || "");
        setScopusId(res.data.scopus_author_id || "");
      })
      .catch(() => showMsg("error", "Failed to load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProfile();
    API.get("/publications/", { params: { limit: 5 } })
      .then(res => setRecentPubs(Array.isArray(res.data) ? res.data.slice(0, 5) : (res.data.publications || []).slice(0, 5)))
      .catch(() => {});
  }, []); // eslint-disable-line

  const run = async (label, fn, successMsg) => {
    setBusy(label);
    try {
      await fn();
      if (successMsg) showMsg("success", successMsg);
      return true;
    } catch (e) {
      showMsg("error", e?.response?.data?.detail || "Something went wrong");
      return false;
    } finally {
      setBusy("");
    }
  };

  if (loading) return <Layout><div style={{ padding: 40, textAlign: "center" }}><div className="spinner" /></div></Layout>;
  if (!profile) return null;

  const initials = profile.name?.split(" ").filter(w => !w.startsWith("Dr.")).slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const roleLabel = profile.role === "hod" ? "Head of Department" : profile.role === "dean_rd" ? "Dean" : "Faculty";
  const completion = profile.completion?.percent || 0;
  const sections = profile.completion?.sections || {};

  // ── Personal / Professional save ──
  const startEdit = (mode) => {
    setErrors({});
    if (mode === "personal") {
      setForm({
        name: profile.name || "", designation: profile.designation || "", phone: profile.phone || "",
        dob: profile.dob || "", gender: profile.gender || "", nationality: profile.nationality || "",
        employee_id: profile.employee_id || "", joining_year: profile.joining_year || "",
        qualification: profile.qualification || "", bio: profile.bio || "",
        google_scholar_id: profile.google_scholar_id || "", orcid_id: profile.orcid_id || "",
        scopus_author_id: profile.scopus_author_id || "",
      });
    } else {
      setForm({
        current_position: profile.current_position || "", office_address: profile.office_address || "",
        institution: profile.institution || "", specialization: profile.specialization || "",
        research_interests: profile.research_interests || "", biography: profile.biography || "",
        languages_spoken: profile.languages_spoken || "",
      });
    }
    setEditMode(mode);
  };

  const saveEdit = async () => {
    const e = {};
    if (editMode === "personal" && !form.name) e.name = "Full name is required";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    const ok = await run("save", () =>
      API.put(`/profile/${editMode}`, editMode === "personal"
        ? { ...form, joining_year: form.joining_year ? Number(form.joining_year) : null }
        : form), "Saved successfully");
    if (ok) {
      if (editMode === "personal" && form.name) localStorage.setItem("name", form.name);
      await fetchProfile();
      setEditMode(null);
    }
    setSaving(false);
  };

  // ── Photo upload ──
  const onPhoto = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setBusy("photo");
    try {
      const res = await API.post("/profile/photo", fd);
      setProfile(p => ({ ...p, profile_photo_url: res.data.profile_photo_url }));
      showMsg("success", "Photo updated");
      await fetchProfile();
    } catch (err) { showMsg("error", err?.response?.data?.detail || "Upload failed"); }
    finally { setBusy(""); }
  };

  // ── Academic sections ──
  const openAcad = (section, entry) => {
    setAcad({ section, id: entry?.id || null, form: { ...EMPTY_FORMS[section], ...(entry || {}) } });
  };

  const saveAcad = async () => {
    const cfg = ACAD_SECTIONS[acad.section];
    const e = {};
    cfg.fields.forEach(f => { if (f.required && !String(acad.form[f.key] || "").trim()) e[f.key] = `${f.label} is required`; });
    setErrors(e);
    if (Object.keys(e).length) return;
    const payload = { ...acad.form };
    cfg.fields.forEach(f => { if (f.type === "number" && payload[f.key] !== "" && payload[f.key] != null) payload[f.key] = Number(payload[f.key]); });
    const ok = await run("save", () =>
      acad.id
        ? API.put(`${cfg.endpoint}/${acad.id}`, payload)
        : API.post(cfg.endpoint, payload), `${cfg.title} saved`);
    if (ok) { await fetchProfile(); setAcad({ section: null, id: null, form: {} }); }
  };

  const delAcad = async (section, id) => {
    if (!window.confirm("Delete this entry?")) return;
    const cfg = ACAD_SECTIONS[section];
    const ok = await run("delete", () => API.delete(`${cfg.endpoint}/${id}`), "Deleted");
    if (ok) { await fetchProfile(); setAcad({ section: null, id: null, form: {} }); }
  };

  // ── Certificate upload (achievements / certifications) ──
  const onCert = async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    setBusy("cert");
    try {
      const res = await API.post("/profile/upload-certificate", fd);
      setAcad(a => ({ ...a, form: { ...a.form, certificate_url: res.data.certificate_url } }));
      showMsg("success", "Certificate uploaded");
    } catch (err) { showMsg("error", err?.response?.data?.detail || "Upload failed"); }
    finally { setBusy(""); }
  };

  // ── Research areas ──
  const addArea = async () => {
    const name = newArea.trim();
    if (!name) return;
    const ok = await run("area", () => API.post("/profile/research-areas", { area_name: name }), "Area added");
    if (ok) { setNewArea(""); await fetchProfile(); }
  };
  const saveArea = async () => {
    if (!areaEdit || !areaEdit.name.trim()) return;
    const ok = await run("area", () => API.put(`/profile/research-areas/${areaEdit.id}`, { area_name: areaEdit.name.trim() }), "Area updated");
    if (ok) { setAreaEdit(null); await fetchProfile(); }
  };
  const delArea = async (id) => {
    const ok = await run("area", () => API.delete(`/profile/research-areas/${id}`), "Area removed");
    if (ok) await fetchProfile();
  };

  // ── Links (dynamic) ──
  const openLinkModal = (type, link) => {
    setLinkErrors({});
    setLinkModal({ type, id: link?.id || null, platform: link?.platform || "", url: link?.url || "" });
  };

  const saveLinkModal = async () => {
    if (!linkModal) return;
    const { type, id, platform, url } = linkModal;
    const errors = {};
    const p = (platform || "").trim();
    if (!p) errors.platform = "Platform name is required";
    else {
      const arr = type === "academic" ? profile.academic_links : profile.social_links;
      const dup = (arr || []).find(l => l.id !== id && (l.platform || "").toLowerCase() === p.toLowerCase());
      if (dup) errors.platform = `Link for '${p}' already exists`;
    }
    const u = (url || "").trim();
    if (u && !validUrl(u)) errors.url = "Enter a valid URL starting with http(s)://";
    setLinkErrors(errors);
    if (Object.keys(errors).length) return;
    setLinkBusy(true);
    const ep = type === "academic" ? "/profile/academic-links" : "/profile/social-links";
    const ok = await run("link", () =>
      id ? API.put(`${ep}/${id}`, { platform: p, url: u }) : API.post(ep, { platform: p, url: u }),
      id ? "Link updated" : "Link added");
    if (ok) { setLinkModal(null); setLinkErrors({}); await fetchProfile(); }
    setLinkBusy(false);
  };

  const deleteLink = async (type, link) => {
    if (!window.confirm(`Remove "${prettyName(link.platform)}"?`)) return;
    const ep = type === "academic" ? "/profile/academic-links" : "/profile/social-links";
    const ok = await run("link", () => API.delete(`${ep}/${link.id}`), "Link removed");
    if (ok) await fetchProfile();
  };

  const renderLinkRow = (type, link) => {
    const url = link.url || "";
    const connected = type === "academic" ? !!link.is_connected : !!url;
    return (
      <div key={link.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid #f5f5f5" }}>
        <span style={{ fontSize: 16 }}>{platformIcon(link.platform, url)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prettyName(link.platform)}</div>
          <div style={{ fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#22c55e" : "#E5484D", display: "inline-block" }} />
            <span style={{ color: connected ? "#27500A" : "#888" }}>{connected ? "Connected" : "Not Connected"}</span>
          </div>
        </div>
        {url && <a href={absUrl(url)} target="_blank" rel="noreferrer" title="Open" style={{ ...iconBtn, textDecoration: "none", color: "#0C447C" }}>↗</a>}
        <button onClick={() => openLinkModal(type, link)} title="Edit" style={iconBtn}>✎</button>
        <button onClick={() => deleteLink(type, link)} title="Delete" style={{ ...iconBtn, color: "#E5484D" }}>✕</button>
      </div>
    );
  };

  const renderLinkList = (type) => {
    const arr = type === "academic" ? (profile.academic_links || []) : (profile.social_links || []);
    if (!arr.length)
      return (
        <div style={{ padding: "14px 16px", fontSize: 12, color: "#999", textAlign: "center", border: "1px dashed #ddd", borderRadius: 10 }}>
          No {type === "academic" ? "academic" : "social"} links added yet.
        </div>
      );
    return <div>{arr.map(l => renderLinkRow(type, l))}</div>;
  };

  // ── Scholar sync ──
  const saveScholarId = async () => {
    const ok = await run("save", () => API.put("/profile/personal", { google_scholar_id: scholarId.trim() }), "Scholar ID saved");
    if (ok) await fetchProfile();
  };
  const syncScholar = async () => {
    setBusy("scholar");
    setScholarResult(null);
    try {
      const res = await API.post("/sync/scholar");
      setScholarResult(res.data);
      showMsg("success", "Sync complete");
      await fetchProfile();
      API.get("/publications/", { params: { limit: 5 } })
        .then(r => setRecentPubs(Array.isArray(r.data) ? r.data.slice(0, 5) : (r.data.publications || []).slice(0, 5)))
        .catch(() => {});
    } catch (err) {
      showMsg("error", err?.response?.data?.detail || "Sync failed. Try again later.");
    } finally {
      setBusy("");
    }
  };

  const saveOrcidId = async () => {
    const ok = await run("save", () => API.put("/profile/personal", { orcid_id: orcidId.trim() }), "ORCID iD saved");
    if (ok) await fetchProfile();
  };
  const syncOrcid = async () => {
    setBusy("orcid");
    setOrcidResult(null);
    try {
      const res = await API.post("/sync/orcid");
      setOrcidResult(res.data);
      showMsg("success", "ORCID sync complete");
      await fetchProfile();
    } catch (err) {
      showMsg("error", err?.response?.data?.detail || "ORCID sync failed.");
    } finally {
      setBusy("");
    }
  };
  const saveScopusId = async () => {
    const ok = await run("save", () => API.put("/profile/personal", { scopus_author_id: scopusId.trim() }), "Scopus Author ID saved");
    if (ok) await fetchProfile();
  };
  const syncScopus = async () => {
    setBusy("scopus");
    setScopusResult(null);
    try {
      const res = await API.post("/sync/scopus");
      setScopusResult(res.data);
      showMsg("success", "Scopus sync complete");
      await fetchProfile();
    } catch (err) {
      showMsg("error", err?.response?.data?.detail || "Scopus sync failed.");
    } finally {
      setBusy("");
    }
  };

  const renderField = (f) => {
    const val = acad.form[f.key];
    if (f.type === "textarea")
      return <textarea rows={3} value={val || ""} onChange={e => setAcad(a => ({ ...a, form: { ...a.form, [f.key]: e.target.value } }))} style={{ ...inputStyle, fontFamily: "inherit" }} />;
    if (f.type === "checkbox")
      return <input type="checkbox" checked={!!val} onChange={e => setAcad(a => ({ ...a, form: { ...a.form, [f.key]: e.target.checked } }))} style={{ width: 16, height: 16 }} />;
    if (f.type === "date")
      return <input type="date" value={val || ""} onChange={e => setAcad(a => ({ ...a, form: { ...a.form, [f.key]: e.target.value } }))} style={inputStyle} />;
    return (
      <input type={f.type || "text"} step={f.step} value={val ?? ""}
        onChange={e => setAcad(a => ({ ...a, form: { ...a.form, [f.key]: e.target.value } }))}
        style={{ ...inputStyle, borderColor: errors[f.key] ? "#E5484D" : "#ddd" }} />
    );
  };

  const renderAcadList = (section) => {
    const cfg = ACAD_SECTIONS[section];
    const items = profile[section] || [];
    if (!items.length)
      return (
        <div style={{ padding: "14px 16px", fontSize: 12, color: "#999", textAlign: "center", border: "1px dashed #ddd", borderRadius: 10 }}>
          No {cfg.title.toLowerCase()} added yet.
        </div>
      );
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "#f8f8fb", borderRadius: 10, border: "1px solid #f0f0f5" }}>
            <span style={{ fontSize: 16, marginTop: 1 }}>{cfg.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>{item[cfg.keyField] || "—"}</div>
              {section === "experience" && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                  {item.position}{item.position && item.organization ? " · " : ""}{item.organization} <span style={{ color: "#aaa" }}>· {fmtRange(item)}</span>
                </div>
              )}
              {section === "education" && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                  {item.university}{item.year ? ` · ${item.year}` : ""}{item.percentage != null && item.percentage !== "" ? ` · ${item.percentage}` : ""}
                </div>
              )}
              {section === "achievements" && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                  {item.category}{item.issuer ? ` · ${item.issuer}` : ""}{item.year ? ` · ${item.year}` : ""}{item.achievement_date ? ` · ${fmtDate(item.achievement_date)}` : ""}
                </div>
              )}
              {section === "certifications" && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                  {item.issuing_org}{item.issue_date ? ` · ${fmtDate(item.issue_date)}` : ""}{item.expiry_date ? ` – ${fmtDate(item.expiry_date)}` : ""}
                </div>
              )}
              {item.description && <div style={{ fontSize: 11, color: "#888", marginTop: 3, lineHeight: 1.5 }}>{item.description}</div>}
              {item.certificate_url && (
                <a href={absUrl(item.certificate_url)} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 4, fontSize: 11, color: P, fontWeight: 500 }}>
                  📎 View Certificate ↗
                </a>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => openAcad(section, item)} style={{ ...iconBtn, color: "#888" }}>✎</button>
              <button onClick={() => delAcad(section, item.id)} style={{ ...iconBtn, color: "#E5484D" }}>✕</button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const iconBtn = { width: 24, height: 24, borderRadius: 6, border: "none", background: "#fff", cursor: "pointer", fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" };

  return (
    <Layout>
      {msg && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999, background: msg.type === "success" ? "#EAF3DE" : "#FCEBEB", color: msg.type === "success" ? "#27500A" : "#791F1F", padding: "10px 18px", borderRadius: 10, fontSize: 13, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>{msg.text}</div>}

      <div style={{ flex: 1, overflowY: "auto", background: "#f5f5f8" }}>

        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e8ee", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>My Profile</div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>View and manage your personal and professional information</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {busy === "scholar" && <span style={{ fontSize: 11, color: P, fontWeight: 500 }}>Syncing…</span>}
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 600 }}>{initials}</div>
          </div>
        </div>

        <div style={{ padding: 16 }}>

          {/* Three-column layout */}
          <div style={{ display: "flex", gap: 14, alignItems: "start", marginBottom: 14 }}>

            {/* ═══ LEFT: Profile Card + Metrics ═══ */}
            <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "#fff", borderRadius: 16, padding: "20px 16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5" }}>
                <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", margin: "0 auto 12px", overflow: "hidden", background: `linear-gradient(135deg,${P},#185FA5)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {profile.profile_photo_url
                    ? <img src={absUrl(profile.profile_photo_url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>{initials}</span>}
                  <div onClick={() => photoRef.current?.click()} title="Upload photo"
                    style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: "50%", background: P, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", fontSize: 11, color: "#fff" }}>
                    {busy === "photo" ? "…" : "📷"}
                  </div>
                  <input ref={photoRef} type="file" accept="image/*" onChange={onPhoto} style={{ display: "none" }} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a1a" }}>{profile.name}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>{profile.designation || "Designation not added yet"}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 10, background: "#EEEDFE", color: P, padding: "3px 10px", borderRadius: 12, fontWeight: 500 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                  {roleLabel}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 8, lineHeight: 1.7 }}>
                  <div>🏢 {profile.dept_name || "Department not assigned"}</div>
                  <div>✉ {profile.email}</div>
                  {profile.joining_year && <div>📅 Joined {profile.joining_year}</div>}
                </div>
              </div>

              {/* Metrics */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Research Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    ["h-index", profile.h_index, P],
                    ["i10-index", profile.i10_index, "#0C447C"],
                    ["Publications", profile.total_publications, "#27500A"],
                    ["Citations", profile.total_citations?.toLocaleString(), "#633806"],
                    ["Score", profile.research_score, "#A32D2D"],
                    ["Avg IF", profile.avg_impact_factor ?? "N/A", "#085041"],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ textAlign: "center", padding: "6px 0" }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color }}>{val ?? 0}</div>
                      <div style={{ fontSize: 9, color: "#aaa" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ CENTER: Tabs ═══ */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5", overflow: "hidden", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #eee", padding: "0 16px" }}>
                  {[
                    { key: "info", label: "Profile Info" },
                    { key: "metrics", label: "Research Metrics" },
                    { key: "scholar", label: "Research Platforms" },
                    { key: "academic", label: "Academic Identity" },
                  ].map(t => (
                    <div key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 14px", fontSize: 12, fontWeight: 500, cursor: "pointer", color: tab === t.key ? P : "#888", borderBottom: tab === t.key ? `2px solid ${P}` : "2px solid transparent", transition: "all 0.15s" }}>{t.label}</div>
                  ))}
                </div>

                {/* ── Profile Info Tab ── */}
                {tab === "info" && (
                  <div style={{ padding: 16 }}>
                    {/* Personal Information */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Personal Information</span>
                        {editMode !== "personal" && (
                          <button onClick={() => startEdit("personal")} style={{ padding: "6px 14px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>✏ Edit Personal Information</button>
                        )}
                      </div>

                      {editMode === "personal" ? (
                        <div style={{ background: "#f8f8fb", borderRadius: 12, padding: 14, border: "1px solid #f0f0f5" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {[
                              ["Full Name", "name", "text"],
                              ["Designation", "designation", "text"],
                              ["Phone", "phone", "text"],
                              ["Date of Birth", "dob", "date"],
                              ["Gender", "gender", "select"],
                              ["Nationality", "nationality", "text"],
                              ["Employee ID", "employee_id", "text"],
                              ["Joining Year", "joining_year", "number"],
                              ["Qualification", "qualification", "text"],
                              ["Google Scholar ID", "google_scholar_id", "text"],
                              ["ORCID ID", "orcid_id", "text"],
                              ["Scopus Author ID", "scopus_author_id", "text"],
                            ].map(([label, key, type]) => (
                              <div key={key}>
                                <label style={labelStyle}>{label} {key === "name" && <span style={{ color: "#E5484D" }}>*</span>}</label>
                                {type === "select" ? (
                                  <select value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ ...inputStyle, borderColor: errors[key] ? "#E5484D" : "#ddd" }}>
                                    <option value="">Not selected</option>
                                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                  </select>
                                ) : (
                                  <input type={type} value={form[key] ?? ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={{ ...inputStyle, borderColor: errors[key] ? "#E5484D" : "#ddd" }} />
                                )}
                                {errors[key] && <div style={{ fontSize: 10, color: "#E5484D", marginTop: 2 }}>{errors[key]}</div>}
                              </div>
                            ))}
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Bio</label>
                              <textarea rows={3} value={form.bio || ""} onChange={e => setForm({ ...form, bio: e.target.value })} style={{ ...inputStyle, fontFamily: "inherit" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                            <button onClick={() => setEditMode(null)} style={{ padding: "7px 16px", border: "1px solid #ddd", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer" }}>Cancel</button>
                            <button onClick={saveEdit} disabled={saving || busy === "save"} style={{ padding: "7px 16px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", opacity: saving || busy === "save" ? 0.6 : 1 }}>{saving ? "Saving…" : "Save Changes"}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                          {[
                            ["Full Name", profile.name],
                            ["Email", profile.email],
                            ["Designation", profile.designation],
                            ["Phone", profile.phone],
                            ["Date of Birth", profile.dob],
                            ["Gender", profile.gender],
                            ["Nationality", profile.nationality],
                            ["Employee ID", profile.employee_id],
                            ["Joining Year", profile.joining_year],
                            ["Qualification", profile.qualification],
                            ["Google Scholar ID", profile.google_scholar_id],
                            ["ORCID ID", profile.orcid_id],
                            ["Scopus Author ID", profile.scopus_author_id],
                          ].map(([label, val]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                              <div>
                                <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
                                <div style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>{val || "Not Added Yet"}</div>
                              </div>
                            </div>
                          ))}
                          {profile.bio && (
                            <div style={{ gridColumn: "1 / -1", padding: "6px 0" }}>
                              <div style={{ fontSize: 10, color: "#888" }}>Bio</div>
                              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{profile.bio}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Professional Information */}
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>Professional Information</span>
                        {editMode !== "professional" && (
                          <button onClick={() => startEdit("professional")} style={{ padding: "6px 14px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>✏ Edit Professional Information</button>
                        )}
                      </div>

                      {/* Research areas chips */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>Research Areas</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(profile.research_areas || []).map(a => areaEdit?.id === a.id ? (
                            <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <input autoFocus value={areaEdit.name} onChange={e => setAreaEdit({ ...areaEdit, name: e.target.value })}
                                onKeyDown={e => { if (e.key === "Enter") saveArea(); if (e.key === "Escape") setAreaEdit(null); }}
                                style={{ width: 130, padding: "4px 8px", border: `1px solid ${P}`, borderRadius: 14, fontSize: 11, outline: "none" }} />
                              <button onClick={saveArea} style={iconBtn}>✓</button>
                              <button onClick={() => setAreaEdit(null)} style={iconBtn}>✕</button>
                            </span>
                          ) : (
                            <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px 4px 12px", borderRadius: 14, background: "#EEEDFE", color: P, fontWeight: 500 }}>
                              {a.area_name}
                              <span onClick={() => setAreaEdit({ id: a.id, name: a.area_name })} style={{ cursor: "pointer", opacity: 0.7 }}>✎</span>
                              <span onClick={() => delArea(a.id)} style={{ cursor: "pointer", opacity: 0.7 }}>✕</span>
                            </span>
                          ))}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <input value={newArea} onChange={e => setNewArea(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") addArea(); }}
                              placeholder="+ Add" style={{ width: 90, padding: "4px 8px", border: "1px dashed #ddd", borderRadius: 14, fontSize: 11, color: "#888", outline: "none" }} />
                            {newArea.trim() && <button onClick={addArea} style={iconBtn}>✓</button>}
                          </span>
                        </div>
                      </div>

                      {editMode === "professional" ? (
                        <div style={{ background: "#f8f8fb", borderRadius: 12, padding: 14, border: "1px solid #f0f0f5" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {[
                              ["Current Position", "current_position", "text"],
                              ["Institution", "institution", "text"],
                              ["Office Address", "office_address", "text"],
                              ["Specialization", "specialization", "text"],
                              ["Languages Spoken", "languages_spoken", "text"],
                            ].map(([label, key]) => (
                              <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input value={form[key] || ""} onChange={e => setForm({ ...form, [key]: e.target.value })} style={inputStyle} />
                              </div>
                            ))}
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Research Interests</label>
                              <input value={form.research_interests || ""} onChange={e => setForm({ ...form, research_interests: e.target.value })} placeholder="e.g. Deep Learning, NLP, Computer Vision" style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={labelStyle}>Biography</label>
                              <textarea rows={3} value={form.biography || ""} onChange={e => setForm({ ...form, biography: e.target.value })} style={{ ...inputStyle, fontFamily: "inherit" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
                            <button onClick={() => setEditMode(null)} style={{ padding: "7px 16px", border: "1px solid #ddd", borderRadius: 8, fontSize: 12, background: "#fff", cursor: "pointer" }}>Cancel</button>
                            <button onClick={saveEdit} disabled={saving || busy === "save"} style={{ padding: "7px 16px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer", opacity: saving || busy === "save" ? 0.6 : 1 }}>{saving ? "Saving…" : "Save Changes"}</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                          {[
                            ["Current Position", profile.current_position],
                            ["Department", profile.dept_name],
                            ["School", profile.school_name],
                            ["Institution", profile.institution],
                            ["Office Address", profile.office_address],
                            ["Specialization", profile.specialization],
                            ["Languages Spoken", profile.languages_spoken],
                            ["Research Interests", profile.research_interests],
                          ].map(([label, val]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                              <div>
                                <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
                                <div style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>{val || "Not Added Yet"}</div>
                              </div>
                            </div>
                          ))}
                          {profile.biography && (
                            <div style={{ gridColumn: "1 / -1", padding: "6px 0" }}>
                              <div style={{ fontSize: 10, color: "#888" }}>Biography</div>
                              <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{profile.biography}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Academic sections */}
                    {["education", "experience", "achievements", "certifications"].map(section => (
                      <div key={section} style={{ marginBottom: 18 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{ACAD_SECTIONS[section].icon} {ACAD_SECTIONS[section].title}</span>
                          <button onClick={() => openAcad(section, null)} style={{ padding: "6px 14px", border: `1px solid ${P}`, color: P, borderRadius: 8, fontSize: 12, fontWeight: 500, background: "#fff", cursor: "pointer" }}>+ Add {ACAD_SECTIONS[section].title.slice(0, -1)}</button>
                        </div>
                        {renderAcadList(section)}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Research Metrics Tab ── */}
                {tab === "metrics" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Research Metrics</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                      {[
                        ["h-index", profile.h_index, P],
                        ["i10-index", profile.i10_index, "#0C447C"],
                        ["Total Publications", profile.total_publications, "#27500A"],
                        ["Total Citations", profile.total_citations?.toLocaleString(), "#633806"],
                        ["Avg Impact Factor", profile.avg_impact_factor ?? "N/A", "#085041"],
                        ["Research Score", profile.research_score, "#A32D2D"],
                      ].map(([label, val, color]) => (
                        <div key={label} style={{ background: "#f8f8fb", borderRadius: 12, padding: "16px", textAlign: "center" }}>
                          <div style={{ fontSize: 26, fontWeight: 700, color }}>{val ?? 0}</div>
                          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", marginTop: 14, padding: "10px 0", borderTop: "1px solid #eee" }}>Metrics are read-only and updated automatically when publications are added or Google Scholar sync is run.</div>
                  </div>
                )}

                {/* ── Google Scholar Tab ── */}
                {tab === "scholar" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Research Platforms</div>

                    {/* ── Google Scholar ── */}
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🎓 Google Scholar</div>
                    <div style={{ background: profile.google_scholar_id ? "#EAF3DE" : "#FAEEDA", border: `1px solid ${profile.google_scholar_id ? "#27500A" : "#633806"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{profile.google_scholar_id ? "✅" : "⚠️"}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: profile.google_scholar_id ? "#27500A" : "#633806" }}>{profile.google_scholar_id ? "Google Scholar ID is set" : "Google Scholar ID not set"}</div>
                        <div style={{ fontSize: 11, color: "#555" }}>{profile.google_scholar_id ? `ID: ${profile.google_scholar_id}` : "Set your Scholar ID to enable auto-sync"}</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Google Scholar ID</label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input value={scholarId} onChange={e => setScholarId(e.target.value)} style={{ flex: 1, ...inputStyle }} placeholder="e.g. 8XXy5vkAAAAJ" />
                        <button onClick={saveScholarId} disabled={busy === "save"} style={{ padding: "7px 16px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>Save ID</button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <button onClick={syncScholar} disabled={busy === "scholar" || !profile.google_scholar_id} style={{ padding: "8px 18px", background: "#0C447C", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: profile.google_scholar_id ? "pointer" : "not-allowed", opacity: profile.google_scholar_id ? 1 : 0.5 }}>
                        {busy === "scholar" ? "Syncing…" : "🔄 Sync Google Scholar"}
                      </button>
                      {scholarResult && (
                        <div style={{ marginTop: 10, background: "#EAF3DE", border: "1px solid #27500A", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#27500A", lineHeight: 1.7 }}>
                          Sync complete — {scholarResult.new_publications || 0} new publication(s), {scholarResult.citations_updated || 0} citation(s) updated, {scholarResult.already_existed || 0} already existed.
                        </div>
                      )}
                    </div>

                    {/* ── ORCID ── */}
                    <div style={{ borderTop: "1px solid #eee", paddingTop: 16, marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🆔 ORCID</div>
                      <div style={{ background: profile.orcid_id ? "#EAF3DE" : "#FAEEDA", border: `1px solid ${profile.orcid_id ? "#27500A" : "#633806"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{profile.orcid_id ? "✅" : "⚠️"}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: profile.orcid_id ? "#27500A" : "#633806" }}>{profile.orcid_id ? "ORCID iD is set" : "ORCID iD not set"}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{profile.orcid_id ? `iD: ${profile.orcid_id}` : "Set your ORCID iD to auto-import your works"}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>ORCID iD</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={orcidId} onChange={e => setOrcidId(e.target.value)} style={{ flex: 1, ...inputStyle }} placeholder="e.g. 0000-0001-2345-6789" />
                          <button onClick={saveOrcidId} disabled={busy === "save"} style={{ padding: "7px 16px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>Save iD</button>
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <button onClick={syncOrcid} disabled={busy === "orcid" || !profile.orcid_id} style={{ padding: "8px 18px", background: "#0C447C", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: profile.orcid_id ? "pointer" : "not-allowed", opacity: profile.orcid_id ? 1 : 0.5 }}>
                          {busy === "orcid" ? "Syncing…" : "🔄 Sync ORCID"}
                        </button>
                        {orcidResult && (
                          <div style={{ marginTop: 10, background: "#EAF3DE", border: "1px solid #27500A", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#27500A", lineHeight: 1.7 }}>
                            Sync complete — {orcidResult.new_publications || 0} new publication(s), {orcidResult.already_existed || 0} already existed.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Scopus ── */}
                    <div style={{ borderTop: "1px solid #eee", paddingTop: 16, marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>📘 Scopus</div>
                      <div style={{ background: profile.scopus_author_id ? "#EAF3DE" : "#FAEEDA", border: `1px solid ${profile.scopus_author_id ? "#27500A" : "#633806"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{profile.scopus_author_id ? "✅" : "⚠️"}</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: profile.scopus_author_id ? "#27500A" : "#633806" }}>{profile.scopus_author_id ? "Scopus Author ID is set" : "Scopus Author ID not set"}</div>
                          <div style={{ fontSize: 11, color: "#555" }}>{profile.scopus_author_id ? `ID: ${profile.scopus_author_id}` : "Set your Scopus Author ID to auto-import your documents"}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={labelStyle}>Scopus Author ID</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input value={scopusId} onChange={e => setScopusId(e.target.value)} style={{ flex: 1, ...inputStyle }} placeholder="e.g. 7005103581" />
                          <button onClick={saveScopusId} disabled={busy === "save"} style={{ padding: "7px 16px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>Save ID</button>
                        </div>
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <button onClick={syncScopus} disabled={busy === "scopus" || !profile.scopus_author_id} style={{ padding: "8px 18px", background: "#0C447C", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: profile.scopus_author_id ? "pointer" : "not-allowed", opacity: profile.scopus_author_id ? 1 : 0.5 }}>
                          {busy === "scopus" ? "Syncing…" : "🔄 Sync Scopus"}
                        </button>
                        {scopusResult && (
                          <div style={{ marginTop: 10, background: "#EAF3DE", border: "1px solid #27500A", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#27500A", lineHeight: 1.7 }}>
                            Sync complete — {scopusResult.new_publications || 0} new publication(s), {scopusResult.already_existed || 0} already existed.
                          </div>
                        )}
                        {!scopusResult && !profile.scopus_author_id && (
                          <div style={{ marginTop: 10, fontSize: 11, color: "#999" }}>Scopus sync requires an Elsevier API key configured by the administrator.</div>
                        )}
                      </div>
                    </div>

                    {/* ── Metrics ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
                      {[
                        ["h-index", profile.h_index, P],
                        ["i10-index", profile.i10_index, "#0C447C"],
                        ["Citations", profile.total_citations?.toLocaleString(), "#633806"],
                        ["Publications", profile.total_publications, "#27500A"],
                      ].map(([label, val, color]) => (
                        <div key={label} style={{ background: "#f8f8fb", borderRadius: 10, padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color }}>{val ?? 0}</div>
                          <div style={{ fontSize: 10, color: "#888" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", marginBottom: 8 }}>Recent Publications</div>
                    {recentPubs.length ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {recentPubs.map(p => (
                          <div key={p.pub_id || p.id || p.title} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "#f8f8fb", borderRadius: 8, border: "1px solid #f0f0f5" }}>
                            <span style={{ fontSize: 12, color: "#888", marginTop: 1 }}>📄</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a", lineHeight: 1.4 }}>{p.title}</div>
                              <div style={{ fontSize: 10, color: "#888" }}>{p.journal_name}{p.year ? ` · ${p.year}` : ""}{p.citations_count != null ? ` · ${p.citations_count} cit.` : ""}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#999" }}>No publications yet. Run a sync to pull them from a research platform.</div>
                    )}
                  </div>
                )}

                {/* ── Academic Identity Tab ── */}
                {tab === "academic" && (
                  <div style={{ padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Academic Identity</div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 14 }}>Connect your researcher profiles to establish your academic identity. Add any platform — the list is not limited to the defaults.</div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Academic Links</span>
                      <button onClick={() => openLinkModal("academic", null)} style={{ padding: "6px 14px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>+ Add Link</button>
                    </div>
                    {renderLinkList("academic")}

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Social Links</span>
                      <button onClick={() => openLinkModal("social", null)} style={{ padding: "6px 14px", background: P, color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}>+ Add Link</button>
                    </div>
                    {renderLinkList("social")}
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT: Completion + Links ═══ */}
            <div style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Completion */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "16px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5" }}>
                <div style={{ position: "relative", width: 80, height: 80, margin: "0 auto 8px" }}>
                  <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f5" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke={P} strokeWidth="2.5" strokeDasharray={`${completion},100`} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: P }}>{completion}%</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a" }}>Profile Complete</div>
                <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{completion >= 90 ? "Excellent! Profile is nearly complete." : completion >= 60 ? "Good progress. Keep going!" : "Add more details to improve your profile."}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 10, textAlign: "left" }}>
                  {[
                    ["Photo", sections.photo || 0, 5],
                    ["Personal", sections.personal || 0, 20],
                    ["Professional", sections.professional || 0, 20],
                    ["Academic Links", sections.academic_links || 0, 10],
                    ["Social Links", sections.social_links || 0, 10],
                    ["Education", sections.education || 0, 10],
                    ["Experience", sections.experience || 0, 10],
                    ["Achievements", sections.achievements || 0, 10],
                    ["Certifications", sections.certifications || 0, 5],
                  ].map(([label, val, w]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#666" }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 600, color: val >= w ? "#22c55e" : "#888" }}>{val}/{w}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic Links */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Academic Links</div>
                {(profile.academic_links || []).length ? profile.academic_links.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 14 }}>{platformIcon(l.platform, l.url)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#1a1a1a", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prettyName(l.platform)}</div>
                      <div style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: l.is_connected ? "#22c55e" : "#E5484D", display: "inline-block" }} />
                        <span style={{ color: l.is_connected ? "#27500A" : "#888" }}>{l.is_connected ? "Connected" : "Not Connected"}</span>
                      </div>
                    </div>
                    {l.url && <a href={absUrl(l.url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#aaa", cursor: "pointer", textDecoration: "none" }}>↗</a>}
                  </div>
                )) : <div style={{ fontSize: 10, color: "#999", padding: "6px 0" }}>No links yet. Manage them in Academic Identity.</div>}
              </div>

              {/* Social Links */}
              <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", border: "1px solid #f0f0f5" }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Social Links</div>
                {(profile.social_links || []).length ? profile.social_links.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #f5f5f5" }}>
                    <span style={{ fontSize: 14 }}>{platformIcon(l.platform, l.url)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: "#1a1a1a", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{prettyName(l.platform)}</div>
                      <div style={{ fontSize: 9, color: l.url ? "#27500A" : "#888" }}>{l.url ? "Connected" : "Not Connected"}</div>
                    </div>
                    {l.url && <a href={absUrl(l.url)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#aaa", cursor: "pointer", textDecoration: "none" }}>↗</a>}
                  </div>
                )) : <div style={{ fontSize: 10, color: "#999", padding: "6px 0" }}>No links yet. Manage them in Academic Identity.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ACADEMIC ENTRY MODAL ═══ */}
      {acad.section && (() => {
        const cfg = ACAD_SECTIONS[acad.section];
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
            <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", width: 520, maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{cfg.icon} {acad.id ? `Edit ${cfg.title.slice(0, -1)}` : `Add ${cfg.title.slice(0, -1)}`}</span>
                <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }} onClick={() => setAcad({ section: null, id: null, form: {} })}>×</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {cfg.fields.map(f => (
                  <div key={f.key} style={f.type === "textarea" ? { gridColumn: "1 / -1" } : {}}>
                    <label style={labelStyle}>{f.label} {f.required && <span style={{ color: "#E5484D" }}>*</span>}</label>
                    {renderField(f)}
                    {errors[f.key] && <div style={{ fontSize: 10, color: "#E5484D", marginTop: 2 }}>{errors[f.key]}</div>}
                  </div>
                ))}
              </div>
              {cfg.certUpload && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Certificate</label>
                  {acad.form.certificate_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#f8f8fb", borderRadius: 8, border: "1px solid #f0f0f5" }}>
                      <span style={{ fontSize: 13 }}>📎</span>
                      <a href={absUrl(acad.form.certificate_url)} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 11, color: P, fontWeight: 500, textDecoration: "none" }}>View uploaded certificate ↗</a>
                      <button onClick={() => setAcad(a => ({ ...a, form: { ...a.form, certificate_url: "" } }))} style={iconBtn}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => certRef.current?.click()} style={{ width: "100%", padding: "10px", border: "1px dashed #ddd", borderRadius: 8, fontSize: 12, color: "#888", background: "#fff", cursor: "pointer" }}>{busy === "cert" ? "Uploading…" : "⬆ Upload certificate"}</button>
                  )}
                  <input ref={certRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" onChange={onCert} style={{ display: "none" }} />
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button onClick={() => setAcad({ section: null, id: null, form: {} })} style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer" }}>Cancel</button>
                <button onClick={saveAcad} disabled={busy === "save"} style={{ flex: 2, padding: 10, background: P, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", opacity: busy === "save" ? 0.6 : 1 }}>{busy === "save" ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ ADD / EDIT LINK MODAL ═══ */}
      {linkModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 210 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "24px 28px", width: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{linkModal.id ? `Edit ${linkModal.type === "academic" ? "Academic" : "Social"} Link` : `Add ${linkModal.type === "academic" ? "Academic" : "Social"} Link`}</span>
              <span style={{ cursor: "pointer", color: "#888", fontSize: 22 }} onClick={() => setLinkModal(null)}>×</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Platform Name <span style={{ color: "#E5484D" }}>*</span></label>
              <input autoFocus value={linkModal.platform} onChange={e => setLinkModal({ ...linkModal, platform: e.target.value })}
                placeholder="e.g. Semantic Scholar, DBLP, Kaggle, Mendeley…"
                style={{ ...inputStyle, borderColor: linkErrors.platform ? "#E5484D" : "#ddd" }} />
              {linkErrors.platform && <div style={{ fontSize: 10, color: "#E5484D", marginTop: 2 }}>{linkErrors.platform}</div>}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>URL</label>
              <input value={linkModal.url} onChange={e => setLinkModal({ ...linkModal, url: e.target.value })}
                placeholder="https://…"
                style={{ ...inputStyle, borderColor: linkErrors.url ? "#E5484D" : "#ddd" }} />
              {linkErrors.url && <div style={{ fontSize: 10, color: "#E5484D", marginTop: 2 }}>{linkErrors.url}</div>}
              <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>Leave empty to save as "Not Connected".</div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button onClick={() => setLinkModal(null)} style={{ flex: 1, padding: 10, border: "1px solid #ddd", borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer" }}>Cancel</button>
              <button onClick={saveLinkModal} disabled={linkBusy} style={{ flex: 2, padding: 10, background: P, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", opacity: linkBusy ? 0.6 : 1 }}>{linkBusy ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
