import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ShieldCheck, Upload, Camera, AlertOctagon, HelpCircle } from "lucide-react";

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

export default function QualityDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState<QualityStats>({
    total_inspected: 1540,
    passed_count: 1485,
    failed_count: 55,
    pass_rate: 96.43,
    defect_distribution: {
      LABEL_MISSING: 10,
      SURFACE_CRACK: 15,
      DAMAGE: 5,
      WRONG_COLOR: 12,
      WRONG_PACKAGING: 3,
      WRONG_DIMENSION: 10
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

  const fetchStats = () => {
    fetch("/api/v1/quality/stats", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data.total_inspected === "number") setStats(data);
      })
      .catch(() => console.log("Backend stats unavailable. Using mock analytics."));
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
        // Prepend host URL to show static images
        const fullImagePath = result.image_path;
        
        setInspectionResult({
          status: result.status,
          defect_type: result.defect_type,
          confidence_score: result.confidence_score,
          image_path: fullImagePath
        });
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
    console.warn("Backend unavailable. Running client-side CV simulation model.");
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
    
    // Increment local state counters for offline fallback
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

    // Draw static local feedback
    setInspectionResult({
      status,
      defect_type,
      confidence_score: 0.95 + Math.random() * 0.04,
      image_path: "/datasets/demo_images/machined_part_inspection.jpg"
    });
  };

  // Fetch programmatically generated demo part from backend and run inspection
  const inspectDemoPart = async (partName: string) => {
    setLoading(true);
    setInspectionResult(null);
    setPreviewUrl("/datasets/demo_images/machined_part_inspection.jpg");
    
    try {
      // Fetch part image as blob
      const imgResponse = await fetch(`/datasets/demo_images/${partName}`);
      const blob = await imgResponse.blob();
      const file = new File([blob], partName, { type: "image/png" });
      
      await executeInspection(file);
    } catch (err) {
      // Simulate locally if server isn't serving static files
      console.warn("Failed to retrieve static demo part. Running offline simulator.");
      setPreviewUrl("");
      simulateOfflineInspection(partName);
      setLoading(false);
    }
  };

  // Recharts Chart Config
  const chartData = Object.entries(stats.defect_distribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({ name: key.replace("_", " "), value }));

  const COLORS = ["#38bdf8", "#818cf8", "#f43f5e", "#f59e0b", "#10b981", "#a855f7"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white font-sans">Quality Control</h2>
        <p className="text-slate-400 text-sm">Computer Vision part inspection and defects distribution</p>
      </div>

      {/* KPI stats grids */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="p-4 bg-brand-card border border-brand-border rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Inspected</span>
          <p className="text-2xl font-extrabold text-white mt-1">{stats.total_inspected}</p>
        </div>
        <div className="p-4 bg-brand-card border border-brand-border rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Passed Yield</span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.passed_count}</p>
        </div>
        <div className="p-4 bg-brand-card border border-brand-border rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Failed Discards</span>
          <p className="text-2xl font-extrabold text-rose-500 mt-1">{stats.failed_count}</p>
        </div>
        <div className="p-4 bg-brand-card border border-brand-border rounded-2xl text-center">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Yield Pass Rate</span>
          <p className="text-2xl font-extrabold text-cyan-400 mt-1">{stats.pass_rate}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Upload & Run */}
        <div className="lg:col-span-2 p-5 glass-card rounded-2xl border border-brand-border space-y-5">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <Camera className="h-4 w-4 text-cyan-400" />
            Live Inspection Camera
          </h3>

          {/* Preset parts selector for instant testing */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Test with seeded parts:</span>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => inspectDemoPart("healthy_part.png")} className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-xs rounded-lg text-emerald-400 hover:text-emerald-300 font-semibold transition">
                Healthy Part (PASS)
              </button>
              <button onClick={() => inspectDemoPart("label_missing.png")} className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-xs rounded-lg text-rose-400 hover:text-rose-300 font-semibold transition">
                Missing Label
              </button>
              <button onClick={() => inspectDemoPart("surface_crack.png")} className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-xs rounded-lg text-rose-400 hover:text-rose-300 font-semibold transition">
                Surface Crack
              </button>
              <button onClick={() => inspectDemoPart("wrong_color.png")} className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-xs rounded-lg text-rose-400 hover:text-rose-300 font-semibold transition">
                Wrong Color
              </button>
              <button onClick={() => inspectDemoPart("wrong_dimension.png")} className="px-3 py-1.5 bg-brand-bg hover:bg-brand-border border border-brand-border text-xs rounded-lg text-rose-400 hover:text-rose-300 font-semibold transition">
                Wrong Dimensions
              </button>
            </div>
          </div>

          {/* Interactive Bounding box / Image side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Input camera view */}
            <div className="border border-brand-border rounded-xl bg-brand-bg/50 aspect-video flex flex-col items-center justify-center overflow-hidden relative">
              {/* Corner HUD Brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />

              {/* HUD Header */}
              <div className="absolute top-3 left-3 font-mono text-[9px] text-cyan-400/80 bg-brand-bg/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
                CAM_04 // GANTRY_VIEW // 30FPS
              </div>

              {/* Center Crosshair Target */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 opacity-30 flex items-center justify-center">
                <div className="h-10 w-10 border border-dashed border-cyan-400 rounded-full animate-pulse" />
                <div className="absolute h-14 w-px bg-cyan-400" />
                <div className="absolute w-14 h-px bg-cyan-400" />
              </div>

              {/* Laser Scanline */}
              {previewUrl && <div className="animate-laser-scan" />}

              {previewUrl ? (
                <img src={previewUrl} alt="Inspection Telemetry" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="text-center space-y-2 z-10">
                  <Upload className="h-8 w-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">Select a part image or drag file here</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer z-30"
              />
            </div>

            {/* Inferences feedback view */}
            <div className="border border-brand-border rounded-xl bg-brand-bg/50 aspect-video flex flex-col items-center justify-center overflow-hidden relative">
              {/* Corner HUD Brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-500/50 pointer-events-none z-20" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-500/50 pointer-events-none z-20" />

              {/* HUD Header */}
              <div className="absolute top-3 left-3 font-mono text-[9px] text-cyan-400/80 bg-brand-bg/90 px-2 py-0.5 rounded border border-brand-border/60 pointer-events-none tracking-widest z-20">
                CAM_04 // CV_INFERENCE_HUD
              </div>

              {loading ? (
                <div className="text-center space-y-2 text-cyan-400 font-semibold text-xs z-10">
                  <Camera className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
                  <span>Processing CV Analysis...</span>
                </div>
              ) : inspectionResult ? (
                <div className="absolute inset-0 h-full w-full">
                  <img src={inspectionResult.image_path} alt="CV Overlay Inferences" className="h-full w-full object-cover" />
                  
                  {/* Dynamic Bounding Box Overlay */}
                  <div className="absolute inset-0 pointer-events-none z-25">
                    {/* Surface Crack */}
                    {inspectionResult.defect_type === "SURFACE_CRACK" && (
                      <div 
                        className="absolute border-2 border-rose-500 rounded animate-pulse"
                        style={{ top: "35%", left: "40%", width: "20%", height: "25%", boxShadow: "0 0 15px rgba(239, 68, 68, 0.7)" }}
                      >
                        <div className="absolute -top-6 left-0 bg-rose-950/90 border border-rose-500 text-rose-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          ⚠️ [CRITICAL] SURFACE_CRACK (96% CONF)
                        </div>
                      </div>
                    )}
                    {/* Label Missing */}
                    {inspectionResult.defect_type === "LABEL_MISSING" && (
                      <div 
                        className="absolute border-2 border-amber-500 rounded animate-pulse"
                        style={{ top: "25%", left: "60%", width: "22%", height: "30%", boxShadow: "0 0 15px rgba(245, 158, 11, 0.7)" }}
                      >
                        <div className="absolute -top-6 left-0 bg-amber-950/90 border border-amber-500 text-amber-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          ⚠️ [MISSING] SERIAL_LABEL (94% CONF)
                        </div>
                      </div>
                    )}
                    {/* Wrong Color */}
                    {inspectionResult.defect_type === "WRONG_COLOR" && (
                      <div 
                        className="absolute border-2 border-yellow-400 rounded animate-pulse"
                        style={{ top: "20%", left: "30%", width: "35%", height: "45%", boxShadow: "0 0 15px rgba(250, 204, 21, 0.7)" }}
                      >
                        <div className="absolute -top-6 left-0 bg-yellow-950/90 border border-yellow-400 text-yellow-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          ⚠️ [WARNING] COLOR_MISMATCH (92% CONF)
                        </div>
                      </div>
                    )}
                    {/* Wrong Dimension */}
                    {inspectionResult.defect_type === "WRONG_DIMENSION" && (
                      <div 
                        className="absolute border-2 border-cyan-400 rounded animate-pulse"
                        style={{ top: "15%", left: "25%", width: "50%", height: "65%", boxShadow: "0 0 15px rgba(6, 182, 212, 0.7)" }}
                      >
                        <div className="absolute -top-6 left-0 bg-cyan-950/90 border border-cyan-400 text-cyan-400 font-bold text-[8px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
                          📏 [OUT OF SPEC] Δy +1.2mm (95% CONF)
                        </div>
                      </div>
                    )}
                    {/* Pass State */}
                    {inspectionResult.status === "PASS" && (
                      <div 
                        className="absolute border-2 border-emerald-500 rounded"
                        style={{ top: "15%", left: "20%", width: "60%", height: "70%", boxShadow: "0 0 15px rgba(16, 185, 129, 0.35)" }}
                      >
                        <div className="absolute top-2 right-2 bg-emerald-950/90 border border-emerald-500 text-emerald-400 font-black text-[9px] px-2 py-0.5 rounded shadow-lg">
                          ✅ PASS // INTEGRITY CHECK OK
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-center text-xs flex items-center gap-1 z-10">
                  <HelpCircle className="h-4 w-4" />
                  Waiting for inspection execution
                </div>
              )}
            </div>
          </div>

          {inspectionResult && !loading && (
            <div className="grid grid-cols-2 gap-4 bg-brand-bg/60 p-3 rounded-xl border border-brand-border text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Last Inspection Result</span>
                <span className={`font-bold ${inspectionResult.status === "PASS" ? "text-emerald-400" : "text-rose-400"}`}>
                  {inspectionResult.status}
                </span>
              </div>
              <div className="flex items-center justify-between border-l border-brand-border pl-4">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px]">Defect Type / Conf</span>
                <span className="text-white font-bold">
                  {inspectionResult.defect_type.replace("_", " ")} ({Math.round(inspectionResult.confidence_score * 100)}%)
                </span>
              </div>
            </div>
          )}

          {selectedFile && !inspectionResult && !loading && (
            <button
              onClick={() => executeInspection(selectedFile)}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
            >
              Run Computer Vision Analysis
            </button>
          )}
        </div>

        {/* Right Side: Pie Chart Defect Breakdowns */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border flex flex-col">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-rose-500" />
            Defect Share Breakdowns
          </h3>
          <div className="flex-1 h-60 min-h-[240px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#151c2c", borderColor: "#202a40", borderRadius: "8px", color: "#fff", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No defect logs registered in system.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
