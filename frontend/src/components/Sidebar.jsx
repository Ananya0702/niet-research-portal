import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../services/api";

const CAT_ICONS = {
  "Research Funding": "💰", "Conference": "🎤", "Journal": "📄", "Patent / IPR": "💡",
  "Workshop": "🛠️", "Seminar": "🎓", "FDP": "👨‍🏫", "Research Grant": "💵", "Faculty Meeting": "🤝",
  "Administrative Notice": "📋", "Academic Notice": "📌", "Student Research": "🔬", "Deadline": "⏰",
  "Awards & Achievements": "🏆", "General Announcement": "📢",
};
const notifIcon = (c) => CAT_ICONS[c] || "📢";
const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dd = Math.floor(h / 24);
  return `${dd}d ago`;
};
const P = "#534AB7";

const SIDE_NAV_ICONS = {
  dashboard:<><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></>,
  profile:<><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></>,
  publications:<><path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5Z"/><path d="M14 4v4h4M9 13h6m-6 3h6"/></>,
  analytics:<><path d="M4 19.5V5"/><path d="M4 19.5h16"/><path d="m7 15 4-4 3 2 5-6"/><path d="M16 7h3v3"/></>,
  projects:<><path d="M3.5 8A1.5 1.5 0 0 1 5 6.5h5l2 2h7A1.5 1.5 0 0 1 20.5 10v8A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18Z"/><path d="M3.5 10h17"/></>,
  ipr:<><path d="M9 18h6m-5 3h4"/><path d="M8.5 14.5a7 7 0 1 1 7 0c-.8.6-1.2 1.2-1.4 2H10c-.2-.8-.7-1.4-1.5-2Z"/><path d="M12 3v1m7 6h1"/></>,
  achievements:<><path d="M8 4h8v5a4 4 0 0 1-8 0Z"/><path d="M8 6H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3-1v5m-4 4h8m-7 0 1-4h4l1 4"/></>,
  collaboration:<><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1Z"/><path d="M16 5.5a3 3 0 0 1 0 5.8m2 3.2a5 5 0 0 1 3 4.5V20h-4"/></>,
  students:<><path d="m3 8 9-4 9 4-9 4Z"/><path d="M6 10v5c3.5 3 8.5 3 12 0v-5M21 8v6"/></>,
  reports:<><rect x="5" y="3.5" width="14" height="18" rx="2"/><path d="M9 3.5v-1h6v1M8.5 9h7m-7 4h7m-7 4h4"/></>,
  activity:<><path d="M4 12a8 8 0 1 1 2.3 5.7"/><path d="M4 17v-4h4m4-6v5l3 2"/></>,
  announcements:<><path d="M4 14V9a1 1 0 0 1 1-1h3l9-4v14l-9-4H5a1 1 0 0 1-1-1Z"/><path d="m8 14 2 6h3l-2.2-5.1M20 8a6 6 0 0 1 0 7"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.1 1.9-2 2-1.9-1.1-.2-.1a8 8 0 0 1-1.4.6l-.2.1L14.5 21h-3l-.4-2.4-.2-.1a8 8 0 0 1-1.4-.6l-.2.1-1.9 1.1-2-2 1.1-1.9.1-.2a8 8 0 0 1-.6-1.4l-.1-.2L4 13.5v-3l2.4-.4.1-.2a8 8 0 0 1 .6-1.4L7 8.3 5.9 6.4l2-2 1.9 1.1.2.1a8 8 0 0 1 1.4-.6l.2-.1L12 2.5h3l.4 2.4.2.1a8 8 0 0 1 1.4.6l.2-.1 1.9-1.1 2 2L20 8.3l-.1.2a8 8 0 0 1 .6 1.4l.1.2 2.4.4v3l-2.4.4-.1.2a8 8 0 0 1-.6 1.4Z" transform="translate(-1.5 -1.5) scale(.96)"/></>,
  team:<><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20v-1.5a6.5 6.5 0 0 1 13 0V20z"/><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6m2 3a5 5 0 0 1 3.5 4.7V20h-4"/></>,
  add:<><circle cx="12" cy="12" r="9"/><path d="M12 8v8m-4-4h8"/></>,
  sync:<><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"/></>,
  logout:<><path d="M10 17l5-5-5-5m5 5H3"/><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></>,
  notifications:<><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
};

