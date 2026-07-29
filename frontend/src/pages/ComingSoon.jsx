import Layout from "../components/Layout";

export default function ComingSoon({ title, icon }) {
  return (
    <Layout>
      <div style={{
        background: "#fff", borderBottom: "1px solid #eee",
        padding: "12px 20px", flexShrink: 0,
      }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
          NIET Research Analytics Portal
        </div>
      </div>
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column",
        gap: 16, color: "#aaa",
      }}>
        <div style={{ fontSize: 48 }}>{icon}</div>
        <div style={{ fontSize: 18, fontWeight: 500, color: "#555" }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#aaa", textAlign: "center" }}>
          This page is under development.<br />
          It will be ready in the next phase.
        </div>
        <div style={{
          fontSize: 11, background: "#EEEDFE", color: "#534AB7",
          padding: "6px 14px", borderRadius: 20, fontWeight: 500,
        }}>Coming in Phase 4 🚀</div>
      </div>
    </Layout>
  );
}