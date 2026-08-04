import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import * as XLSX from "xlsx";

export default function Reports() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem("role");
  useEffect(() => {
    const id = localStorage.getItem("faculty_id");
    API.get(`/faculty/${id}/dashboard`)
      .then(res => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const downloadExcel = (filename, sheets) => {
    const wb = XLSX.utils.book_new();
    sheets.forEach(({ name, data }) => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, filename);
  };

  const personalReport = () => {
    if (!data) return;
    const f = data.faculty;
    const k = data.kpis;
    const pubs = data.recent_publications || [];
    const date = new Date().toLocaleDateString("en-IN", {
      day:"numeric", month:"long", year:"numeric"
    });

    downloadExcel(
      `Research_Report_${(f.name||"").replace(/\s+/g,"_")}.xlsx`,
      [
        {
          name: "Faculty Info",
          data: [
            ["NIET RESEARCH ANALYTICS PORTAL"],
            ["Personal Research Profile Report"],
            [],
            ["Generated on", date],
            ["Academic Year", "2024"],
            [],
            ["Name", f.name],
            ["Designation", f.designation],
            ["Google Scholar ID", f.google_scholar_id || "Not set"],
          ],
        },
        {
          name: "Key Metrics",
          data: [
            ["Metric", "Value"],
            ["Total Publications", k.total_publications],
            ["Publications This Year", k.publications_this_year],
            ["Total Citations", k.total_citations],
            ["h-index", k.h_index],
            ["i10-index", k.i10_index],
            ["Average Impact Factor", k.avg_impact_factor ?? "N/A"],
          ],
        },
        {
          name: "Research Areas",
          data: [
            ["Research Area", "Expertise %"],
            ...(data.research_areas?.map(a => [a.area, a.percent]) || []),
          ],
        },
        {
          name: "Publications",
          data: [
            ["S.No", "Title", "Journal", "Year", "Quartile", "Impact Factor", "Citations"],
            ...pubs.map((p, i) => [i+1, p.title, p.journal_name, p.year, p.quartile, p.impact_factor, p.citations_count]),
          ],
        },
        {
          name: "Achievements",
          data: [
            ["S.No", "Title", "Issuer", "Year"],
            ...(data.achievements?.map((a, i) => [i+1, a.title, a.issuer, a.year]) || [["None recorded"]]),
          ],
        },
        {
          name: "Projects & Grants",
          data: [
            ["S.No", "Title", "Sponsor Type", "Amount (Lakhs)", "Status"],
            ...(data.projects?.map((p, i) => [i+1, p.title, p.sponsor_type, p.amount_lakhs, p.status]) || [["None recorded"]]),
          ],
        },
        {
          name: "Patents",
          data: [
            ["S.No", "Title", "Status", "Year"],
            ...(data.patents?.map((p, i) => [i+1, p.title, p.status, p.year]) || [["None recorded"]]),
          ],
        },
      ]
    );
  };

  const nirf_report = () => {
    if (!data) return;
    const pubs = data.recent_publications || [];
    downloadExcel("NIRF_Research_Data.xlsx", [
      {
        name: "NIRF Data",
        data: [
          ["S.No", "Title", "Journal", "Year", "Quartile", "Impact Factor", "Citations", "Indexing"],
          ...pubs.map((p, i) => [i+1, p.title, p.journal_name, p.year, p.quartile, p.impact_factor, p.citations_count, p.indexing]),
        ],
      },
    ]);
  };

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", flexShrink: 0,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Reports</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          Generate and download research reports
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {loading ? <div className="spinner" /> : (
          <>
            {/* Personal Reports */}
            <div style={{ fontSize: 12, fontWeight: 600, color: "#888",
              textTransform: "uppercase", letterSpacing: "0.06em",
              marginBottom: 10 }}>Personal Reports</div>
            <div style={{ display: "grid",
              gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>

              <ReportCard
                icon="📊" title="Full Research Profile"
                desc="Complete profile with publications, citations, h-index, research areas, achievements, and projects in formatted layout."
                btnLabel="Download Report"
                btnColor="#534AB7"
                onClick={personalReport}
              />

              <ReportCard
                icon="📄" title="Publication List"
                desc="All publications with journal name, year, quartile, impact factor, and citation count."
                btnLabel="Download Publications"
                btnColor="#0C447C"
                onClick={() => {
                  if (!data) return;
                  const name = data.faculty?.name || "Faculty";
                  downloadExcel(`Publications_${name.replace(/\s+/g,"_")}.xlsx`, [
                    {
                      name: "Publications",
                      data: [
                        ["S.No", "Title", "Journal", "Year", "Quartile", "Impact Factor", "Citations"],
                        ...(data.recent_publications || []).map((p, i) => [i+1, p.title, p.journal_name, p.year, p.quartile, p.impact_factor, p.citations_count]),
                      ],
                    },
                  ]);
                }}
              />

              <ReportCard
                icon="💬" title="Citation Summary"
                desc="Year-wise citation growth showing how your research impact has grown over time."
                btnLabel="Download Citations"
                btnColor="#27500A"
                onClick={() => {
                  if (!data) return;
                  const name = data.faculty?.name || "Faculty";
                  const rows = data.citations_by_year?.length
                    ? data.citations_by_year.map(c => [c.year, c.count])
                    : [["No data"]];
                  downloadExcel(`Citations_${name.replace(/\s+/g,"_")}.xlsx`, [
                    {
                      name: "Citations",
                      data: [
                        ["Year", "Citations"],
                        ...rows,
                      ],
                    },
                  ]);
                }}
              />
            </div>

            {/* NIRF/NAAC Reports — Dean + HOD */}
            {(role === "dean_rd" || role === "hod") && (
              <>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#888",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  marginBottom: 10, marginTop: 4 }}>
                  Institutional Reports
                </div>
                <div style={{ display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                  <ReportCard
                    icon="🏛" title="NIRF Research Data"
                    desc="Publication data formatted for NIRF form 3.1 submission — all papers with quartile and indexing."
                    btnLabel="Export NIRF Format"
                    btnColor="#085041"
                    onClick={nirf_report}
                  />
                  <ReportCard
                    icon="📋" title="NAAC Criterion III"
                    desc="Research output summary formatted for NAAC Criterion III (Research, Innovations and Extension)."
                    btnLabel="Export NAAC Format"
                    btnColor="#633806"
                    onClick={() => alert("NAAC export — coming soon!")}
                  />
                  <ReportCard
                    icon="📈" title="Annual Research Report"
                    desc="Complete annual research performance report for internal review and management presentation."
                    btnLabel="Generate Annual Report"
                    btnColor="#534AB7"
                    onClick={personalReport}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function ReportCard({ icon, title, desc, btnLabel, btnColor, onClick }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: "20px", display: "flex", flexDirection: "column",
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a",
        marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6,
        flex: 1, marginBottom: 16 }}>{desc}</div>
      <button onClick={onClick} style={{
        background: btnColor, color: "#fff", padding: "9px 16px",
        borderRadius: 8, fontSize: 13, fontWeight: 500,
        border: "none", cursor: "pointer", alignSelf: "flex-start",
      }}>{btnLabel}</button>
    </div>
  );
}