function SidebarIcon({ name, active=false, size=18 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active?"#ddd6fe":"#a89acb"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{display:"block",flexShrink:0}}>{SIDE_NAV_ICONS[name]||SIDE_NAV_ICONS.publications}</svg>;
}


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
    { icon: "dashboard", label: "Dashboard",        path: dashPath },
    { icon: "profile", label: "My Profile",       path: `${prefix}/profile` },
    { icon: "publications", label: "Publications",     path: "/publications" },
    { icon: "analytics", label: "Analytics",        path: `${prefix}/analytics` },
    { icon: "projects", label: "Projects",         path: "/projects" },
    { icon: "ipr", label: "IPR",          path: "/patents" },
    { icon: "achievements", label: "Achievements",     path: "/achievements" },
    { icon: "collaboration", label: "Collaborations",   path: `${prefix}/collaborations` },
    { icon: "students", label: "Student Research", path: `${prefix}/students` },
    { icon: "reports", label: "Reports",          path: `${prefix}/reports` },
    { icon: "activity", label: "Activity Log",     path: `${prefix}/activity` },
    { icon: "announcements", label: "Announcements",     path: `${prefix}/announcements` },
    { icon: "settings", label: "Settings",         path: `${prefix}/settings` },
  ];

  // ── HOD-only extra nav ────────────────────────────────────────────────
  const HOD_NAV = [
    { icon: "team", label: "Faculty & Researchers", path: "/hod/faculty" },
  ];

  // ── Dean-only extra nav ───────────────────────────────────────────────
  const DEAN_NAV = [
    { icon: "profile", label: "My Research",       path: "/dean/myresearch" },
    { icon: "team", label: "All Faculty",       path: "/dean/faculty" },
  ];

  const EXTRA_NAV =
    role === "hod"     ? HOD_NAV  :
    role === "dean_rd" ? DEAN_NAV : [];

  // ── Quick actions by role ─────────────────────────────────────────────
  const QUICK_ACTIONS =
    role === "dean_rd" ? [
      { icon: "announcements", label: "Post Announcement", path: "/dean/announcements" },
      { icon: "reports", label: "View Reports",      path: "/dean/reports" },
    ] :
    role === "hod" ? [
      { icon: "add", label: "Add Publication",   path: "/publications" },
      { icon: "team", label: "View Faculty",      path: "/hod/faculty" },
    ] : [
      { icon: "add", label: "Add Publication",   path: "/publications" },
      { icon: "add", label: "Add Project",       path: "/projects" },
    ];

  const initials = name.split(" ")
    .filter(w => !w.startsWith("Dr."))
    .slice(0, 2).map(w => w[0]).join("").toUpperCase();

  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  const refreshUnread = () => {
    API.get("/announcements/unread/count")
      .then(r => setUnreadCount(r.data.unread || 0))
      .catch(() => {});
  };

  useEffect(() => {
    refreshUnread();
    const iv = setInterval(refreshUnread, 30000);
    window.addEventListener("focus", refreshUnread);
    return () => { clearInterval(iv); window.removeEventListener("focus", refreshUnread); };
  }, []);

  useEffect(() => { setPanelOpen(false); }, [location.pathname]);

  const openPanel = async () => {
    if (panelOpen) { setPanelOpen(false); return; }
    setPanelOpen(true);
    setNotifsLoading(true);
    try {
      const [listRes] = await Promise.all([
        API.get("/announcements/"),
        API.post("/announcements/read-all").catch(() => ({})),
      ]);
      setNotifs(Array.isArray(listRes.data) ? listRes.data : []);
      setUnreadCount(0);
    } catch {
      setNotifs([]);
    } finally {
      setNotifsLoading(false);
    }
  };

  const markAllRead = async () => {
    try { await API.post("/announcements/read-all"); } catch {}
    setUnreadCount(0);
    refreshUnread();
  };

  const roleLabel =
    role === "hod"     ? "HOD" :
    role === "dean_rd" ? "Dean" : "Faculty";

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
        <SidebarIcon name={item.icon} active={active} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <>
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
          width: 82, height: 48, background: "#fff", borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "4px 6px", boxSizing:"border-box", flexShrink:0,
          boxShadow: "0 3px 12px rgba(0,0,0,0.16)",
        }}>
          <img src="/niet-logo.svg" alt="NIET Greater Noida" style={{ width:"100%", height:"100%", objectFit:"contain" }} />
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
        <button onClick={openPanel} style={{ position:"relative", marginRight:4, background:"none", border:"none", cursor:"pointer", padding:4 }}>
          <SidebarIcon name="notifications" size={18} />
          {unreadCount > 0 && (
            <span style={{
              position:"absolute", top:-2, right:-4, background:"#A32D2D",
              color:"#fff", fontSize:8, fontWeight:700, borderRadius:"50%",
              width:14, height:14, display:"flex", alignItems:"center",
              justifyContent:"center", lineHeight:1,
            }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>
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
            <SidebarIcon name={item.icon} size={15} /><span>{item.label}</span>
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
          {syncing ? <span style={{width:15,textAlign:"center",fontSize:12}}>⏳</span> : <SidebarIcon name="sync" size={15} />}
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
          <SidebarIcon name="logout" size={15} /> <span>Logout</span>
          </div>
        </div>
      </div>

      {/* ═══ Notification panel ═══ */}
      {panelOpen && (
        <>
          <div onClick={() => setPanelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 2999 }} />
          <div style={{
            position: "fixed", left: 230, top: 120, width: 350, maxHeight: 460,
            background: "#fff", borderRadius: 14, boxShadow: "0 10px 36px rgba(0,0,0,0.22)",
            zIndex: 3000, display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>🔔 Notifications</span>
              <button onClick={markAllRead} style={{ fontSize: 11, color: P, background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>Mark all as read</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {notifsLoading ? (
                <div style={{ padding: 20, textAlign: "center" }}>
                  <div className="spinner" style={{ width: 18, height: 18 }} />
                </div>
              ) : notifs.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", fontSize: 11, color: "#999" }}>No notifications yet.</div>
              ) : notifs.map(n => (
                <Link to={`${prefix}/announcements`} key={n.announcement_id} onClick={() => setPanelOpen(false)} style={{ display: "flex", gap: 10, padding: "10px 14px", borderBottom: "1px solid #f5f5f5", textDecoration: "none" }}>
                  <span style={{ fontSize: 16 }}>{notifIcon(n.category)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.4 }}>{n.title}</div>
                    {n.summary && <div style={{ fontSize: 11, color: "#666", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.summary}</div>}
                    <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{timeAgo(n.created_at)}{n.category ? ` · ${n.category}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ padding: "8px 14px", borderTop: "1px solid #eee", textAlign: "center" }}>
              <Link to={`${prefix}/announcements`} onClick={() => setPanelOpen(false)} style={{ fontSize: 11, color: P, fontWeight: 500, textDecoration: "none" }}>View all announcements →</Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
