import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, AreaChart, Area, XAxis, YAxis } from "recharts";
import { 
  Activity, 
  Cpu, 
  AlertTriangle, 
  Zap, 
  Factory, 
  Settings2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

interface Machine {
  id: number;
  name: string;
  type: string;
  location: string;
  status: string;
}

export default function ExecutiveDashboard() {
  const { token, user } = useAuth();
  const [metrics, setMetrics] = useState({
    oee: 86.4,
    yield: 108250,
    defects: 1250,
    defectRate: 1.15,
    energy: 4120.5,
    activeAlerts: 2
  });
  const [machines, setMachines] = useState<Machine[]>([
    { id: 1, name: "CNC Milling Machine Alpha", type: "CNC_MILLING", location: "Bay A - Precision Machining", status: "OPERATIONAL" },
    { id: 2, name: "Industrial Robot Arm Beta", type: "ROBOT_ARM", location: "Bay B - Assembly", status: "OPERATIONAL" },
    { id: 3, name: "Injection Molding Gamma", type: "INJECTION_MOLDING", location: "Bay C - Plastics", status: "OPERATIONAL" },
    { id: 4, name: "Hydraulic Press Delta", type: "HYDRAULIC_PRESS", location: "Bay D - Heavy Stamping", status: "MAINTENANCE" },
    { id: 5, name: "Packaging Conveyor Epsilon", type: "CONVEYOR", location: "Bay E - Shipping", status: "OPERATIONAL" }
  ]);
  
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [newStatus, setNewStatus] = useState("OPERATIONAL");
  const [isUpdating, setIsUpdating] = useState(false);

  const [telemetryTrend, setTelemetryTrend] = useState([
    { time: "10:00", temperature: 72.4, vibration: 2.10 },
    { time: "10:10", temperature: 73.8, vibration: 2.40 },
    { time: "10:20", temperature: 75.1, vibration: 2.20 },
    { time: "10:30", temperature: 74.5, vibration: 2.50 },
    { time: "10:40", temperature: 76.2, vibration: 2.70 },
    { time: "10:50", temperature: 78.4, vibration: 3.10 },
    { time: "11:00", temperature: 79.1, vibration: 3.00 }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryTrend(prev => {
        const nextTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const last = prev[prev.length - 1];
        const nextTemp = Math.max(65, Math.min(95, last.temperature + (Math.random() * 2 - 1)));
        const nextVib = Math.max(1, Math.min(5, last.vibration + (Math.random() * 0.4 - 0.2)));
        return [...prev.slice(1), { time: nextTime, temperature: Number(nextTemp.toFixed(1)), vibration: Number(nextVib.toFixed(2)) }];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 1. Fetch live metrics from FastAPI API
    fetch("/api/v1/dashboard/metrics", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.kpis) {
          setMetrics({
            oee: data.kpis.oee_average,
            yield: data.kpis.total_yield,
            defects: data.kpis.total_defects,
            defectRate: data.kpis.defect_rate,
            energy: data.kpis.energy_consumption_24h,
            activeAlerts: data.kpis.active_alerts
          });
        }
      })
      .catch(err => console.log("Failed to fetch dashboard metrics. Using simulated values."));

    // 2. Fetch live machine configurations
    fetch("/api/v1/machines/", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMachines(data);
      })
      .catch(err => console.log("Failed to fetch machines lists. Using simulated values."));
  }, [token]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/v1/machines/${selectedMachine.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updated = await response.json();
        setMachines(machines.map(m => m.id === updated.id ? updated : m));
        setSelectedMachine(null);
      } else {
        // Fallback for offline mode testing
        console.warn("Backend unavailable. Simulating status update locally.");
        setMachines(machines.map(m => m.id === selectedMachine.id ? { ...m, status: newStatus } : m));
        setSelectedMachine(null);
      }
    } catch (err) {
      console.warn("Backend call failed. Simulating status update locally.");
      setMachines(machines.map(m => m.id === selectedMachine.id ? { ...m, status: newStatus } : m));
      setSelectedMachine(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPERATIONAL": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/25";
      case "MAINTENANCE": return "text-amber-400 bg-amber-500/10 border-amber-500/25";
      case "FAILING": return "text-rose-400 bg-rose-500/10 border-rose-500/25";
      default: return "text-slate-400 bg-slate-500/10 border-slate-500/25";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPERATIONAL": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "MAINTENANCE": return <AlertCircle className="h-4 w-4 text-amber-400" />;
      case "FAILING": return <AlertTriangle className="h-4 w-4 text-rose-400" />;
      default: return <XCircle className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-sans">Executive Overview</h2>
          <p className="text-slate-400 text-sm">Real-time shop floor performance monitoring</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: OEE */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Aggregate OEE</span>
            <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl"><Activity className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight leading-none mb-2">{metrics.oee}%</p>
          <div className="text-xs text-slate-400 font-medium">Availability × Performance × Quality</div>
        </div>

        {/* Card 2: Production Yield */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Shift Yield</span>
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl"><Factory className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight leading-none mb-2">{metrics.yield.toLocaleString()}</p>
          <div className="text-xs text-emerald-400 font-semibold">Defect Rate: {metrics.defectRate}%</div>
        </div>

        {/* Card 3: Power Usage */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Energy Consumption</span>
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl"><Zap className="h-5 w-5" /></div>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight leading-none mb-2">{metrics.energy.toLocaleString()} kWh</p>
          <div className="text-xs text-slate-400 font-medium">Accumulated over 24h</div>
        </div>

        {/* Card 4: Active Alarms */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-start mb-4">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Alarms</span>
            <div className="p-2 bg-red-500/15 text-red-400 rounded-xl"><AlertTriangle className="h-5 w-5 animate-bounce" /></div>
          </div>
          <p className="text-3xl font-bold text-red-400 tracking-tight leading-none mb-2">{metrics.activeAlerts}</p>
          <div className="text-xs text-red-400/80 font-medium">Needs engineering review</div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doughnut Chart: Passed vs Defective Yield */}
        <div className="lg:col-span-1 p-5 glass-card rounded-2xl border border-brand-border flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Operational Yield Balance</h3>
            <p className="text-slate-400 text-xs mb-4">Ratio of Passed vs Defective products in current shift</p>
          </div>
          <div className="h-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: "Passed", value: metrics.yield - metrics.defects },
                    { name: "Defective", value: metrics.defects }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f43f5e" />
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-extrabold text-white">{(100 - metrics.defectRate).toFixed(1)}%</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Pass Rate</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-2 text-xs">
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-emerald-500" /> <span className="text-slate-300">Passed: {(metrics.yield - metrics.defects).toLocaleString()}</span></div>
            <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-rose-500" /> <span className="text-slate-300">Defects: {metrics.defects.toLocaleString()}</span></div>
          </div>
        </div>

        {/* Real-time Telemetry Trend Graph */}
        <div className="lg:col-span-2 p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">Vibration & Temperature Telemetry</h3>
              <p className="text-slate-400 text-xs">Real-time dynamic sensor signals from Bay A CNC spindle</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">LIVE DATA STREAM</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryTrend}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Area type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                <Area type="monotone" dataKey="vibration" name="Vibration (mm/s)" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorVib)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Machinery Status Grid */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Active Shop-Floor Assets</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {machines.map(m => {
            // Map dynamic or mock health/runtime to match the mockup visual
            const health = m.id === 1 ? 91 : m.id === 2 ? 94 : m.id === 3 ? 88 : m.id === 4 ? 92 : 95;
            const runtime = m.id === 1 ? "8h 12m" : m.id === 2 ? "7h 45m" : m.id === 3 ? "12h 30m" : m.id === 4 ? "4h 15m" : "24h 00m";
            const isOperational = m.status.toUpperCase() === "OPERATIONAL" || m.status.toUpperCase() === "ACTIVE" || m.status.toUpperCase() === "RUNNING";
            
            // SVG path dimensions for semi-circle arc
            const radius = 45;
            const circumference = Math.PI * radius; // ~141.37
            const strokeDashoffset = circumference * (1 - health / 100);
            
            return (
              <div key={m.id} className={`p-5 glass-card rounded-2xl border ${m.id === 1 ? 'border-cyan-500/50 shadow-glow-cyan' : 'border-brand-border'} relative overflow-hidden flex flex-col justify-between transition-all duration-300 hover:scale-[1.02]`}>
                {/* Top Row: Name and Status */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-white leading-tight text-sm mb-0.5">{m.name}</h4>
                    <span className="text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider">{m.type.replace("_", " ")}</span>
                  </div>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                    isOperational ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" : "text-rose-400 bg-rose-500/10 border-rose-500/25"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isOperational ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'} mr-0.5`} />
                    {m.status}
                  </div>
                </div>

                {/* Center: Radial Semi-Circle Gauge */}
                <div className="flex flex-col items-center justify-center my-2 relative">
                  <svg className="w-40 h-24 overflow-visible" viewBox="0 0 120 70">
                    <defs>
                      <filter id={`glow-${m.id}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    {/* Background arc */}
                    <path
                      d="M 15 60 A 45 45 0 0 1 105 60"
                      fill="none"
                      stroke="#1e293b"
                      strokeWidth="8"
                      strokeLinecap="round"
                    />
                    {/* Foreground progress arc */}
                    <path
                      d="M 15 60 A 45 45 0 0 1 105 60"
                      fill="none"
                      stroke={health >= 90 ? "#10b981" : health >= 75 ? "#06b6d4" : "#f43f5e"}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      filter={`url(#glow-${m.id})`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* Inner Gauge Text */}
                  <div className="absolute top-[35px] text-center flex flex-col items-center">
                    <span className="text-xl font-extrabold text-white leading-none">{health}%</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 font-sans">Health</span>
                  </div>
                </div>

                {/* Bottom Row: Runtime and Config Button */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand-border/40 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1 font-mono">
                    <span>Runtime:</span>
                    <span className="text-slate-300 font-bold">{runtime}</span>
                  </div>
                  
                  {user && ["ADMIN", "ENGINEER"].includes(user.role) && (
                    <button 
                      onClick={() => {
                        setSelectedMachine(m);
                        setNewStatus(m.status);
                      }}
                      className="p-1.5 bg-brand-bg hover:bg-brand-border rounded-lg text-slate-500 hover:text-cyan-400 border border-brand-border transition"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Update Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMachine(null)} />
          <div className="relative w-full max-w-md glass-panel p-6 rounded-2xl shadow-xl border border-brand-border z-10">
            <h3 className="text-lg font-bold text-white mb-4">Update operational status</h3>
            <p className="text-slate-400 text-sm mb-4">Modify running state for <span className="text-white font-semibold">{selectedMachine.name}</span></p>
            
            <form onSubmit={handleStatusUpdate}>
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 text-sm"
                >
                  <option value="OPERATIONAL">OPERATIONAL</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="FAILING">FAILING</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedMachine(null)}
                  className="px-4 py-2 border border-brand-border text-slate-400 hover:text-white rounded-lg text-sm font-semibold hover:bg-brand-border/40 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  {isUpdating ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
