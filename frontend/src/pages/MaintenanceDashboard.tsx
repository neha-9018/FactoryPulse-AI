import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { Wrench, ShieldCheck, AlertTriangle, User, Calendar, Clock, PlayCircle } from "lucide-react";

interface HealthMetric {
  id: number;
  machine: string;
  health: number;
  status: string;
  predicted_failure: string;
  recommendation: string;
}

export default function MaintenanceDashboard() {
  const { token, user } = useAuth();
  const [selectedMachineId, setSelectedMachineId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [healthScores, setHealthScores] = useState<HealthMetric[]>([
    { id: 1, machine: "CNC Milling Machine Alpha", health: 91, status: "HEALTHY", predicted_failure: "No failure predicted", recommendation: "Proceed with standard preventive maintenance in 14 days." },
    { id: 2, machine: "Industrial Robot Arm Beta", health: 94, status: "HEALTHY", predicted_failure: "No failure predicted", recommendation: "Apply joint lubrication at next scheduled downtime." },
    { id: 3, machine: "Injection Molding Gamma", health: 88, status: "HEALTHY", predicted_failure: "No failure predicted", recommendation: "Monitor heater band temperature fluctuations closely." },
    { id: 4, machine: "Hydraulic Press Delta", health: 48, status: "WARNING", predicted_failure: "Failure likely within 4 days (Pressure anomaly)", recommendation: "Schedule emergency hydraulic valve inspection and seal replacement." },
    { id: 5, machine: "Packaging Conveyor Epsilon", health: 96, status: "HEALTHY", predicted_failure: "No failure predicted", recommendation: "No immediate action required." }
  ]);

  const [logs] = useState([
    { id: 1, machine: "CNC Milling Machine Alpha", type: "PREVENTIVE", tech: "Kenji Sato", date: "2026-07-05", duration: 3.5, cost: 420 },
    { id: 2, machine: "Hydraulic Press Delta", type: "CORRECTIVE", tech: "Hiroshi Tanaka", date: "2026-06-28", duration: 6.0, cost: 1150 },
    { id: 3, machine: "Industrial Robot Arm Beta", type: "PREVENTIVE", tech: "Yuki Watanabe", date: "2026-06-20", duration: 2.0, cost: 280 }
  ]);

  const fetchHealthScores = () => {
    // Attempt to pull latest inferences from API
    fetch(`/api/v1/predictions/health-history/${selectedMachineId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const latest = data[data.length - 1];
          const score = Math.round(latest.health_score);
          const status = score > 85 ? "HEALTHY" : score > 60 ? "WARNING" : "FAILING";
          const predText = score > 85 ? "No failure predicted" : `Failure probable (Prob: ${Math.round(latest.failure_probability * 100)}%)`;
          
          setHealthScores(prev => prev.map(h => 
            h.id === selectedMachineId 
              ? { ...h, health: score, status, predicted_failure: predText, recommendation: latest.recommendation || h.recommendation }
              : h
          ));
        }
      })
      .catch(() => console.log("Failed to load backend inferences. Using client mock simulator values."));
  };

  useEffect(() => {
    fetchHealthScores();
  }, [selectedMachineId, token]);

  const triggerDiagnostic = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/v1/predictions/predict/${selectedMachineId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchHealthScores();
      } else {
        // Mock fallback simulation
        console.warn("Backend unavailable. Simulating dynamic ML prediction locally.");
        const currentScore = healthScores.find(h => h.id === selectedMachineId)?.health || 90;
        const newScore = Math.max(30, Math.min(100, currentScore + Math.floor(Math.random() * 10) - 5));
        const status = newScore > 85 ? "HEALTHY" : newScore > 60 ? "WARNING" : "FAILING";
        const predText = newScore > 85 ? "No failure predicted" : "Minor wear anomalies flagged";
        
        setHealthScores(prev => prev.map(h => 
          h.id === selectedMachineId 
            ? { ...h, health: newScore, status, predicted_failure: predText }
            : h
        ));
      }
    } catch (err) {
      // Mock fallback simulation
      console.warn("Backend unavailable. Simulating dynamic ML prediction locally.");
      const currentScore = healthScores.find(h => h.id === selectedMachineId)?.health || 90;
      const newScore = Math.max(30, Math.min(100, currentScore + Math.floor(Math.random() * 10) - 5));
      const status = newScore > 85 ? "HEALTHY" : newScore > 60 ? "WARNING" : "FAILING";
      const predText = newScore > 85 ? "No failure predicted" : "Minor wear anomalies flagged";
      
      setHealthScores(prev => prev.map(h => 
        h.id === selectedMachineId 
          ? { ...h, health: newScore, status, predicted_failure: predText }
          : h
      ));
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return "text-emerald-400";
    if (score >= 70) return "text-amber-400";
    return "text-rose-500";
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10";
    if (score >= 70) return "bg-amber-500/10";
    return "bg-rose-500/10";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white font-sans">Maintenance AI</h2>
          <p className="text-slate-400 text-sm">AI predictive health scores, time-to-failure forecasting, and work orders</p>
        </div>

        {/* Dynamic Model Trigger */}
        {user && ["ADMIN", "ENGINEER"].includes(user.role) && (
          <div className="flex items-center gap-3">
            <select
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(Number(e.target.value))}
              className="rounded-lg bg-brand-card border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value={1}>CNC Milling Alpha</option>
              <option value={2}>Robot Arm Beta</option>
              <option value={3}>Injection Molding Gamma</option>
              <option value={4}>Hydraulic Press Delta</option>
              <option value={5}>Conveyor Epsilon</option>
            </select>
            <button
              onClick={triggerDiagnostic}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <PlayCircle className="h-4 w-4" />
              {loading ? "Analyzing..." : "Run ML Diagnostic"}
            </button>
          </div>
        )}
      </div>

      {/* Machinery Health Indicator Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {healthScores.map((h) => (
          <div key={h.id} className="p-5 glass-card rounded-2xl border border-brand-border flex gap-5">
            <div className={`h-20 w-20 flex-shrink-0 rounded-full flex flex-col items-center justify-center border border-brand-border ${getHealthBg(h.health)}`}>
              <span className={`text-2xl font-bold leading-none ${getHealthColor(h.health)}`}>{h.health}%</span>
              <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Health</span>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-white leading-tight">{h.machine}</h4>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                  h.status === "HEALTHY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}>
                  {h.status}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                <span className="font-semibold text-slate-300">Failure Prediction:</span> {h.predicted_failure}
              </div>
              <div className="text-xs p-3 bg-brand-bg/50 border border-brand-border rounded-xl text-slate-300 flex items-start gap-2 leading-relaxed">
                {h.health < 60 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                )}
                <span>{h.recommendation}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance History Table */}
      <div className="p-5 glass-card rounded-2xl border border-brand-border">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Wrench className="h-4 w-4 text-cyan-400" />
          Recent Work Order logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-3 px-4">Machine</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Technician</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4 text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-slate-300">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-brand-border/10 transition">
                  <td className="py-3 px-4 font-semibold text-white">{log.machine}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                      log.type === "PREVENTIVE" ? "bg-cyan-500/10 text-cyan-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-slate-500" /> {log.tech}</td>
                  <td className="py-3 px-4"><span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-500" /> {log.date}</span></td>
                  <td className="py-3 px-4"><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> {log.duration} hrs</span></td>
                  <td className="py-3 px-4 text-right font-semibold text-white">${log.cost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
