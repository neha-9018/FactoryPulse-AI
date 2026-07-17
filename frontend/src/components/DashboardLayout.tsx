import React, { useState, useEffect } from "react";
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
  MessageSquare,
  HelpCircle,
  Sun,
  Moon,
  FileText
} from "lucide-react";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  
  const [themeMode, setThemeMode] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    if (themeMode === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(prev => prev === "dark" ? "light" : "dark");
  };
  
  const [avatarImg, setAvatarImg] = useState<string | null>(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      return JSON.parse(saved).profileImage || null;
    }
    return null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem("user");
      if (saved) {
        setAvatarImg(JSON.parse(saved).profileImage || null);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchAlerts = () => {
      fetch("/api/v1/alerts?status=ACTIVE&limit=5", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const formatted = data.map(a => ({
              id: a.id,
              type: a.alert_type,
              machine: a.machine_id === 1 
                ? "CNC Milling Alpha" 
                : a.machine_id === 2 
                  ? "Robot Arm Beta" 
                  : a.machine_id === 3 
                    ? "Injection Molding Gamma" 
                    : a.machine_id === 4 
                      ? "Hydraulic Press Delta" 
                      : "Conveyor Epsilon",
              severity: a.severity,
              msg: a.message
            }));
            setAlerts(formatted);
          }
        })
        .catch(err => console.log("Failed to load alerts: ", err));
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const navItems = [
    { name: "Executive View", path: "/", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "ENGINEER"] },
    { name: "Production Analytics", path: "/production", icon: BarChart3, roles: ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"] },
    { name: "Quality Control", path: "/quality", icon: Camera, roles: ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"] },
    { name: "Maintenance AI", path: "/maintenance", icon: Wrench, roles: ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"] },
    { name: "Custom Analytics", path: "/analytics", icon: LineChart, roles: ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"] },
    { name: "AI Assistant", path: "/assistant", icon: MessageSquare, roles: ["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"] },
    { name: "Corporate Reports", path: "/reports", icon: FileText, roles: ["ADMIN", "MANAGER", "ENGINEER"] }
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
            <h1 className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none">FACTORYPULSE</h1>
            <span className="text-[10px] text-cyan-400 font-medium tracking-widest uppercase">AI Platform</span>
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
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow" 
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
          <Link to="/profile" className="flex items-center gap-3 mb-4 p-2 rounded-xl hover:bg-brand-border/30 transition group">
            <div className="h-10 w-10 rounded-full bg-cyan-900/40 border border-cyan-500/25 flex items-center justify-center font-bold text-cyan-400 group-hover:border-cyan-400 transition overflow-hidden">
              {avatarImg ? (
                <img src={avatarImg} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user?.username?.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden text-left">
              <p className="text-sm font-semibold text-white truncate leading-none mb-1 group-hover:text-cyan-400 transition">{user?.username}</p>
              <div className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded border border-cyan-500/20">
                <ShieldCheck className="h-3 w-3" />
                {user?.role}
              </div>
            </div>
          </Link>
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

          {/* Notifications & Help Center */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="p-2 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-slate-400 hover:text-white transition"
              title={themeMode === "dark" ? "Switch to Bright Mode" : "Switch to Dark Mode"}
            >
              {themeMode === "dark" ? (
                <Sun className="h-5 w-5 text-amber-400" />
              ) : (
                <Moon className="h-5 w-5 text-indigo-400" />
              )}
            </button>

            <button 
              onClick={() => setInfoOpen(true)}
              className="p-2 bg-brand-bg hover:bg-brand-border border border-brand-border rounded-xl text-slate-400 hover:text-white transition"
              title="Platform Concept Guide"
            >
              <HelpCircle className="h-5 w-5 text-cyan-400" />
            </button>

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
                  {alerts.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs font-medium">
                      No active alerts. Factory system running nominal.
                    </div>
                  ) : (
                    alerts.map(a => (
                      <div key={a.id} className="p-3 bg-brand-bg/60 rounded-xl border border-red-500/10 hover:border-red-500/20 transition">
                        <div className="flex justify-between mb-1 text-left">
                          <span className="text-xs font-bold text-red-400">{a.type}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{a.machine}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-normal text-left">{a.msg}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
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
              <h1 className="font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 leading-none">FACTORYPULSE</h1>
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
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-glow" 
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

      {/* 5. Platform Concept Guide Modal */}
      {infoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setInfoOpen(false)} />
          <div className="relative bg-brand-card border border-brand-border rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl z-10 space-y-6">
            <button 
              onClick={() => setInfoOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-brand-border rounded-lg transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-brand-border/60 pb-4">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400">
                <HelpCircle className="h-6 w-6" />
              </div>
              <div className="text-left">
                <h2 className="text-xl font-bold text-white leading-tight">FactoryPulse AI — Platform Overview</h2>
                <p className="text-slate-400 text-xs mt-0.5">B.Tech Final Year Viva presentation support tool</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-300 text-xs leading-relaxed">
              <div className="space-y-4">
                <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl text-left">
                  <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <Factory className="h-4 w-4 text-cyan-400" />
                    1. Platform Concept (システム概要)
                  </h3>
                  <p>
                    FactoryPulse AI is a **Factory Data Analytics and Business Intelligence Platform**. It translates raw machine variables into high-level business indicators (OEE, yields, and defect rates) to help managers run the factory floor efficiently.
                  </p>
                </div>

                <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl text-left">
                  <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    2. Quality Analytics (OpenCV)
                  </h3>
                  <p>
                    Conveyor line cameras snap photos of parts. OpenCV runs edge and color checks to classify them as PASS or FAIL, immediately updating the **defect counters and OEE charts** on the dashboard.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl text-left">
                  <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-amber-400" />
                    3. Predictive Maintenance (AI Model)
                  </h3>
                  <p>
                    Vibration and heat sensors log data to the database. Our **Scikit-Learn model** compares live logs to historical failure patterns to calculate machine health scores and predict future breakdowns.
                  </p>
                </div>

                <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl text-left">
                  <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-cyan-400" />
                    4. E-STOP & Restart Controls
                  </h3>
                  <p>
                    Clicking E-Stop writes an **`OFFLINE`** state to the database, signaling a machine shutdown. This creates real-time **downtime logs** in our database, which we analyze to measure MTTR and production loss.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-center text-xs">
              <span className="font-bold text-cyan-400">Project Data Base:</span> We processed and database-seeded **108,000 historical sensor logs** to run OEE trends and train the AI models.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
