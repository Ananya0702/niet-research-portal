import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../services/api";

const ACTION_CONFIG = {
  publication_added:  { icon: "📄", color: "#534AB7", bg: "#EEEDFE", label: "Publication" },
  project_added:      { icon: "💼", color: "#0C447C", bg: "#E6F1FB", label: "Project" },
  patent_added:       { icon: "💡", color: "#633806", bg: "#FAEEDA", label: "Patent" },
  achievement_added:  { icon: "🏆", color: "#27500A", bg: "#EAF3DE", label: "Achievement" },
  scholar_synced:     { icon: "🔄", color: "#085041", bg: "#E1F5EE", label: "Scholar Sync" },
  profile_updated:    { icon: "👤", color: "#555",    bg: "#F1EFE8", label: "Profile" },
};

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/activity/")
      .then(res => setLogs(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", flexShrink: 0,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>Activity Log</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          Timeline of all your actions on the portal
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{
          background: "#fff", border: "1px solid #eee",
          borderRadius: 12, padding: "8px 20px", maxWidth: 700,
        }}>
          {loading ? <div className="spinner" /> :
            logs.length === 0 ? (
              <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>
                No activity yet. Start adding publications, projects, or patents
                to see your activity timeline here.
              </div>
            ) : (
              logs.map((log, i) => {
                const cfg = ACTION_CONFIG[log.action] || {
                  icon: "📌", color: "#555", bg: "#F1EFE8", label: "Activity",
                };
                return (
                  <div key={log.log_id} style={{
                    display: "flex", gap: 14, padding: "14px 0",
                    borderBottom: i < logs.length - 1 ? "1px solid #f5f5f5" : "none",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                      background: cfg.bg, display: "flex",
                      alignItems: "center", justifyContent: "center", fontSize: 16,
                    }}>{cfg.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: cfg.color,
                          background: cfg.bg, padding: "2px 8px", borderRadius: 10,
                        }}>{cfg.label}</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#1a1a1a", marginTop: 4 }}>
                        {log.description}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
        </div>
      </div>
    </Layout>
  );
}