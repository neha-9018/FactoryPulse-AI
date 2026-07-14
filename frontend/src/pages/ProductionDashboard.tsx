import React, { useEffect, useState } from "react";
import { useAuth } from "../App";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Hammer, TrendingUp, HelpCircle } from "lucide-react";

interface DailyData {
  date: string;
  yield: number;
  defects: number;
  defect_rate: number;
}

interface ShiftData {
  shift: string;
  yield: number;
  defects: number;
  oee: number;
}

export default function ProductionDashboard() {
  const { token } = useAuth();
  const [dailyData, setDailyData] = useState<DailyData[]>([
    { date: "2026-07-08", yield: 15400, defects: 120, defect_rate: 0.78 },
    { date: "2026-07-09", yield: 16100, defects: 140, defect_rate: 0.87 },
    { date: "2026-07-10", yield: 15800, defects: 150, defect_rate: 0.95 },
    { date: "2026-07-11", yield: 14200, defects: 180, defect_rate: 1.27 },
    { date: "2026-07-12", yield: 13900, defects: 250, defect_rate: 1.80 },
    { date: "2026-07-13", yield: 16500, defects: 210, defect_rate: 1.27 },
    { date: "2026-07-14", yield: 17100, defects: 110, defect_rate: 0.64 }
  ]);
  const [shiftData, setShiftData] = useState<ShiftData[]>([
    { shift: "MORNING", yield: 62000, defects: 350, oee: 88.5 },
    { shift: "AFTERNOON", yield: 58000, defects: 480, oee: 84.2 },
    { shift: "NIGHT", yield: 41000, defects: 620, oee: 79.8 }
  ]);

  useEffect(() => {
    // 1. Fetch daily analytics for charts
    fetch("/api/v1/dashboard/production-charts", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setDailyData(data);
      })
      .catch(err => console.log("Failed to load production charts. Using simulated data."));

    // 2. Fetch shift statistics
    fetch("/api/v1/dashboard/shifts", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) setShiftData(data);
      })
      .catch(err => console.log("Failed to load shift aggregates. Using simulated data."));
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white font-sans">Production Analytics</h2>
        <p className="text-slate-400 text-sm">Monitor plant throughput, yield quality, and shifts OEE metrics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yield vs Defect Bar Chart */}
        <div className="lg:col-span-2 p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Hammer className="h-4 w-4 text-cyan-400" />
              Daily Throughput & Defects
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#202a40" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#151c2c", borderColor: "#202a40", borderRadius: "12px", color: "#fff" }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                <Bar dataKey="yield" name="Good Parts (Yield)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                <Bar dataKey="defects" name="Rejected Parts (Defects)" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Defect Rate Line Chart */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Defect Trend Ratio (%)
            </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#202a40" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#151c2c", borderColor: "#202a40", borderRadius: "12px", color: "#fff" }}
                />
                <Line type="monotone" dataKey="defect_rate" name="Defect Rate %" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: "#f59e0b" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Shift Comparisons */}
      <div className="p-5 glass-card rounded-2xl border border-brand-border">
        <h3 className="font-bold text-white text-sm uppercase tracking-wider mb-6">Weekly Shift yield performance comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {shiftData.map(s => (
            <div key={s.shift} className="p-4 bg-brand-bg/50 border border-brand-border rounded-xl">
              <div className="flex justify-between mb-3 border-b border-brand-border pb-2">
                <span className="font-bold text-slate-300 text-xs font-mono">{s.shift} SHIFT</span>
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-500/25">
                  OEE: {s.oee}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Yield</span>
                  <p className="text-xl font-bold text-white">{s.yield.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Defects</span>
                  <p className="text-xl font-bold text-rose-400">{s.defects.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
