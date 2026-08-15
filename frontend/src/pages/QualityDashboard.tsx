import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { 
  Camera, Upload, AlertOctagon, HelpCircle, Play, Pause, 
  ZoomIn, ZoomOut, RotateCcw, Check, X, ShieldAlert, Cpu, Activity,
  Info, Sparkles, RefreshCw
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
    total_inspected: 1573,
    passed_count: 1509,
    failed_count: 64,
    pass_rate: 95.93,
    defect_distribution: {
      LABEL_MISSING: 12,
      SURFACE_CRACK: 19,
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
    { id: "M-1573", part_name: "CYLINDER_BRACKET", status: "PASS", timestamp: "3:04:23" },
    { id: "M-1572", part_name: "CYLINDER_BRACKET", status: "PASS", timestamp: "3:04:21" },
    { id: "M-1571", part_name: "CYLINDER_BRACKET", status: "PASS", timestamp: "3:04:18" },
    { id: "M-1570", part_name: "SPINDLE_SEAL", status: "FAIL", timestamp: "3:03:52" },
    { id: "M-1569", part_name: "HOUSING_PLUG", status: "PASS", timestamp: "3:03:03" }
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

  return (
    <div className="space-y-5 text-slate-200">
      
      {/* 3-COLUMN LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-stretch">

        {/* LEFT COLUMN: Warnings, Action panel (30% / 3 Cols) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          
          {/* Section: Title */}
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">FactoryPulse AI</h2>
            <p className="text-slate-400 text-[10px] uppercase font-mono tracking-widest mt-0.5">Quality Inspection HUD</p>
          </div>

          {/* Prominent SCADA Warning alert */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between flex-1 min-h-[160px] transition-all duration-300 ${
            isLive && conveyorHalted 
              ? "bg-rose-950/80 border-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse" 
              : "bg-brand-card/50 border-brand-border/60 backdrop-blur-md"
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl ${
                isLive && conveyorHalted ? "bg-rose-500/20 text-rose-500" : "bg-cyan-500/10 text-cyan-400"
              }`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">SCADA Interlock Loop</h4>
                <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                  {isLive && conveyorHalted 
                    ? "SYSTEM LOCKED: 3 consecutive defective parts triggered a gantry safe shutdown. Calibrate toolings." 
                    : "SCADA systems are active. Conveyor safety trip limits are online (Consecutive failure limit: 3)."}
                </p>
              </div>
            </div>
            
            {isLive && conveyorHalted && (
              <button 
                onClick={() => { setConveyorHalted(false); setRecentFailures([]); setLivePartPos(0); }}
                className="w-full h-12 min-h-[48px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-4 w-4" /> Reset Conveyor PLC
              </button>
            )}
          </div>

          {/* Quick Actions (glove friendly 48px buttons) */}
          <div className="p-4 glass-card border border-brand-border rounded-2xl space-y-3">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Quick Actions Control</span>
            <div className="flex flex-col gap-2">
              
              {!isLive ? (
                /* Run CV button for static */
                selectedFile && !inspectionResult && !loading ? (
                  <button 
                    onClick={() => executeInspection(selectedFile)}
                    className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                  >
                    <Activity className="h-4 w-4" /> Execute CV Analysis
                  </button>
                ) : (
                  <div className="relative w-full h-12 min-h-[48px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    <span>Upload Part Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-30"
                    />
                  </div>
                )
              ) : (
                /* Capture frame button for live */
                <button 
                  onClick={() => {
                    if (!conveyorHalted) {
                      setInspectionResult({
                        status: liveStatus,
                        defect_type: liveDefect,
                        confidence_score: 0.93 + Math.random() * 0.05,
                        image_path: "/datasets/demo_images/machined_part_inspection.jpg"
                      });
                    }
                  }}
                  disabled={conveyorHalted}
                  className="w-full h-12 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Camera className="h-4 w-4" /> Capture New Inspection
                </button>
              )}

              {/* Preset buttons */}
              {!isLive && (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button onClick={() => inspectDemoPart("healthy_part.png")} className="py-2.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[9px] rounded-lg text-emerald-400 font-bold transition">
                    Healthy Part (PASS)
                  </button>
                  <button onClick={() => inspectDemoPart("surface_crack.png")} className="py-2.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-[9px] rounded-lg text-rose-400 font-bold transition">
                    Surface Crack (FAIL)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Big Image Viewport & Live feeds (40% / 4 Cols) */}
        <div className="lg:col-span-4 glass-card border border-brand-border rounded-2xl p-4 flex flex-col justify-between space-y-4">
          
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-cyan-400" />
              📷 Inspection View
            </h3>
            
            {/* Viewport switch toggle */}
            <div className="flex bg-brand-bg rounded-lg p-0.5 border border-brand-border">
              <button 
                onClick={() => { setIsLive(false); setInspectionResult(null); }}
                className={`px-3 py-1 rounded font-bold text-[9px] transition ${!isLive ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Static View
              </button>
              <button 
                onClick={() => { setIsLive(true); setConveyorHalted(false); setLivePartPos(0); }}
                className={`px-3 py-1 rounded font-bold text-[9px] transition ${isLive ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
              >
                Live 3D View
              </button>
            </div>
          </div>

          {/* Interactive Bounding box/Image canvas display */}
          <div className="border border-brand-border rounded-xl bg-[#030712] aspect-video overflow-hidden relative" style={{ perspective: "800px" }}>
            {/* Corner HUD Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
            
            {/* HUD headers */}
            <div className="absolute top-3 left-3 font-mono text-[8px] text-cyan-400/80 bg-[#0c1020]/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
              {isLive ? "LIVE_GANTRY_CAMERA" : "STATIC_CAPTURE"}
            </div>
            {isLive && (
              <div className="absolute top-3 right-3 font-mono text-[8px] text-emerald-400/80 bg-[#0c1020]/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
                {conveyorHalted ? "SCADA_HALT" : "CONVEYOR_30FPS"}
              </div>
            )}

            {/* Scale/Zoom styling overlay */}
            <div 
              className="absolute inset-0 transition-transform duration-200 ease-out" 
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {isLive ? (
                /* Live 3D conveyor track */
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

                    {/* Sliding part cylinder */}
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
                  {previewUrl && <img src={previewUrl} alt="Inspection capture" className="w-full h-full object-cover" />}
                  {previewUrl && <div className="animate-laser-scan" />}
                </div>
              )}
            </div>

            {/* Vertical red scanning laser */}
            <div className={`absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2 pointer-events-none z-15 transition-all duration-100 ${
              isLive && livePartPos >= 48 && livePartPos <= 52 
                ? "bg-emerald-400 shadow-[0_0_15px_#10b981]" 
                : "bg-rose-500 shadow-[0_0_8px_#f43f5e]"
            }`} />

            {/* Dotted target center crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 opacity-20 flex items-center justify-center">
              <div className="h-12 w-12 border border-dashed border-cyan-400 rounded-full animate-pulse" />
              <div className="absolute h-16 w-px bg-cyan-400" />
              <div className="absolute w-16 h-px bg-cyan-400" />
            </div>

            {/* Active tracking ring overlay for live conveyor parts */}
            {isLive && !conveyorHalted && livePartPos > 50 && livePartPos < 95 && (
              <div 
                className="absolute w-14 h-12 border-2 rounded pointer-events-none z-20 flex flex-col justify-between"
                style={{ 
                  top: "38%", 
                  left: `${livePartPos - 2}%`,
                  borderColor: liveStatus === "PASS" ? "#10b981" : "#f43f5e",
                  boxShadow: liveStatus === "PASS" ? "0 0 10px rgba(16, 185, 129, 0.4)" : "0 0 10px rgba(244, 63, 94, 0.4)"
                }}
              >
                <span className="text-[6px] text-white font-bold bg-[#0c1020]/95 px-1 py-0.5 rounded border tracking-tight whitespace-nowrap absolute -mt-5">
                  {liveStatus === "PASS" ? "OK // TEST_PASS" : `WARN // ${liveDefect}`}
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

          {/* Zoom controls & Inferences display footer */}
          <div className="flex justify-between items-center bg-brand-bg/50 p-2 rounded-xl border border-brand-border text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold uppercase text-[9px]">Gantry Camera Status:</span>
              {loading ? (
                <span className="text-cyan-400 font-bold flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Ingesting...
                </span>
              ) : inspectionResult ? (
                <span className={`font-extrabold tracking-wider ${
                  inspectionResult.status === "PASS" 
                    ? "text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse" 
                    : "text-rose-500 font-black"
                }`}>
                  {inspectionResult.status} ({Math.round(inspectionResult.confidence_score * 100)}%)
                </span>
              ) : (
                <span className="text-slate-500">IDLE</span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5">
              <button onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2.5))} className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition">
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 1))} className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition">
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => setZoomLevel(1)} className="p-1 bg-brand-card hover:bg-brand-border border border-brand-border text-slate-300 hover:text-white rounded transition">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 2x2 Stats Cards, Recent logs, Checklist, Golden Sample (30% / 3 Cols) */}
        <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
          
          {/* 2x2 Stats Cards Grid */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-2.5 bg-brand-card/45 border border-brand-border/60 rounded-xl relative overflow-hidden flex flex-col justify-center min-h-[64px]">
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Total Inspected</span>
              <p className="text-lg font-black text-white mt-0.5">{stats.total_inspected}</p>
              <span className="text-[7px] text-emerald-400 font-mono absolute bottom-1 right-2">↑ 5.2%</span>
            </div>
            
            <div className="p-2.5 bg-brand-card/45 border border-brand-border/60 rounded-xl relative overflow-hidden flex flex-col justify-center min-h-[64px]">
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Pass Rate</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.pass_rate}%</p>
              <span className="text-[7px] text-emerald-400 font-mono absolute bottom-1 right-2">↑ 1.2%</span>
            </div>

            <div className="p-2.5 bg-brand-card/45 border border-brand-border/60 rounded-xl relative overflow-hidden flex flex-col justify-center min-h-[64px]">
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Passed Yield</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">{stats.passed_count}</p>
            </div>

            <div className="p-2.5 bg-brand-card/45 border border-brand-border/60 rounded-xl relative overflow-hidden flex flex-col justify-center min-h-[64px]">
              <span className="text-[8px] text-slate-400 uppercase font-bold block">Fail Count</span>
              <p className="text-lg font-black text-rose-500 mt-0.5">{stats.failed_count}</p>
              <span className="text-[7px] text-rose-400 font-mono absolute bottom-1 right-2">↓ 3.8%</span>
            </div>
          </div>

          {/* Golden Sample comparative view */}
          <div className="p-3 bg-brand-card/30 border border-brand-border/60 rounded-xl space-y-1.5">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Golden Sample Comparison</span>
            <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
              <div className="p-1.5 bg-brand-bg/40 border border-emerald-500/40 rounded-lg flex flex-col items-center">
                <span className="text-[8px] text-emerald-400 font-bold mb-1 flex items-center gap-0.5"><Check className="h-2 w-2" /> GOLDEN</span>
                <div className="w-full h-12 rounded border border-brand-border/50 overflow-hidden relative">
                  <img src="/datasets/demo_images/machined_part_inspection.jpg" alt="Golden template reference" className="w-full h-full object-cover opacity-85" />
                </div>
              </div>

              <div className={`p-1.5 bg-brand-bg/40 border rounded-lg flex flex-col items-center transition ${
                inspectionResult?.status === "PASS" ? "border-emerald-500/40" : "border-rose-500/40"
              }`}>
                <span className={`text-[8px] font-bold mb-1 flex items-center gap-0.5 ${
                  inspectionResult?.status === "PASS" ? "text-emerald-400" : "text-rose-500"
                }`}>
                  {inspectionResult?.status === "PASS" ? <Check className="h-2 w-2" /> : <X className="h-2 w-2" />} CURRENT
                </span>
                <div className="w-full h-12 rounded border border-brand-border/50 overflow-hidden relative">
                  <img src="/datasets/demo_images/machined_part_inspection.jpg" alt="Active camera reference" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic check list */}
          <div className="p-3 bg-brand-card/30 border border-brand-border/60 rounded-xl space-y-1.5 flex-1 flex flex-col justify-center">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Diagnostics Checklist</span>
            <div className="space-y-1 text-[9px]">
              <div className="flex justify-between items-center bg-brand-bg/20 p-1.5 rounded border border-brand-border/30">
                <span className="text-slate-300">Surface Integrity Check</span>
                <span className={`font-bold flex items-center gap-0.5 ${
                  inspectionResult?.defect_type === "SURFACE_CRACK" ? "text-rose-500" : "text-emerald-400"
                }`}>
                  {inspectionResult?.defect_type === "SURFACE_CRACK" ? "❌ FAIL" : "✅ PASS"}
                </span>
              </div>
              
              <div className="flex justify-between items-center bg-brand-bg/20 p-1.5 rounded border border-brand-border/30">
                <span className="text-slate-300">Marking & Serial Label</span>
                <span className={`font-bold flex items-center gap-0.5 ${
                  inspectionResult?.defect_type === "LABEL_MISSING" ? "text-rose-500" : "text-emerald-400"
                }`}>
                  {inspectionResult?.defect_type === "LABEL_MISSING" ? "❌ FAIL" : "✅ PASS"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-brand-bg/20 p-1.5 rounded border border-brand-border/30">
                <span className="text-slate-300">Color Spectrum analysis</span>
                <span className={`font-bold flex items-center gap-0.5 ${
                  inspectionResult?.defect_type === "WRONG_COLOR" ? "text-rose-500" : "text-emerald-400"
                }`}>
                  {inspectionResult?.defect_type === "WRONG_COLOR" ? "❌ FAIL" : "✅ PASS"}
                </span>
              </div>

              <div className="flex justify-between items-center bg-brand-bg/20 p-1.5 rounded border border-brand-border/30">
                <span className="text-slate-300">Dimensional tolerances (XYZ)</span>
                <span className={`font-bold flex items-center gap-0.5 ${
                  inspectionResult?.defect_type === "WRONG_DIMENSION" ? "text-rose-500" : "text-emerald-400"
                }`}>
                  {inspectionResult?.defect_type === "WRONG_DIMENSION" ? "❌ FAIL" : "✅ PASS"}
                </span>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* BOTTOM PANEL: Live feed controller and speed indicators (Full-Width) */}
      {isLive ? (
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
      ) : (
        /* Static view details log footer */
        inspectionResult && (
          <div className="p-3.5 glass-card border border-brand-border rounded-2xl text-[10px] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300 font-medium">
                {inspectionResult.defect_type !== "NONE" 
                  ? `[DEFECT LOGGED]: ${inspectionResult.defect_type.replace("_", " ")} detected at caliper tolerances limits.` 
                  : "No surface anomalies or measurement deviations detected on this batch segment."}
              </span>
            </div>
            {inspectionResult.defect_type !== "NONE" && (
              <span className="font-bold text-rose-400 uppercase font-mono tracking-widest text-[9px]">
                [SCADA Halt Active: consecutive limit check online]
              </span>
            )}
          </div>
        )
      )}

      {/* Global tips and keyboard help bar */}
      <div className="flex items-center gap-2 p-2.5 bg-brand-bg/30 border border-brand-border/60 rounded-xl text-[10px] text-slate-400 justify-center">
        <Info className="h-3.5 w-3.5 text-cyan-400" />
        <span>💡 **Genba Operator Tip**: Press <kbd className="bg-brand-card px-1 py-0.5 border border-brand-border rounded text-white font-mono text-[9px]">SPACEBAR</kbd> to manually capture current frames, or click Reset PLC to override alarm halts.</span>
      </div>
      
    </div>
  );
}
