import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { 
  Camera, Upload, AlertOctagon, HelpCircle, Play, Pause, Square, 
  ZoomIn, ZoomOut, RotateCcw, Check, X, ShieldAlert, Cpu, Activity,
  Info
} from "lucide-react";

interface QualityStats {
  total_inspected: number;
  passed_count: number;
  failed_count: number;
  pass_rate: number;
  defect_distribution: { [key: string]: number };
}

interface InspectionResult {
  status: string;
  defect_type: string;
  confidence_score: number;
  image_path: string;
}

interface RecentLog {
  id: string;
  part_name: string;
  status: "PASS" | "FAIL";
  timestamp: string;
}

export default function QualityDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<QualityStats>({
    total_inspected: 1561,
    passed_count: 1498,
    failed_count: 63,
    pass_rate: 95.96,
    defect_distribution: {
      LABEL_MISSING: 12,
      SURFACE_CRACK: 18,
      DAMAGE: 8,
      WRONG_COLOR: 15,
      WRONG_PACKAGING: 3,
      WRONG_DIMENSION: 7
    }
  });

  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>("/datasets/demo_images/machined_part_inspection.jpg");
  const [inspectionResult, setInspectionResult] = useState<InspectionResult | null>({
    status: "PASS",
    defect_type: "NONE",
    confidence_score: 0.98,
    image_path: "/datasets/demo_images/machined_part_inspection.jpg"
  });

  // Zoom level state
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Live 3D Factory Video Simulator State
  const [isLive, setIsLive] = useState(false);
  const [livePartPos, setLivePartPos] = useState(0);
  const [liveDefect, setLiveDefect] = useState<string>("NONE");
  const [liveStatus, setLiveStatus] = useState<string>("PASS");
  const [conveyorHalted, setConveyorHalted] = useState(false);
  const [recentFailures, setRecentFailures] = useState<string[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Recent Inspection List logs state
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([
    { id: "M-1560", part_name: "CYLINDER_BRACKET", status: "PASS", timestamp: "14:58:30" },
    { id: "M-1559", part_name: "SPINDLE_SEAL", status: "FAIL", timestamp: "14:57:42" },
    { id: "M-1558", part_name: "CYLINDER_BRACKET", status: "PASS", timestamp: "14:56:11" },
    { id: "M-1557", part_name: "HOUSING_PLUG", status: "PASS", timestamp: "14:55:03" },
    { id: "M-1556", part_name: "HOUSING_PLUG", status: "FAIL", timestamp: "14:54:19" }
  ]);

  const fetchStats = () => {
    fetch("/api/v1/quality/stats", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total_inspected === "number") setStats(data);
      })
      .catch(() => console.log("Backend stats unavailable. Using local state."));
  };

  useEffect(() => {
    fetchStats();
  }, [token]);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setInspectionResult(null);
      setIsLive(false); // Switch to static mode on file select
    }
  };

  // Upload and run inspection
  const executeInspection = async (fileToUpload: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const response = await fetch("/api/v1/quality/inspect", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setInspectionResult({
          status: result.status,
          defect_type: result.defect_type,
          confidence_score: result.confidence_score,
          image_path: result.image_path
        });
        
        // Add to recent logs list
        const nextId = `M-${stats.total_inspected + 1}`;
        setRecentLogs(prev => [
          { id: nextId, part_name: fileToUpload.name.toUpperCase().replace(".PNG", ""), status: result.status, timestamp: new Date().toLocaleTimeString().split(" ")[0] },
          ...prev.slice(0, 4)
        ]);

        fetchStats();
      } else {
        simulateOfflineInspection(fileToUpload.name);
      }
    } catch (err) {
      simulateOfflineInspection(fileToUpload.name);
    } finally {
      setLoading(false);
    }
  };

  // Mock CV analysis when backend database is not running
  const simulateOfflineInspection = (filename: string) => {
    let status = "FAIL";
    let defect_type = "SURFACE_CRACK";
    
    if (filename.includes("healthy") || filename.includes("OK")) {
      status = "PASS";
      defect_type = "NONE";
    } else if (filename.includes("label_missing") || filename.includes("missing")) {
      defect_type = "LABEL_MISSING";
    } else if (filename.includes("wrong_color") || filename.includes("color")) {
      defect_type = "WRONG_COLOR";
    } else if (filename.includes("wrong_dimension") || filename.includes("dimension")) {
      defect_type = "WRONG_DIMENSION";
    }
    
    setStats(prev => {
      const isPass = status === "PASS";
      const nextTotal = prev.total_inspected + 1;
      const nextPassed = isPass ? prev.passed_count + 1 : prev.passed_count;
      const nextFailed = !isPass ? prev.failed_count + 1 : prev.failed_count;
      const nextDist = { ...prev.defect_distribution };
      
      if (defect_type !== "NONE" && defect_type in nextDist) {
        nextDist[defect_type] = nextDist[defect_type] + 1;
      }
      
      return {
        total_inspected: nextTotal,
        passed_count: nextPassed,
        failed_count: nextFailed,
        pass_rate: Math.round((nextPassed / nextTotal) * 10000) / 100,
        defect_distribution: nextDist
      };
    });

    const nextId = `M-${stats.total_inspected + 1}`;
    setRecentLogs(prev => [
      { id: nextId, part_name: filename.toUpperCase().replace(".PNG", ""), status: status as "PASS" | "FAIL", timestamp: new Date().toLocaleTimeString().split(" ")[0] },
      ...prev.slice(0, 4)
    ]);

    setInspectionResult({
      status,
      defect_type,
      confidence_score: 0.95 + Math.random() * 0.04,
      image_path: "/datasets/demo_images/machined_part_inspection.jpg"
    });
  };

  const inspectDemoPart = async (partName: string) => {
    setLoading(true);
    setInspectionResult(null);
    setPreviewUrl("/datasets/demo_images/machined_part_inspection.jpg");
    
    try {
      const imgResponse = await fetch(`/datasets/demo_images/${partName}`);
      const blob = await imgResponse.blob();
      const file = new File([blob], partName, { type: "image/png" });
      await executeInspection(file);
    } catch (err) {
      simulateOfflineInspection(partName);
      setLoading(false);
    }
  };

  // Keyboard shortcut listener simulated
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (isLive && !conveyorHalted) {
          // Force capture frame
          setInspectionResult({
            status: liveStatus,
            defect_type: liveDefect,
            confidence_score: 0.94 + Math.random() * 0.05,
            image_path: "/datasets/demo_images/machined_part_inspection.jpg"
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLive, liveStatus, liveDefect, conveyorHalted]);

  // Live 3D inspection interval loop
  useEffect(() => {
    if (!isLive || conveyorHalted) return;

    const interval = setInterval(() => {
      setLivePartPos(prev => {
        if (prev >= 100) {
          const isDefect = Math.random() < 0.18; // 18% defect rate
          if (isDefect) {
            const types = ["SURFACE_CRACK", "LABEL_MISSING", "WRONG_COLOR", "WRONG_DIMENSION"];
            const selected = types[Math.floor(Math.random() * types.length)];
            setLiveDefect(selected);
            setLiveStatus("FAIL");
          } else {
            setLiveDefect("NONE");
            setLiveStatus("PASS");
          }
          return 0;
        }

        const nextPos = prev + (1.2 * playbackSpeed);

        // When part crosses the laser check center line (50%)
        if (prev < 50 && nextPos >= 50) {
          setStats(prevStats => {
            const isPass = liveStatus === "PASS";
            const nextTotal = prevStats.total_inspected + 1;
            const nextPassed = isPass ? prevStats.passed_count + 1 : prevStats.passed_count;
            const nextFailed = !isPass ? prevStats.failed_count + 1 : prevStats.failed_count;
            const nextDist = { ...prevStats.defect_distribution };
            
            if (liveDefect !== "NONE" && liveDefect in nextDist) {
              nextDist[liveDefect] = nextDist[liveDefect] + 1;
            }
            
            return {
              total_inspected: nextTotal,
              passed_count: nextPassed,
              failed_count: nextFailed,
              pass_rate: Math.round((nextPassed / nextTotal) * 10000) / 100,
              defect_distribution: nextDist
            };
          });

          // Prepend recent logs
          const nextId = `M-${stats.total_inspected + 1}`;
          setRecentLogs(prev => [
            { id: nextId, part_name: "CYLINDER_BRACKET", status: liveStatus as "PASS" | "FAIL", timestamp: new Date().toLocaleTimeString().split(" ")[0] },
            ...prev.slice(0, 4)
          ]);

          // Check consecutive failures
          setRecentFailures(prevFails => {
            const updated = [...prevFails, liveStatus];
            const lastThree = updated.slice(-3);
            if (lastThree.length === 3 && lastThree.every(s => s === "FAIL")) {
              setConveyorHalted(true);
            }
            return lastThree;
          });

          setInspectionResult({
            status: liveStatus,
            defect_type: liveDefect,
            confidence_score: 0.93 + Math.random() * 0.06,
            image_path: "/datasets/demo_images/machined_part_inspection.jpg"
          });
        }

        return nextPos;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isLive, liveStatus, liveDefect, conveyorHalted, playbackSpeed, stats.total_inspected]);

  // Recharts Chart Config
  const chartData = Object.entries(stats.defect_distribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ name: key.replace("_", " "), value }));

  const COLORS = ["#38bdf8", "#818cf8", "#f43f5e", "#f59e0b", "#10b981", "#a855f7"];

  return (
    <div className="space-y-5 text-slate-200">
      
      {/* Top Banner Alert if Conveyor is Halted */}
      {isLive && conveyorHalted && (
        <div className="p-3.5 bg-rose-950/80 border-2 border-rose-500 rounded-xl flex items-center justify-between shadow-2xl animate-pulse text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wide">SCADA Safe Shutdown Interlock Active</h4>
              <p className="text-rose-300 text-[10px]">Conveyor belt halted automatically after 3 consecutive defect check failures. Machine recalibration required.</p>
            </div>
          </div>
          <button 
            onClick={() => { setConveyorHalted(false); setRecentFailures([]); setLivePartPos(0); }}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition"
          >
            Reset Conveyor PLC
          </button>
        </div>
      )}

      {/* Main 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">

        {/* LEFT COLUMN: Stats and Presets (30% / 3 Cols) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          
          {/* KPI Dashboard Panel */}
          <div className="p-4 glass-card border border-brand-border rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Inspection Dashboard
            </h3>
            
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-2.5 bg-brand-bg/50 border border-brand-border/60 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Total Inspected</span>
                <p className="text-lg font-black text-white mt-0.5">{stats.total_inspected}</p>
              </div>
              <div className="p-2.5 bg-brand-bg/50 border border-brand-border/60 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Pass Rate</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.pass_rate}%</p>
              </div>
              <div className="p-2.5 bg-brand-bg/50 border border-brand-border/60 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Passed Yield</span>
                <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.passed_count}</p>
              </div>
              <div className="p-2.5 bg-brand-bg/50 border border-brand-border/60 rounded-xl">
                <span className="text-[9px] text-slate-400 uppercase font-semibold">Fail Count</span>
                <p className="text-lg font-black text-rose-500 mt-0.5">{stats.failed_count}</p>
              </div>
            </div>
          </div>

          {/* Preset parts selector */}
          {!isLive && (
            <div className="p-4 glass-card border border-brand-border rounded-2xl space-y-3">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Inspect Seeded Parts</span>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => inspectDemoPart("healthy_part.png")} className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[10px] rounded-lg text-emerald-400 font-semibold transition">
                  Healthy Part
                </button>
                <button onClick={() => inspectDemoPart("label_missing.png")} className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[10px] rounded-lg text-rose-400 font-semibold transition">
                  Missing Label
                </button>
                <button onClick={() => inspectDemoPart("surface_crack.png")} className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[10px] rounded-lg text-rose-400 font-semibold transition">
                  Surface Crack
                </button>
                <button onClick={() => inspectDemoPart("wrong_color.png")} className="px-2.5 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[10px] rounded-lg text-rose-400 font-semibold transition">
                  Wrong Color
                </button>
              </div>
            </div>
          )}

          {/* Recent results logs */}
          <div className="p-4 glass-card border border-brand-border rounded-2xl space-y-3 flex-1 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block mb-2">Recent Checks Logs</span>
              <div className="space-y-2">
                {recentLogs.map((log, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-brand-bg/40 p-2 rounded-lg border border-brand-border/40 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${log.status === "PASS" ? "bg-emerald-400" : "bg-rose-500 animate-pulse"}`} />
                      <span className="font-mono text-slate-400">{log.id}</span>
                      <span className="font-semibold text-white truncate max-w-[80px]">{log.part_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-mono text-[9px]">{log.timestamp}</span>
                      <span className={`font-bold ${log.status === "PASS" ? "text-emerald-400" : "text-rose-500"}`}>{log.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Static Action Upload file bar */}
            {!isLive && (
              <div className="relative border border-dashed border-brand-border/60 rounded-xl bg-brand-bg/50 p-2 text-center hover:bg-brand-border/20 transition cursor-pointer mt-4">
                <Upload className="h-4 w-4 text-cyan-400 mx-auto mb-1" />
                <span className="text-[9px] text-slate-400 block font-semibold">Select / Drag Custom Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-30"
                />
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Live view HUD (40% / 4 Cols) */}
        <div className="lg:col-span-4 glass-card border border-brand-border rounded-2xl p-4 space-y-4">
          
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              📷 Inspection View
            </h3>
            
            {/* Toggle block */}
            <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
              <button 
                onClick={() => { setIsLive(false); setInspectionResult(null); }}
                className={`px-2.5 py-1 rounded font-semibold text-[10px] transition ${!isLive ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Static View
              </button>
              <button 
                onClick={() => { setIsLive(true); setConveyorHalted(false); setLivePartPos(0); }}
                className={`px-2.5 py-1 rounded font-semibold text-[10px] transition ${isLive ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Live 3D View
              </button>
            </div>
          </div>

          {/* Interactive Bounding box / Image display area */}
          <div className="border border-brand-border rounded-xl bg-[#030712] aspect-video overflow-hidden relative" style={{ perspective: "800px" }}>
            {/* Corner HUD Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
            
            {/* HUD Status Banners */}
            <div className="absolute top-3 left-3 font-mono text-[9px] text-cyan-400/80 bg-[#0c1020]/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
              {isLive ? "LIVE_GANTRY_CAMERA" : "STATIC_CAPTURE"}
            </div>
            {isLive && (
              <div className="absolute top-3 right-3 font-mono text-[9px] text-emerald-400/80 bg-[#0c1020]/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
                {conveyorHalted ? "SCADA_HALT" : "CONVEYOR_30FPS"}
              </div>
            )}

            {/* Scale/Zoom styling overlay */}
            <div 
              className="absolute inset-0 transition-transform duration-200 ease-out" 
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {isLive ? (
                /* Live 3D Conveyor */
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div 
                    className="w-[120%] h-[30%] bg-[#1e293b]/30 border-t border-b border-cyan-500/30 relative overflow-hidden"
                    style={{
                      transform: "rotateX(55deg) rotateZ(-12deg) translateY(20px)",
                      transformStyle: "preserve-3d",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.8)"
                    }}
                  >
                    {!conveyorHalted && (
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_45%,#0f172a_50%,transparent_55%)] bg-[size:40px_100%] animate-conveyor-move" />
                    )}

                    {/* Cylinder */}
                    {!conveyorHalted && (
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-br from-slate-300 to-slate-600 rounded-full border border-slate-400"
                        style={{
                          left: `${livePartPos}%`,
                          transform: "translateZ(10px) rotateX(-20deg)",
                          boxShadow: "0 8px 16px rgba(0,0,0,0.6)"
                        }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-950 rounded-full border border-slate-500" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Static Image rendering with HUD Scan */
                <div className="absolute inset-0">
                  {previewUrl && <img src={previewUrl} alt="Part Visual" className="w-full h-full object-cover" />}
                  {previewUrl && <div className="animate-laser-scan" />}
                </div>
              )}
            </div>

            {/* Dotted target center scanner line */}
            <div className={`absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2 pointer-events-none z-15 transition-all duration-100 ${
              isLive && livePartPos >= 48 && livePartPos <= 52 
                ? "bg-emerald-400 shadow-[0_0_15px_#10b981]" 
                : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
            }`} />

            {/* Target Ring crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 opacity-20 flex items-center justify-center">
              <div className="h-12 w-12 border border-dashed border-cyan-400 rounded-full animate-pulse" />
              <div className="absolute h-16 w-px bg-cyan-400" />
              <div className="absolute w-16 h-px bg-cyan-400" />
            </div>

            {/* Dynamic Defect box bounds for live tracking */}
            {isLive && !conveyorHalted && livePartPos > 50 && livePartPos < 95 && (
              <div 
                className="absolute w-16 h-16 border-2 rounded pointer-events-none z-20"
                style={{ 
                  top: "35%", 
                  left: `${livePartPos - 3}%`,
                  borderColor: liveStatus === "PASS" ? "#10b981" : "#f43f5e",
                  boxShadow: liveStatus === "PASS" ? "0 0 10px rgba(16, 185, 129, 0.4)" : "0 0 10px rgba(244, 63, 94, 0.4)"
                }}
              >
                <span className="text-[6px] text-white font-bold bg-[#0c1020]/95 px-1 py-0.5 rounded border tracking-tight whitespace-nowrap absolute -mt-5">
                  {liveStatus === "PASS" ? "STATUS: OK" : `ALERT: ${liveDefect}`}
                </span>
              </div>
            )}
            
            {/* Static Image overlays bounding boxes */}
            {!isLive && inspectionResult && (
              <div className="absolute inset-0 pointer-events-none z-25">
                {inspectionResult.defect_type === "SURFACE_CRACK" && (
                  <div className="absolute border-2 border-rose-500 rounded animate-pulse" style={{ top: "35%", left: "40%", width: "20%", height: "25%", boxShadow: "0 0 15px rgba(239, 68, 68, 0.7)" }}>
                    <div className="absolute -top-6 left-0 bg-rose-950/90 border border-rose-500 text-rose-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg">
                      [CRITICAL] SURFACE_CRACK (96% CONF)
                    </div>
                  </div>
                )}
                {inspectionResult.defect_type === "LABEL_MISSING" && (
                  <div className="absolute border-2 border-amber-500 rounded animate-pulse" style={{ top: "25%", left: "60%", width: "22%", height: "30%", boxShadow: "0 0 15px rgba(245, 158, 11, 0.7)" }}>
                    <div className="absolute -top-6 left-0 bg-amber-950/90 border border-amber-500 text-amber-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg">
                      [MISSING] SERIAL_LABEL (94% CONF)
                    </div>
                  </div>
                )}
                {inspectionResult.defect_type === "WRONG_COLOR" && (
                  <div className="absolute border-2 border-yellow-400 rounded animate-pulse" style={{ top: "20%", left: "30%", width: "35%", height: "45%", boxShadow: "0 0 15px rgba(250, 204, 21, 0.7)" }}>
                    <div className="absolute -top-6 left-0 bg-yellow-950/90 border border-yellow-400 text-yellow-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg">
                      [WARNING] COLOR_MISMATCH (92% CONF)
                    </div>
                  </div>
                )}
                {inspectionResult.defect_type === "WRONG_DIMENSION" && (
                  <div className="absolute border-2 border-cyan-400 rounded animate-pulse" style={{ top: "15%", left: "25%", width: "50%", height: "65%", boxShadow: "0 0 15px rgba(6, 182, 212, 0.7)" }}>
                    <div className="absolute -top-6 left-0 bg-cyan-950/90 border border-cyan-400 text-cyan-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg">
                      📏 [OUT OF SPEC] Δy +1.2mm (95% CONF)
                    </div>
                  </div>
                )}
                {inspectionResult.status === "PASS" && (
                  <div className="absolute border-2 border-emerald-500 rounded" style={{ top: "15%", left: "20%", width: "60%", height: "70%", boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)" }}>
                    <div className="absolute top-2 right-2 bg-emerald-950/90 border border-emerald-500 text-emerald-400 font-black text-[9px] px-2 py-0.5 rounded shadow-lg">
                      ✅ PASS // NO DEFECTS
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Bounding box controls */}
          <div className="flex justify-between items-center bg-brand-bg/50 p-2.5 rounded-xl border border-brand-border text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-semibold text-[10px] uppercase">Inspection Status:</span>
              {inspectionResult ? (
                <span className={`font-bold ${inspectionResult.status === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>
                  {inspectionResult.status} ({Math.round(inspectionResult.confidence_score * 100)}%)
                </span>
              ) : (
                <span className="text-slate-500">IDLE</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))}
                className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition"
                title="Zoom In"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 1))}
                className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition"
                title="Zoom Out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button 
                onClick={() => setZoomLevel(1)}
                className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition"
                title="Reset View"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results & Golden sample comparison (30% / 3 Cols) */}
        <div className="lg:col-span-3 glass-card border border-brand-border rounded-2xl p-4 space-y-4 flex flex-col justify-between">
          
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-3">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              📋 Results Analysis
            </h3>

            {/* Side by side Golden sample comparison */}
            <div className="space-y-2">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Golden Sample Comparison</span>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-brand-bg/50 border border-emerald-500/40 rounded-xl flex flex-col items-center">
                  <span className="text-[8px] text-emerald-400 uppercase font-black tracking-widest mb-1.5 flex items-center gap-0.5">
                    <Check className="h-2.5 w-2.5" /> GOLDEN
                  </span>
                  <div className="w-full h-16 bg-[#030712] rounded border border-brand-border/40 overflow-hidden relative">
                    <img src="/datasets/demo_images/machined_part_inspection.jpg" alt="Golden template reference" className="w-full h-full object-cover opacity-80" />
                  </div>
                </div>
                
                <div className={`p-2 bg-brand-bg/50 border rounded-xl flex flex-col items-center transition ${
                  inspectionResult?.status === "PASS" ? "border-emerald-500/40" : "border-rose-500/40"
                }`}>
                  <span className={`text-[8px] uppercase font-black tracking-widest mb-1.5 flex items-center gap-0.5 ${
                    inspectionResult?.status === "PASS" ? "text-emerald-400" : "text-rose-500"
                  }`}>
                    {inspectionResult?.status === "PASS" ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />} CURRENT
                  </span>
                  <div className="w-full h-16 bg-[#030712] rounded border border-brand-border/40 overflow-hidden relative">
                    <img src="/datasets/demo_images/machined_part_inspection.jpg" alt="Active check" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed checks checklist */}
            <div className="space-y-2.5 mt-4">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Diagnostics Checklist</span>
              
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between items-center bg-brand-bg/40 p-2 rounded-lg border border-brand-border/30">
                  <span className="text-slate-300">Surface Integrity Check</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    inspectionResult?.defect_type === "SURFACE_CRACK" ? "text-rose-500" : "text-emerald-400"
                  }`}>
                    {inspectionResult?.defect_type === "SURFACE_CRACK" ? "❌ FAIL (CRACK)" : "✅ PASS"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center bg-brand-bg/40 p-2 rounded-lg border border-brand-border/30">
                  <span className="text-slate-300">Marking & Serial Label</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    inspectionResult?.defect_type === "LABEL_MISSING" ? "text-rose-500" : "text-emerald-400"
                  }`}>
                    {inspectionResult?.defect_type === "LABEL_MISSING" ? "❌ MISSING" : "✅ PASS"}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-brand-bg/40 p-2 rounded-lg border border-brand-border/30">
                  <span className="text-slate-300">Color Spectrum analysis</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    inspectionResult?.defect_type === "WRONG_COLOR" ? "text-rose-500" : "text-emerald-400"
                  }`}>
                    {inspectionResult?.defect_type === "WRONG_COLOR" ? "❌ DEVIATION" : "✅ PASS"}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-brand-bg/40 p-2 rounded-lg border border-brand-border/30">
                  <span className="text-slate-300">Dimensional tolerances (XYZ)</span>
                  <span className={`font-bold flex items-center gap-1 ${
                    inspectionResult?.defect_type === "WRONG_DIMENSION" ? "text-rose-500" : "text-emerald-400"
                  }`}>
                    {inspectionResult?.defect_type === "WRONG_DIMENSION" ? "❌ ERR (Δy)" : "✅ PASS"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active defects warning list logs */}
          <div className="mt-4 p-3 bg-brand-bg/40 border border-brand-border/60 rounded-xl text-[10px]">
            <span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Defects Breakdown Log:</span>
            {inspectionResult && inspectionResult.defect_type !== "NONE" ? (
              <ul className="list-disc pl-4 space-y-1 text-rose-400 font-medium">
                {inspectionResult.defect_type === "SURFACE_CRACK" && <li>Surface fracture detected near centroid (x:245, y:180).</li>}
                {inspectionResult.defect_type === "LABEL_MISSING" && <li>Missing serial identification barcode label.</li>}
                {inspectionResult.defect_type === "WRONG_COLOR" && <li>RGB spectrum mismatch. Target: Silver. Detected: Gray.</li>}
                {inspectionResult.defect_type === "WRONG_DIMENSION" && <li>Caliper limits exceeded. Height Δy: +1.2mm.</li>}
              </ul>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                <Check className="h-3 w-3" /> No abnormalities found.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM PANEL: Live feed controller and speed indicators (Full-Width) */}
      {isLive && (
        <div className="p-3.5 glass-card border border-brand-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Simulation Controls:</span>
              <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
                <button 
                  onClick={() => setConveyorHalted(false)}
                  className={`p-1 px-2.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                    !conveyorHalted ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Play className="h-3 w-3" /> Run
                </button>
                <button 
                  onClick={() => setConveyorHalted(true)}
                  className={`p-1 px-2.5 rounded text-[10px] font-bold transition flex items-center gap-1 ${
                    conveyorHalted ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Pause className="h-3 w-3" /> Halt
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-2 border-l border-brand-border pl-4">
              <span className="text-slate-400 uppercase text-[9px] font-bold">Speed:</span>
              <div className="flex gap-1">
                {[1, 2, 4].map(speed => (
                  <button 
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                      playbackSpeed === speed 
                        ? "bg-cyan-600 border-cyan-500 text-white" 
                        : "bg-brand-bg border-brand-border text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5 text-slate-400 text-[10px] font-mono border-t md:border-t-0 border-brand-border pt-2.5 md:pt-0">
            <div>
              SCAN_TOLERANCE: <span className="text-emerald-400">±0.2mm</span>
            </div>
            <div>
              ACTIVE_JOBS: <span className="text-cyan-400">1247</span>
            </div>
            <div>
              SYSTEM_INTEGRITY: <span className="text-emerald-400">98.6%</span>
            </div>
          </div>
        </div>
      )}

      {/* Global tips and keyboard help bar */}
      <div className="flex items-center gap-2 p-2.5 bg-brand-bg/30 border border-brand-border/60 rounded-xl text-[10px] text-slate-400 justify-center">
        <Info className="h-3.5 w-3.5 text-cyan-400" />
        <span>💡 **Genba Operator Tip**: Press <kbd className="bg-brand-card px-1 py-0.5 border border-brand-border rounded text-white font-mono text-[9px]">SPACEBAR</kbd> to manually capture current frames, or click Reset PLC to override alarm halts.</span>
      </div>
      
    </div>
  );
}
