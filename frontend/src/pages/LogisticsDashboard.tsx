import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Package, ArrowRightLeft, Cpu, Play, Square, RotateCcw, AlertTriangle, CheckCircle, Flame, ArrowRight } from "lucide-react";

interface InventoryItem {
  id: number;
  item_name: string;
  item_code: string;
  quantity: number;
  min_threshold: number;
  unit: string;
}

interface MovementTask {
  id: number;
  material_type: string;
  quantity: number;
  source: string;
  destination: string;
  priority: string;
  assigned_carrier: string;
  status: string;
  created_at: string;
}

interface ConveyorState {
  is_running: boolean;
  speed_mps: number;
  direction: string;
  motor_temp: number;
  current_cargo: string | null;
  status: string;
  error_message: string | null;
}

export default function LogisticsDashboard() {
  const { token, user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tasks, setTasks] = useState<MovementTask[]>([]);
  const [conveyor, setConveyor] = useState<ConveyorState>({
    is_running: false,
    speed_mps: 0.0,
    direction: "FORWARD",
    motor_temp: 35.0,
    current_cargo: null,
    status: "IDLE",
    error_message: null
  });

  const getCargoName = (cargo: string | null) => {
    if (!cargo) return "Cargo";
    return cargo.includes("x ") ? cargo.split("x ")[1] : cargo;
  };

  const getCargoQty = (cargo: string | null) => {
    if (!cargo) return "";
    return cargo.includes("x ") ? cargo.split("x ")[0] : "";
  };

  // Material request form state
  const [materialType, setMaterialType] = useState("Raw Castings");
  const [quantity, setQuantity] = useState(20);
  const [destination, setDestination] = useState("CNC Milling Alpha (Loading Station)");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLogisticsData = () => {
    // 1. Fetch WMS inventory
    fetch("/api/v1/logistics/inventory", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setInventory(data);
      })
      .catch(err => console.log("Failed to load WMS inventory", err));

    // 2. Fetch WES active movement tasks
    fetch("/api/v1/logistics/tasks", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTasks(data);
      })
      .catch(err => console.log("Failed to load WES tasks", err));

    // 3. Fetch WCS conveyor equipment state
    fetch("/api/v1/logistics/conveyor", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.detail) setConveyor(data);
      })
      .catch(err => console.log("Failed to load WCS conveyor state", err));
  };

  useEffect(() => {
    fetchLogisticsData();
    // Regular polling for conveyor telemetry updates
    const interval = setInterval(fetchLogisticsData, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg("");

    fetch("/api/v1/logistics/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        material_type: materialType,
        quantity,
        destination,
        priority
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setSuccessMsg(data.message);
          fetchLogisticsData();
        } else {
          setErrorMsg(data.detail || "Request failed.");
        }
      })
      .catch(() => setErrorMsg("API connection error."))
      .finally(() => setSubmitting(false));
  };

  const handleCompleteTask = (taskId: number) => {
    fetch(`/api/v1/logistics/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(() => fetchLogisticsData())
      .catch(err => console.log("Failed to complete WES task", err));
  };

  const handleConveyorControl = (command: string, extra = {}) => {
    fetch("/api/v1/logistics/conveyor/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ command, ...extra })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          fetchLogisticsData();
        }
      })
      .catch(err => console.log("Direct conveyor control error", err));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-sans">Intelligent Logistics Hub</h2>
          <p className="text-slate-400 text-sm">Centralized WMS (Inventory), WES (Workflows), and WCS (Equipment Control) console</p>
        </div>
        <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>Active Warehouse Protocol: WMS/WES/WCS Loop</span>
        </div>
      </div>

      {/* 1. WMS PANEL: Inventory Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 glass-card rounded-2xl border border-brand-border flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
              <Package className="h-4 w-4 text-cyan-400" />
              WMS Raw Material Stock Balances
            </h3>
            <div className="h-64 w-full">
              {inventory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#202a40" />
                    <XAxis dataKey="item_name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#151c2c", borderColor: "#202a40" }} />
                    <Bar dataKey="quantity" name="Stock Count" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">No stock data loaded.</div>
              )}
            </div>
          </div>
        </div>

        {/* Dispatch Trigger Form */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
            Dispatch Raw Materials (WES)
          </h3>
          <form onSubmit={handleRequestSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Material Type</label>
              <select
                value={materialType}
                onChange={e => setMaterialType(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400"
              >
                <option value="Raw Castings">Raw Castings</option>
                <option value="Bearing Seals">Bearing Seals</option>
                <option value="Spindle Assemblies">Spindle Assemblies</option>
                <option value="Sensor Housings">Sensor Housings</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                className="w-full bg-brand-bg border border-brand-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Destination Location</label>
              <select
                value={destination}
                onChange={e => setDestination(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400"
              >
                <option value="CNC Milling Alpha (Loading Station)">CNC Milling Alpha (Loading Station)</option>
                <option value="Robot Arm Beta (Assembly Bench)">Robot Arm Beta (Assembly Bench)</option>
                <option value="Hydraulic Press Delta (Feeder bin)">Hydraulic Press Delta (Feeder bin)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-400"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority (Urgent)</option>
              </select>
            </div>

            {successMsg && <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold">{successMsg}</div>}
            {errorMsg && <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold">{errorMsg}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase transition"
            >
              {submitting ? "Dispatching..." : "Trigger Dispatch Request"}
            </button>
          </form>
        </div>
      </div>

      {/* 2. WES PANEL: Active Material Movement Tasks */}
      <div className="p-5 glass-card rounded-2xl border border-brand-border">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
          Active WES Workflow Movement Orders
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border pb-3 text-slate-400 uppercase font-bold">
                <th className="py-2">Task ID</th>
                <th className="py-2">Material Type</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Destination</th>
                <th className="py-2">Assigned Carrier</th>
                <th className="py-2">Priority</th>
                <th className="py-2">Status</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length > 0 ? (
                tasks.map(t => (
                  <tr key={t.id} className="border-b border-brand-border/40 hover:bg-brand-border/10 transition-all">
                    <td className="py-3 font-mono font-bold text-slate-400">#00{t.id}</td>
                    <td className="py-3 font-bold text-white">{t.material_type}</td>
                    <td className="py-3 font-semibold">{t.quantity} items</td>
                    <td className="py-3 text-slate-300">{t.destination}</td>
                    <td className="py-3 font-mono text-cyan-400">{t.assigned_carrier}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        t.priority === "HIGH" 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                          : t.priority === "MEDIUM" 
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                            : "bg-slate-500/10 border-slate-500/20 text-slate-400"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-bold uppercase text-[10px]">
                        <span className={`h-2 w-2 rounded-full ${
                          t.status === "COMPLETED" 
                            ? "bg-emerald-400" 
                            : "bg-cyan-400 animate-pulse"
                        }`} />
                        <span className={t.status === "COMPLETED" ? "text-emerald-400" : "text-cyan-400"}>
                          {t.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      {t.status !== "COMPLETED" ? (
                        <button
                          onClick={() => handleCompleteTask(t.id)}
                          className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-lg font-bold text-[10px] uppercase transition"
                        >
                          Complete Delivery
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">Delivered</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-500">No logistics tasks logged in this cycle.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. WCS PANEL: Conveyor Equipment Control Simulation */}
      <div className="p-5 glass-card rounded-2xl border border-brand-border">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-cyan-400" />
          WCS Equipment Telemetry & Conveyor Control (SCADA PLC Override)
        </h3>

        {/* Animated 3D Conveyor belt schematic */}
        <div className="mb-6 p-6 bg-brand-bg rounded-xl border border-brand-border/60 relative overflow-hidden h-56 flex items-center justify-center" style={{ perspective: "1200px" }}>
          <div 
            className="relative w-full max-w-3xl h-20 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 border-y-2 border-slate-700 rounded-lg flex items-center justify-between px-8"
            style={{
              transform: "rotateX(55deg) rotateZ(-12deg) translateY(0px)",
              transformStyle: "preserve-3d",
              boxShadow: "0 25px 35px rgba(0,0,0,0.65), inset 0 2px 4px rgba(255,255,255,0.05)"
            }}
          >
            {/* 3D Rollers */}
            <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none" style={{ transformStyle: "preserve-3d" }}>
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-14 w-2.5 bg-gradient-to-r from-slate-800 via-slate-400 to-slate-800 border-x border-slate-700/50 rounded-full shadow-inner ${
                    conveyor.is_running ? "animate-roller-roll" : ""
                  }`}
                  style={{ 
                    animationDuration: conveyor.speed_mps > 0 ? `${1.0 / conveyor.speed_mps}s` : "0s",
                    transformStyle: "preserve-3d"
                  }}
                />
              ))}
            </div>

            {/* Running 3D Cargo Box Animation */}
            {conveyor.is_running && conveyor.current_cargo && (
              <div 
                className="absolute bottom-5 left-0 h-16 w-16 animate-conveyor-move"
                style={{
                  transformStyle: "preserve-3d",
                  transform: "translateZ(32px)"
                }}
              >
                {/* 3D Cube Cardboard Box (Aligned CSS 3D) */}
                <div 
                  className="relative h-16 w-16" 
                  style={{ 
                    transformStyle: "preserve-3d"
                  }}
                >
                  {/* Front Face */}
                  <div className="absolute inset-0 bg-[#b45309] border-2 border-amber-800 rounded-md flex flex-col items-center justify-center p-1 font-bold text-amber-100 shadow-md text-center leading-tight"
                       style={{ transform: "rotateY(0deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                    <span className="text-[8px] text-amber-300 font-extrabold uppercase font-mono tracking-wider">CARGO</span>
                    <span className="text-[10px] text-white font-black uppercase truncate max-w-[56px] drop-shadow-sm">
                      {getCargoName(conveyor.current_cargo).split(" ")[0]}
                    </span>
                  </div>
                  {/* Back Face */}
                  <div className="absolute inset-0 bg-[#b45309] border-2 border-amber-800 rounded-md flex flex-col items-center justify-center p-1 font-bold text-amber-100 shadow-md text-center leading-tight"
                       style={{ transform: "rotateY(180deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                    <span className="text-[8px] text-amber-300 font-extrabold uppercase font-mono tracking-wider">CARGO</span>
                    <span className="text-[10px] text-white font-black uppercase truncate max-w-[56px] drop-shadow-sm">
                      {getCargoName(conveyor.current_cargo).split(" ")[0]}
                    </span>
                  </div>
                  {/* Right Face */}
                  <div className="absolute inset-0 bg-[#78350f] border-2 border-amber-900 rounded-md flex flex-col items-center justify-center p-1 font-bold text-amber-200/90 shadow-md text-center leading-tight"
                       style={{ transform: "rotateY(90deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                    <span className="text-[8px] text-amber-400 font-mono tracking-wider uppercase font-extrabold">FP-WMS</span>
                    <span className="text-[9px] text-amber-100 font-black uppercase truncate max-w-[56px] drop-shadow-sm">
                      {getCargoName(conveyor.current_cargo).split(" ").slice(1).join(" ") || "PARCEL"}
                    </span>
                  </div>
                  {/* Left Face */}
                  <div className="absolute inset-0 bg-[#78350f] border-2 border-amber-900 rounded-md flex flex-col items-center justify-center p-1 font-bold text-amber-200/90 shadow-md text-center leading-tight"
                       style={{ transform: "rotateY(-90deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                    <span className="text-[8px] text-amber-400 font-mono tracking-wider uppercase font-extrabold">FP-WMS</span>
                    <span className="text-[9px] text-amber-100 font-black uppercase truncate max-w-[56px] drop-shadow-sm">
                      {getCargoName(conveyor.current_cargo).split(" ").slice(1).join(" ") || "PARCEL"}
                    </span>
                  </div>
                  {/* Top Face */}
                  <div className="absolute inset-0 bg-[#d97706] border-2 border-amber-600 rounded-md flex flex-col items-center justify-center p-1 leading-none text-amber-100 shadow-inner"
                       style={{ transform: "rotateX(90deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                    <span className="text-sm">📦</span>
                    <span className="text-[9px] font-black text-white mt-1 bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-700/30">
                      QTY: {getCargoQty(conveyor.current_cargo)}
                    </span>
                  </div>
                  {/* Bottom Face */}
                  <div className="absolute inset-0 bg-[#451a03] border border-amber-950 rounded"
                       style={{ transform: "rotateX(-90deg) translateZ(32px)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }} />
                </div>
                
                {/* Floating Cargo Text Label */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-cyan-900/90 border border-cyan-400 text-white font-bold text-[9px] px-2.5 py-1 rounded shadow-glow">
                  {conveyor.current_cargo}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Gauges & Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Status Gauge */}
          <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Conveyor Status</span>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${
                conveyor.status === "ACTIVE" 
                  ? "bg-emerald-400 animate-pulse" 
                  : conveyor.status === "FAULTED" 
                    ? "bg-rose-500 animate-ping" 
                    : "bg-slate-500"
              }`} />
              <div>
                <p className="text-sm font-bold text-white">{conveyor.status}</p>
                <p className="text-[10px] text-slate-500 uppercase">{conveyor.direction} MODE</p>
              </div>
            </div>
            {conveyor.error_message && (
              <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded text-[9px] font-bold">
                {conveyor.error_message}
              </div>
            )}
          </div>

          {/* Speed Indicator */}
          <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Conveyor Line Speed</span>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-extrabold text-white">{conveyor.speed_mps}</span>
              <span className="text-[10px] text-slate-500 font-bold mb-1">m/s</span>
            </div>
          </div>

          {/* Motor Heat Gauge */}
          <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Motor Coil Temp</span>
            <div className="flex items-center gap-2">
              <Flame className={`h-5 w-5 ${conveyor.motor_temp > 70 ? "text-rose-500 animate-bounce" : "text-amber-400"}`} />
              <div className="flex items-end gap-0.5">
                <span className="text-2xl font-extrabold text-white">{conveyor.motor_temp}°</span>
                <span className="text-[10px] text-slate-500 font-bold mb-1">C</span>
              </div>
            </div>
          </div>

          {/* SCADA Console Controls */}
          <div className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl flex flex-wrap gap-2 items-center justify-center">
            {conveyor.status !== "FAULTED" ? (
              <>
                {!conveyor.is_running ? (
                  <button
                    onClick={() => handleConveyorControl("START")}
                    className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 font-bold text-xs uppercase transition"
                    title="Start Conveyor Belt"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start
                  </button>
                ) : (
                  <button
                    onClick={() => handleConveyorControl("STOP")}
                    className="p-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-1 font-bold text-xs uppercase transition"
                    title="Stop Conveyor Belt"
                  >
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </button>
                )}
                <button
                  onClick={() => handleConveyorControl("REVERSE")}
                  className="p-2 bg-brand-bg hover:bg-brand-border text-slate-400 hover:text-white border border-brand-border rounded-lg flex items-center gap-1 font-bold text-xs uppercase transition"
                  title="Reverse Motor Direction"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reverse
                </button>
                <button
                  onClick={() => handleConveyorControl("TRIGGER_FAULT")}
                  className="p-2 bg-red-950/60 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 rounded-lg flex items-center gap-1 font-bold text-xs uppercase transition"
                  title="Trigger Motor Thermal Trip"
                >
                  <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                  Fault
                </button>
              </>
            ) : (
              <button
                onClick={() => handleConveyorControl("CLEAR_FAULT")}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center justify-center gap-1.5 font-bold text-xs uppercase transition"
              >
                <CheckCircle className="h-4 w-4" />
                Reset Thermal Trip
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
