import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getPublication, deletePublication } from "../services/api";

const P = "#534AB7";
const PL = "rgba(83,74,183,0.08)";

const Q_COLORS = { Q1:"#0C447C", Q2:"#27500A", Q3:"#BA7517", Q4:"#A32D2D" };
const Q_BG    = { Q1:"#E6F1FB", Q2:"#EAF3DE", Q3:"#FAEEDA", Q4:"#FCEBEB" };

export default function PublicationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pub, setPub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedAbstract, setExpandedAbstract] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublication(id);
      setPub(res.data);
    } catch {
      alert("Publication not found"); navigate("/publications");
    } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async () => {
    if (window.confirm("Delete this publication?")) {
      await deletePublication(id); navigate("/publications");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", background:"#f7f7f8" }}>
          <div className="spinner" />
        </div>
      </Layout>
    );
  }
  if (!pub) return null;

  const f = pub.publication;

  // Author list
  const authors = pub.authors || [];
  const authorStr = authors.map(a => a.name).join(", ") || "—";

  // Metrics
  const metrics = [
    { label:"Citations", value:f.citations_count || 0, icon:"📊" },
    { label:"Citations per Year", value:pub.citations_per_year || "0.0", icon:"📈" },
    { label:"h-index (Pub)", value:pub.h_index_publication || "—", icon:"📉" },
  ];

  // Citation chart
  const citData = pub.citations_by_year || [];

  const maxCit = Math.max(...citData.map(c => c.citations), 1);

  // Similar pubs
  const similar = pub.similar || [];

  const metaFields = [
    { label:"DOI", value:f.doi },
    { label:"Publisher", value:f.publisher },
    { label:"Volume", value:f.volume },
    { label:"Issue", value:f.issue },
    { label:"Pages", value:f.pages },
    { label:"ISSN", value:f.issn },
    { label:"ISBN", value:f.isbn },
    { label:"Research Area", value:f.research_area },
    { label:"Sub Area", value:f.sub_area },
    { label:"Language", value:f.language },
    { label:"Country", value:f.country },
    { label:"Publication Date", value:f.publication_date || "—" },
    { label:"Status", value:f.status },
  ];

  return (
    <Layout>
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#f7f7f8", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #eee", padding:"12px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ color:P, fontSize:13, cursor:"pointer" }} onClick={()=>navigate("/publications")}>← Back to Publications</span>
          <span style={{ color:"#ccc" }}>|</span>
          <span style={{ fontSize:12, color:"#888", maxWidth:400, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.title}</span>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", gap:16, flexWrap:"wrap" }}>
          {/* Main content */}
          <div style={{ flex:"1 1 0", minWidth:0 }}>
            {/* Title + badges */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"20px 22px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1 }}>
                  <h1 style={{ fontSize:18, fontWeight:600, lineHeight:1.3, margin:"0 0 8px", color:"#222" }}>{f.title}</h1>
                  <div style={{ fontSize:12, color:"#555", lineHeight:1.5 }}>{authorStr}</div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  {f.quartile && f.quartile !== "N/A" && (
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:600, background:Q_BG[f.quartile]||"#f0f0f0", color:Q_COLORS[f.quartile]||"#888" }}>{f.quartile}</span>
                  )}
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:500, background:"#EEEDFE", color:P }}>{f.indexing}</span>
                  <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:500, background:"#EAEEF3", color:"#0C447C" }}>{f.year}</span>
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {metrics.map(m => (
                <div key={m.label} style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:20 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontSize:11, color:"#888" }}>{m.label}</div>
                    <div style={{ fontSize:20, fontWeight:600, lineHeight:1.2 }}>{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Abstract */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
              <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>Abstract</h3>
              <p style={{ fontSize:12, color:"#555", lineHeight:1.6, margin:0 }}>
                {f.abstract && f.abstract.length > 300 && !expandedAbstract
                  ? f.abstract.slice(0,300) + "..."
                  : f.abstract || "No abstract available"}
              </p>
              {f.abstract && f.abstract.length > 300 && (
                <span onClick={()=>setExpandedAbstract(!expandedAbstract)} style={{ color:P, fontSize:11, cursor:"pointer", fontWeight:500 }}>{expandedAbstract ? "Show less" : "Read more"}</span>
              )}
            </div>

            {/* Keywords */}
            {f.keywords && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>Keywords</h3>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {f.keywords.split(",").map((kw,i) => (
                    <span key={i} style={{ fontSize:11, padding:"3px 10px", borderRadius:6, background:PL, color:P }}>{kw.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Journal / Conference Info */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
              <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>
                {f.publication_type === "Conference" ? "Conference Information" : "Journal Information"}
              </h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                {[
                  { label: f.publication_type==="Conference" ? "Conference" : "Journal", value: f.journal_name || "—" },
                  ...(f.publication_type==="Conference" ? [{ label:"Location", value: f.conference_location || "—" }] : []),
                ].map(m => (
                  <div key={m.label} style={{ display:"flex", gap:6, fontSize:12 }}>
                    <span style={{ color:"#888", minWidth:80 }}>{m.label}:</span>
                    <span style={{ color:"#333" }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full Metadata */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
              <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>Details</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                {metaFields.map(m => m.value && (
                  <div key={m.label} style={{ display:"flex", gap:6, fontSize:12 }}>
                    <span style={{ color:"#888", minWidth:90 }}>{m.label}:</span>
                    <span style={{ color:"#333" }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Authors */}
            {authors.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>Authors ({authors.length})</h3>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {authors.map((a,i) => (
                    <span key={i} style={{ fontSize:11, padding:"4px 12px", borderRadius:6, background:"#f0f0f5", color:"#555" }}>{a.name}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Citation Chart */}
            {citData.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 12px" }}>Citations by Year</h3>
                <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:120, padding:"0 4px" }}>
                  {citData.map(c => (
                    <div key={c.year} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      <div style={{ width:"100%", borderRadius:"4px 4px 0 0", background:P, opacity:0.7 + (c.citations/maxCit)*0.3, height:`${(c.citations/maxCit)*100}%`, minHeight:4 }} title={`${c.year}: ${c.citations} citations`} />
                      <span style={{ fontSize:9, color:"#888" }}>{c.year}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Similar Publications */}
            {similar.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>Similar Publications</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {similar.map(s => (
                    <div key={s.pub_id} style={{ padding:"8px 10px", borderRadius:8, background:"#f9f9f9", cursor:"pointer" }} onClick={()=>navigate(`/publications/${s.pub_id}`)}>
                      <div style={{ fontSize:12, color:P, fontWeight:500 }}>{s.title}</div>
                      <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{s.journal_name} · {s.year} · {s.citations_count} citations</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ width:260, flexShrink:0 }}>
            {/* Links */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Links</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {f.publication_url && <a href={f.publication_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"6px 10px", borderRadius:6 }}>🔗 View Publication</a>}
                {f.pdf_url && <a href={f.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"6px 10px", borderRadius:6 }}>📄 Download PDF</a>}
                {f.dataset_url && <a href={f.dataset_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"6px 10px", borderRadius:6 }}>📊 Dataset</a>}
                {f.github_url && <a href={f.github_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"6px 10px", borderRadius:6 }}>💻 GitHub</a>}
                {f.doi && <div style={{ fontSize:11, color:"#888", padding:"6px 10px" }}>DOI: {f.doi}</div>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Actions</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <button onClick={handleDelete} style={{ padding:"8px 12px", background:"#FCEBEB", color:"#A32D2D", borderRadius:8, fontSize:12, border:"none", cursor:"pointer", textAlign:"center" }}>🗑 Delete Publication</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
