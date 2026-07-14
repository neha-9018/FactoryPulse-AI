import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { 
  LayoutDashboard, 
  BarChart3, 
  Wrench, 
  LineChart, 
  LogOut, 
  Bell, 
  ShieldCheck, 
  Factory,
  CheckCircle2,
  Menu,
  X,
  Camera,
  MessageSquare
} from "lucide-react";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  
  // Dummy active alerts for notification drawer (representing real-time anomalies)
  const [alerts] = useState([
    { id: 1, type: "OVERHEAT", machine: "CNC Milling Alpha", severity: "CRITICAL", msg: "Core temp reached 98.4°C" },
    { id: 2, type: "VIBRATION", machine: "Hydraulic Press Delta", severity: "WARNING", msg: "Vibration values exceeding 5.2mm/s" }
  ]);

  const navItems = [
    { name: "Executive View", path: "/", icon: LayoutDashboard, roles: ["ADMIN", "ENGINEER", "OPERATOR", "MANAGER"] },
    { name: "Production logs", path: "/production", icon: BarChart3, roles: ["ADMIN", "ENGINEER", "MANAGER"] },
    { name: "Quality Control", path: "/quality", icon: Camera, roles: ["ADMIN", "ENGINEER", "OPERATOR"] },
    { name: "Maintenance AI", path: "/maintenance", icon: Wrench, roles: ["ADMIN", "ENGINEER", "OPERATOR"] },
    { name: "Custom Analytics", path: "/analytics", icon: LineChart, roles: ["ADMIN", "ENGINEER", "MANAGER"] },
    { name: "AI Assistant", path: "/assistant", icon: MessageSquare, roles: ["ADMIN", "ENGINEER", "OPERATOR", "MANAGER"] }
  ];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isCurrent = (path: string) => location.pathname === path;

  // Filter navigation items by roles
  const filteredNav = navItems.filter(item => !user || item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-brand-bg text-slate-100 font-sans">
      {/* 1. Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-brand-card border-r border-brand-border">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-border">
          <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-white leading-none">MEIDENSHA</h1>
            <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">SmartFactory</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active 
                    ? "bg-cyan-600 text-white shadow-glow" 
                    : "text-slate-400 hover:bg-brand-border hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-4 border-t border-brand-border bg-brand-bg/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-cyan-900/40 border border-cyan-500/20 flex items-center justify-center font-bold text-cyan-400">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate leading-none mb-1">{user?.username}</p>
              <div className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded border border-cyan-500/20">
                <ShieldCheck className="h-3 w-3" />
                {user?.role}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-400 text-xs font-semibold transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* 2. Main content container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-brand-card border-b border-brand-border z-10">
          {/* Mobile Menu Trigger */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-brand-border rounded-lg"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden md:flex items-center gap-2 text-slate-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Operational Integrity: 98.6%</span>
          </div>

          {/* Notifications Center */}
          <div className="relative">
            <button 
              onClick={() => setAlertsOpen(!alertsOpen)}
              className="relative p-2 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-slate-400 hover:text-white transition"
            >
              <Bell className="h-5 w-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 ring-2 ring-brand-card" />
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {alertsOpen && (
              <div className="absolute right-0 mt-3 w-80 glass-panel rounded-2xl shadow-xl z-50 p-4 border border-brand-border">
                <div className="flex justify-between items-center pb-2 mb-3 border-b border-brand-border">
                  <h3 className="font-semibold text-white text-sm">Critical Shop Floor Alerts</h3>
                  <span className="text-[10px] bg-red-500/15 text-red-400 font-bold px-2 py-0.5 rounded">
                    {alerts.length} Active
                  </span>
                </div>
                <div className="space-y-3">
                  {alerts.map(a => (
                    <div key={a.id} className="p-3 bg-brand-bg/60 rounded-xl border border-red-500/10 hover:border-red-500/20 transition">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-bold text-red-400">{a.type}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{a.machine}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-normal">{a.msg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 3. Scrollable page view container */}
        <main className="flex-1 overflow-y-auto p-6 bg-brand-bg">
          <Outlet />
        </main>
      </div>

      {/* 4. Mobile Menu Drawer overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-brand-card h-full p-6 border-r border-brand-border">
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-brand-border rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 py-2 mb-8">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                <Factory className="h-6 w-6" />
              </div>
              <h1 className="font-bold tracking-tight text-white leading-none">MEIDENSHA</h1>
            </div>
            <nav className="flex-1 space-y-2">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      active 
                        ? "bg-cyan-600 text-white" 
                        : "text-slate-400 hover:bg-brand-border hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-6 border-t border-brand-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-brand-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 text-slate-400 text-xs font-semibold transition"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
