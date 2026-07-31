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

  const f = pub.publication || pub;
  const citData = pub.citations_by_year || [];
  const maxCit = Math.max(...citData.map(c => c.count || c.citations), 1);
  const totalCit = pub.total_citations || citData.reduce((s, c) => s + (c.count || c.citations || 0), 0);
  const isConf = f.publication_type === "Conference";

  const desc = pub.description || f.abstract || "";
  const descLong = desc.length > 300;
  const displayDesc = expandedAbstract ? desc : (descLong ? desc.slice(0, 300) + "..." : desc);

  const metaRows = [
    { label:"DOI", value:f.doi },
    { label:"Publisher", value:f.publisher },
    { label:"Volume", value:f.volume },
    { label:"Issue", value:f.issue },
    { label:"Pages", value:f.pages },
    { label:"ISSN", value:f.issn },
    { label:"ISBN", value:f.isbn },
    { label:"Research Area", value:f.research_area },
    { label:"Language", value:f.language || "English" },
    { label:"Country", value:f.country },
    { label:"Status", value:f.status },
    { label:"Submitted", value:f.submission_date },
    { label:"Accepted", value:f.acceptance_date },
  ].filter(m => m.value);

  return (
    <Layout>
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#f7f7f8", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ background:"#fff", borderBottom:"1px solid #eee", padding:"10px 20px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
          <span style={{ color:P, fontSize:13, cursor:"pointer", fontWeight:500 }} onClick={()=>navigate("/publications")}>← Back to Publications</span>
          <span style={{ color:"#ddd" }}>|</span>
          <span style={{ fontSize:12, color:"#888", maxWidth:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.title}</span>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", display:"flex", gap:16, flexWrap:"wrap" }}>
          {/* Main */}
          <div style={{ flex:"1 1 0", minWidth:0, maxWidth:"100%" }}>
            {/* Title + Badges */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"22px 24px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <h1 style={{ fontSize:20, fontWeight:600, lineHeight:1.35, margin:"0 0 10px", color:"#1a1a1a" }}>{f.title}</h1>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:8 }}>
                    <span style={{ fontSize:11, padding:"3px 12px", borderRadius:6, fontWeight:600, background:isConf ? "#FAEEDA" : "#E6F1FB", color:isConf ? "#633806" : "#0C447C" }}>{isConf ? "Conference Paper" : "Journal Article"}</span>
                    {f.quartile && f.quartile !== "N/A" && (
                      <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:600, background:Q_BG[f.quartile]||"#f0f0f0", color:Q_COLORS[f.quartile]||"#888" }}>Q{f.quartile.replace("Q","")}</span>
                    )}
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:500, background:PL, color:P }}>{f.indexing}</span>
                    <span style={{ fontSize:11, padding:"3px 10px", borderRadius:6, fontWeight:500, background:"#f0f0f0", color:"#666" }}>{f.year}</span>
                  </div>
                  <div style={{ fontSize:12, color:"#555", lineHeight:1.5 }}>
                    {pub.faculty_name || "—"} {pub.department && <span style={{color:"#888"}}>· {pub.department}</span>} {pub.school && <span style={{color:"#888"}}>· {pub.school}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {[
                { icon:"📊", label:"Total Citations", value:totalCit },
                { icon:"📈", label:"Citations/Year", value:citData.length > 0 ? (totalCit / citData.length).toFixed(1) : "0.0" },
                { icon:"⭐", label:"Highest Year", value:citData.length > 0 ? `${[...citData].sort((a,b) => (b.count||b.citations||0) - (a.count||a.citations||0))[0].year} (${Math.max(...citData.map(c => c.count||c.citations||0))})` : "—" },
              ].map(m => (
                <div key={m.label} style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ fontSize:20 }}>{m.icon}</div>
                  <div>
                    <div style={{ fontSize:11, color:"#888" }}>{m.label}</div>
                    <div style={{ fontSize:18, fontWeight:600, lineHeight:1.2 }}>{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Abstract / Description */}
            {desc && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 8px" }}>{f.abstract ? "Abstract" : "Description"}</h3>
                <p style={{ fontSize:12, color:"#555", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{displayDesc}</p>
                {descLong && (
                  <span onClick={()=>setExpandedAbstract(!expandedAbstract)} style={{ color:P, fontSize:11, cursor:"pointer", fontWeight:500, marginTop:4, display:"inline-block" }}>{expandedAbstract ? "Show less" : "Read more"}</span>
                )}
              </div>
            )}

            {/* Keywords */}
            {f.keywords && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px" }}>Keywords</h3>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {f.keywords.split(",").map((kw,i) => (
                    <span key={i} style={{ fontSize:11, padding:"4px 12px", borderRadius:6, background:PL, color:P }}>{kw.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Venue Information */}
            {(f.journal_name || f.conference_name) && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px" }}>{isConf ? "Conference Information" : "Journal Information"}</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                  {[
                    { label: isConf ? "Conference" : "Journal", value: isConf ? (f.conference_name || f.journal_name) : f.journal_name },
                    ...(isConf ? [{ label:"Location", value: f.conference_location }] : []),
                    { label:"Publisher", value: f.publisher },
                    { label:"Volume", value: f.volume },
                    { label:"Issue", value: f.issue },
                    { label:"Pages", value: f.pages },
                    { label:"ISSN", value: f.issn },
                    ...(isConf ? [{ label:"ISBN", value: f.isbn }] : []),
                  ].filter(m => m.value).map(m => (
                    <div key={m.label} style={{ display:"flex", gap:6, fontSize:12 }}>
                      <span style={{ color:"#888", minWidth:85 }}>{m.label}:</span>
                      <span style={{ color:"#333" }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details Grid */}
            {metaRows.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px" }}>Details</h3>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
                  {metaRows.map(m => (
                    <div key={m.label} style={{ display:"flex", gap:6, fontSize:12 }}>
                      <span style={{ color:"#888", minWidth:90 }}>{m.label}:</span>
                      <span style={{ color:"#333" }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Citation Graph */}
            {citData.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 4px" }}>Citations by Year</h3>
                <div style={{ fontSize:11, color:"#888", marginBottom:12 }}>Total: {totalCit} citations</div>
                <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:130, padding:"0 4px" }}>
                  {citData.map(c => {
                    const h = ((c.count || c.citations || 0) / maxCit) * 100;
                    return (
                      <div key={c.year} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                        <span style={{ fontSize:9, color:"#888" }}>{c.count || c.citations || 0}</span>
                        <div style={{ width:"100%", borderRadius:"3px 3px 0 0", background:P, height:`${Math.max(h, 3)}%`, minHeight:3, opacity:0.6 + (h/100)*0.4 }} title={`${c.year}: ${c.count || c.citations || 0}`} />
                        <span style={{ fontSize:9, color:"#aaa" }}>{String(c.year).slice(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Similar Publications */}
            {pub.similar_publications && pub.similar_publications.length > 0 && (
              <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"18px 22px", marginBottom:16 }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:"0 0 10px" }}>Similar Publications</h3>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {pub.similar_publications.map(s => (
                    <div key={s.pub_id} style={{ padding:"8px 12px", borderRadius:8, background:"#f9f9f9", cursor:"pointer" }} onClick={()=>navigate(`/publications/${s.pub_id}`)}>
                      <div style={{ fontSize:12, color:P, fontWeight:500 }}>{s.title}</div>
                      <div style={{ fontSize:10, color:"#888", marginTop:2 }}>{s.journal_name || s.conference_name || ""} {s.year ? `· ${s.year}` : ""} {s.citations_count ? `· ${s.citations_count} citations` : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ width:280, flexShrink:0 }}>
            {/* Links */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Links & Attachments</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {f.publication_url && <a href={f.publication_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"7px 12px", borderRadius:6, display:"block" }}>🔗 View Publication</a>}
                {f.pdf_url && <a href={f.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"7px 12px", borderRadius:6, display:"block" }}>📄 Download PDF</a>}
                {f.dataset_url && <a href={f.dataset_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"7px 12px", borderRadius:6, display:"block" }}>📊 Dataset</a>}
                {f.github_url && <a href={f.github_url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:P, textDecoration:"none", background:PL, padding:"7px 12px", borderRadius:6, display:"block" }}>💻 GitHub Repository</a>}
                {!f.publication_url && !f.pdf_url && !f.dataset_url && !f.github_url && (
                  <div style={{ fontSize:11, color:"#aaa", padding:"6px 0" }}>No links available</div>
                )}
              </div>
            </div>

            {/* Export */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Export Citation</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                <button onClick={()=>{const b=`@article{${f.pub_id},\n  title={${f.title}},\n  author={${pub.faculty_name || ""}},\n  journal={${f.journal_name || f.conference_name || ""}},\n  year={${f.year}},\n  volume={${f.volume || ""}},\n  pages={${f.pages || ""}},\n  doi={${f.doi || ""}}\n}`;navigator.clipboard.writeText(b);}} style={{ fontSize:12, background:PL, color:P, padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer", textAlign:"left" }}>📋 Copy BibTeX</button>
                <button onClick={()=>{const r=`TY  - JOUR\nTI  - ${f.title}\nAU  - ${pub.faculty_name || ""}\nPY  - ${f.year}\nJF  - ${f.journal_name || f.conference_name || ""}\nDO  - ${f.doi || ""}\nER  -`;navigator.clipboard.writeText(r);}} style={{ fontSize:12, background:PL, color:P, padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer", textAlign:"left" }}>📋 Copy RIS</button>
                <button onClick={()=>window.print()} style={{ fontSize:12, background:"#f0f0f0", color:"#555", padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer", textAlign:"left" }}>🖨️ Print</button>
              </div>
            </div>

            {/* Share */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Share</h3>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>{navigator.clipboard.writeText(window.location.href);alert("Link copied!")}} style={{ fontSize:11, background:PL, color:P, padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer" }}>🔗 Copy Link</button>
                <button onClick={()=>{const u=encodeURIComponent(window.location.href);const t=encodeURIComponent(f.title);window.open(`https://www.facebook.com/sharer/sharer.php?u=${u}`,"_blank")}} style={{ fontSize:11, background:"#E6F1FB", color:"#0C447C", padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer" }}>f</button>
                <button onClick={()=>{const u=encodeURIComponent(window.location.href);const t=encodeURIComponent(f.title);window.open(`https://twitter.com/intent/tweet?text=${t}&url=${u}`,"_blank")}} style={{ fontSize:11, background:"#E6F1FB", color:"#0C447C", padding:"7px 12px", borderRadius:6, border:"none", cursor:"pointer" }}>𝕏</button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #eee", padding:"14px 16px", marginBottom:16 }}>
              <h3 style={{ fontSize:12, fontWeight:600, margin:"0 0 10px" }}>Actions</h3>
              <button onClick={handleDelete} style={{ width:"100%", padding:"8px 12px", background:"#FCEBEB", color:"#A32D2D", borderRadius:8, fontSize:12, border:"none", cursor:"pointer", textAlign:"center" }}>🗑 Delete Publication</button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
