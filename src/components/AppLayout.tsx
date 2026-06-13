import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BellRing, BriefcaseBusiness, Code2, Eye, FileDown, Gauge, LogOut, Menu, RefreshCw } from "lucide-react";
import { useState } from "react";
import { clearWorkspaceId } from "../lib/workspace";

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

type AppLayoutProps = {
  workspaceId: string;
  onWorkspaceChanged: (workspaceId: string | null) => void;
};

export function AppLayout({ workspaceId, onWorkspaceChanged }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const info = pageInfo[location.pathname] ?? pageInfo["/dashboard"];

  function handleSwitchWorkspace() {
    const ok = window.confirm("ออกจาก workspace นี้ไหม? ข้อมูลใน DB ไม่ถูกลบ แค่ browser นี้จะกลับไปหน้าใส่ workspace ใหม่");
    if (!ok) return;
    clearWorkspaceId();
    onWorkspaceChanged(null);
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
          <button className="btn small full" onClick={handleSwitchWorkspace}><LogOut size={14} /> Switch workspace</button>
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
