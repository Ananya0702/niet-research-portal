import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../services/api";

export default function Sidebar() {
  const location = useLocation();
  const name     = localStorage.getItem("name") || "Faculty";
  const role     = localStorage.getItem("role") || "faculty";
  const [syncing, setSyncing] = useState(false);

  const prefix =
    role === "hod"     ? "/hod" :
    role === "dean_rd" ? "/dean" : "";

  const dashPath =
    role === "hod"     ? "/hod/dashboard" :
    role === "dean_rd" ? "/dean/dashboard" : "/dashboard";

  // ── Base nav (all roles) ──────────────────────────────────────────────
  const BASE_NAV = [
    { icon: "📊", label: "Dashboard",        path: dashPath },
    { icon: "👤", label: "My Profile",       path: `${prefix}/profile` },
    { icon: "📄", label: "Publications",     path: "/publications" },
    { icon: "📈", label: "Analytics",        path: `${prefix}/analytics` },
    { icon: "💼", label: "Projects",         path: "/projects" },
    { icon: "💡", label: "IPR",          path: "/patents" },
    { icon: "🏆", label: "Achievements",     path: "/achievements" },
    { icon: "🤝", label: "Collaborations",   path: `${prefix}/collaborations` },
    { icon: "🎓", label: "Student Research", path: `${prefix}/students` },
    { icon: "📋", label: "Reports",          path: `${prefix}/reports` },
    { icon: "📝", label: "Activity Log",     path: `${prefix}/activity` },
    { icon: "⚙️", label: "Settings",         path: `${prefix}/settings` },
  ];

  // ── HOD-only extra nav ────────────────────────────────────────────────
  const HOD_NAV = [
    { icon: "👥", label: "Faculty & Researchers", path: "/hod/faculty" },
    { icon: "📢", label: "Announcements",          path: "/hod/announcements" },
  ];

  // ── Dean-only extra nav ───────────────────────────────────────────────
  const DEAN_NAV = [
    { icon: "👤", label: "My Research",       path: "/dean/myresearch" },
    { icon: "👥", label: "All Faculty",       path: "/dean/faculty" },
    { icon: "📢", label: "Announcements",     path: "/dean/announcements" },
  ];

  const EXTRA_NAV =
    role === "hod"     ? HOD_NAV  :
    role === "dean_rd" ? DEAN_NAV : [];

  // ── Quick actions by role ─────────────────────────────────────────────
  const QUICK_ACTIONS =
    role === "dean_rd" ? [
      { icon: "📢", label: "Post Announcement", path: "/dean/announcements" },
      { icon: "📋", label: "View Reports",      path: "/dean/reports" },
    ] :
    role === "hod" ? [
      { icon: "➕", label: "Add Publication",   path: "/publications" },
      { icon: "👥", label: "View Faculty",      path: "/hod/faculty" },
    ] : [
      { icon: "➕", label: "Add Publication",   path: "/publications" },
      { icon: "➕", label: "Add Project",       path: "/projects" },
    ];

  const initials = name.split(" ")
    .filter(w => !w.startsWith("Dr."))
    .slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const roleLabel =
    role === "hod"     ? "HOD" :
    role === "dean_rd" ? "Dean R&D" : "Faculty";

  const roleBg =
    role === "hod"     ? "#0C447C" :
    role === "dean_rd" ? "#085041" : "#534AB7";

  const handleScholarSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await API.post("/sync/scholar");
      const data = res.data;
      alert(`✅ Sync complete!\n\n📄 New publications added: ${data.new_publications}\n📋 Already existed (skipped): ${data.already_existed}\n📈 h-index: ${data.h_index}\n💬 Total citations: ${data.total_citations}`);
      window.location.reload();
    } catch (err) {
      alert(`⚠️ ${err.response?.data?.detail || "Sync failed. Is the backend running?"}`);
    } finally {
      setSyncing(false);
    }
  };

  const navLink = (item) => {
    const active = location.pathname === item.path;
    return (
      <Link to={item.path} key={item.label} style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px", fontSize: 12, textDecoration: "none",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.12)" : "transparent",
        borderLeft: active ? "3px solid #fff" : "3px solid transparent",
        transition: "all 0.15s",
      }}>
        <span style={{ fontSize: 14 }}>{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div style={{
      width: 215, minHeight: "100vh", background: "#1e1b4b",
      display: "flex", flexDirection: "column", flexShrink: 0,
      boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
    }}>

      {/* Logo */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 14px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          width: 40, height: 40, background: "#534AB7", borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 6, boxShadow: "0 0 16px rgba(91,61,245,0.5)",
        }}>
          <img src="/niet-logo.svg" alt="NIET" style={{ width:"100%", height:"100%", objectFit:"contain", filter:"brightness(0) invert(1)" }} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff",
            letterSpacing: "0.02em" }}>NIET</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
            Research Portal
          </div>
        </div>
      </div>

      {/* User card */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.04)",
      }}>
        <div style={{
          width: 36, height: 36, background: roleBg, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        }}>{initials}</div>
        <div style={{ overflow: "hidden" }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "#fff",
            whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis", maxWidth: 135,
          }}>{name}</div>
          <div style={{
            fontSize: 10, color: "rgba(255,255,255,0.5)",
            marginTop: 1,
          }}>
            <span style={{
              background: roleBg, color: "#fff",
              padding: "1px 6px", borderRadius: 8,
              fontSize: 9, fontWeight: 600,
            }}>{roleLabel}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>

        {/* Main nav label */}
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.25)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          padding: "8px 14px 4px",
        }}>Main</div>

        {BASE_NAV.map(item => navLink(item))}

        {/* Role-specific extra nav */}
        {EXTRA_NAV.length > 0 && (
          <>
            <div style={{
              fontSize: 9, color: "rgba(255,255,255,0.25)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              padding: "12px 14px 4px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              marginTop: 6,
            }}>
              {role === "hod" ? "Department" : "Administration"}
            </div>
            {EXTRA_NAV.map(item => navLink(item))}
          </>
        )}

      </nav>

      {/* Quick Actions */}
      <div style={{
        padding: "10px 14px 6px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
      }}>
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase", letterSpacing: "0.06em",
          marginBottom: 7,
        }}>Quick Actions</div>

        {QUICK_ACTIONS.map(item => (
          <Link to={item.path} key={item.label} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 9px", borderRadius: 7,
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.75)", fontSize: 11,
            textDecoration: "none", marginBottom: 4,
            transition: "background 0.15s",
          }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </Link>
        ))}

        {/* Scholar sync — for all */}
        
        <div
          onClick={handleScholarSync}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 9px", borderRadius: 7,
            background: syncing
              ? "rgba(83,74,183,0.4)"
              : "rgba(255,255,255,0.07)",
            color: syncing ? "#fff" : "rgba(255,255,255,0.75)",
            fontSize: 11,
            cursor: syncing ? "default" : "pointer",
            marginBottom: 4,
            pointerEvents: syncing ? "none" : "auto",
            transition: "background 0.15s",
          }}>
          <span>{syncing ? "⏳" : "🔄"}</span>
          <span>{syncing ? "Syncing..." : "Sync Google Scholar"}</span>
        </div>
        

        {/* Logout */}
        <div
          onClick={() => { localStorage.clear(); window.location.href = "/"; }}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 9px", borderRadius: 7,
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.5)", fontSize: 11,
            cursor: "pointer", marginTop: 2,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 8,
          }}>
          🚪 <span>Logout</span>
        </div>
      </div>

    </div>
  );
}