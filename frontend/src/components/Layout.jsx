import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", background: "#f7f7f8",
      }}>
        {children}
      </div>
    </div>
  );
}