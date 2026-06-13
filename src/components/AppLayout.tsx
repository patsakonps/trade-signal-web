import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, BellRing, BriefcaseBusiness, Code2, Eye, FileDown, Gauge, Menu, RefreshCw } from "lucide-react";
import { useState } from "react";
import { getWorkspaceId, resetWorkspace } from "../lib/workspace";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Gauge },
  { to: "/watchlist", label: "Watchlist", icon: Eye },
  { to: "/rules", label: "Rules", icon: BellRing },
  { to: "/indicators", label: "Indicators", icon: Code2 },
  { to: "/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { to: "/import", label: "Import", icon: FileDown }
];

const pageInfo: Record<string, { title: string; desc: string }> = {
  "/dashboard": { title: "Dashboard", desc: "ภาพรวมสัญญาณ CDC Action Zone และตลาดที่กำลังติดตาม" },
  "/watchlist": { title: "Watchlist", desc: "เพิ่มเหรียญและ timeframe ที่ต้องการติดตาม" },
  "/rules": { title: "Signal Rules", desc: "สร้าง rule จาก built-in หรือ custom indicator" },
  "/indicators": { title: "Indicators", desc: "CDC default และ custom script editor" },
  "/portfolio": { title: "Portfolio", desc: "หน้า portfolio mock พร้อมต่อ import จริงใน phase ถัดไป" },
  "/import": { title: "Import", desc: "เตรียมพื้นที่รับไฟล์ history trade จาก Binance TH" }
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const info = pageInfo[location.pathname] ?? pageInfo["/dashboard"];
  const workspaceId = getWorkspaceId();

  function handleResetWorkspace() {
    const ok = window.confirm("Reset workspace จะทำให้ web ใช้ workspaceId ใหม่ ข้อมูลเดิมจะไม่ถูกลบจาก DB แต่ browser นี้จะไม่ชี้ไป workspace เดิมแล้ว ต้องการทำต่อไหม?");
    if (!ok) return;
    resetWorkspace();
    window.location.reload();
  }

  return (
    <div className="app-shell">
      <aside className={`desktop-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="logo">TZ</div>
          <div>
            <h1>Trade Zone</h1>
            <p>CDC + Custom Scripts</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <div className="small-label">Workspace</div>
          <div className="workspace-id">{workspaceId.slice(0, 8)}...{workspaceId.slice(-6)}</div>
          <button className="btn small full" onClick={handleResetWorkspace}>Reset workspace</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <button className="btn mobile-menu-btn" onClick={() => setSidebarOpen((value) => !value)}>
            <Menu size={18} />
          </button>
          <div className="page-title">
            <h2>{info.title}</h2>
            <p>{info.desc}</p>
          </div>
          <div className="top-actions">
            <button className="btn" onClick={() => window.location.reload()}>
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        <Outlet />
      </main>

      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink key={item.to} to={item.to}>
              <Icon size={19} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
