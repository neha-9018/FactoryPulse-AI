import React, { useState } from "react";
import { useAuth } from "../App";
import { FileText, Download, BarChart2, ShieldAlert, CheckCircle, Database } from "lucide-react";

export default function ReportsDashboard() {
  const { token, user } = useAuth();
  const [downloading, setDownloading] = useState<string | null>(null);

  // Client-side CSV compiler for high reliability & offline viva presentation safety
  const triggerCSVDownload = async (reportType: string) => {
    setDownloading(reportType);
    
    // Simulate a brief generation delay for premium UX
    await new Promise(resolve => setTimeout(resolve, 800));

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = "";

    if (reportType === "oee") {
      filename = "daily_oee_report.csv";
      headers = ["Date", "Machine Name", "Availability(%)", "Performance(%)", "Quality(%)", "Overall OEE(%)"];
      rows = [
        ["2026-07-17", "CNC Milling Machine Alpha", "92.4", "96.2", "98.5", "87.7"],
        ["2026-07-17", "Industrial Robot Arm Beta", "98.1", "95.0", "99.0", "92.2"],
        ["2026-07-17", "Injection Molding Gamma", "94.5", "91.8", "98.2", "85.2"],
        ["2026-07-17", "Hydraulic Press Delta", "60.0", "85.0", "94.3", "48.1"],
        ["2026-07-17", "Packaging Conveyor Epsilon", "99.2", "98.0", "99.5", "96.7"]
      ];
    } else if (reportType === "downtime") {
      filename = "monthly_downtime_report.csv";
      headers = ["Month", "Machine Name", "Operational Hours", "Scheduled Hours", "Downtime Hours", "MTTR (Hours)"];
      rows = [
        ["2026-07", "CNC Milling Machine Alpha", "680", "720", "40", "2.1"],
        ["2026-07", "Industrial Robot Arm Beta", "712", "720", "8", "0.8"],
        ["2026-07", "Injection Molding Gamma", "698", "720", "22", "1.5"],
        ["2026-07", "Hydraulic Press Delta", "540", "720", "180", "5.4"],
        ["2026-07", "Packaging Conveyor Epsilon", "718", "720", "2", "0.4"]
      ];
    } else if (reportType === "health") {
      filename = "machine_health_summary.csv";
      headers = ["Timestamp", "Machine Name", "Vibration(mm/s)", "Temperature(C)", "Current(A)", "Calculated Health Score(%)", "Status"];
      rows = [
        ["2026-07-17 12:00:00", "CNC Milling Machine Alpha", "1.2", "42.5", "8.2", "91.0", "HEALTHY"],
        ["2026-07-17 12:00:00", "Industrial Robot Arm Beta", "0.8", "38.1", "6.5", "94.0", "HEALTHY"],
        ["2026-07-17 12:00:00", "Injection Molding Gamma", "1.9", "78.4", "12.4", "88.0", "HEALTHY"],
        ["2026-07-17 12:00:00", "Hydraulic Press Delta", "5.2", "89.0", "16.8", "48.0", "FAILING"],
        ["2026-07-17 12:00:00", "Packaging Conveyor Epsilon", "0.5", "35.2", "4.1", "96.0", "HEALTHY"]
      ];
    } else {
      filename = "quality_defect_summary.csv";
      headers = ["Defect Category", "Detected Counts", "Severity Level", "Corrective Action Required"];
      rows = [
        ["LABEL_MISSING", "10", "LOW", "Calibrate camera labeling position sensors."],
        ["SURFACE_CRACK", "15", "CRITICAL", "Inspect pressure mold clamps for misalignment."],
        ["DAMAGE", "5", "HIGH", "Halt ejector pins for physical wear assessment."],
        ["WRONG_COLOR", "12", "LOW", "Reset color matching parameter logic in YOLOv8 model."],
        ["WRONG_PACKAGING", "3", "MEDIUM", "Adjust box sorting diverter timing parameters."],
        ["WRONG_DIMENSION", "10", "HIGH", "Calibrate CNC spindle calibration axes alignment."]
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloading(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white font-sans">Corporate Reports & Exports</h2>
        <p className="text-slate-400 text-sm">Download aggregated factory metrics and historical tables in CSV format for corporate BI auditing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Report Card 1: Daily OEE */}
        {(!user || user.role !== "ENGINEER") && (
          <div className="p-5 glass-card rounded-2xl border border-brand-border flex gap-4 items-start">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 flex-shrink-0">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <h3 className="font-bold text-white text-sm">Daily OEE Report</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Aggregated daily performance summary showing Availability, Performance, Quality, and overall OEE metrics for all active shop floor machinery.
              </p>
              <button
                onClick={() => triggerCSVDownload("oee")}
                disabled={downloading !== null}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600/25 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading === "oee" ? "Compiling..." : "Export OEE Report (CSV)"}
              </button>
            </div>
          </div>
        )}

        {/* Report Card 2: Monthly Downtime */}
        {(!user || user.role !== "ENGINEER") && (
          <div className="p-5 glass-card rounded-2xl border border-brand-border flex gap-4 items-start">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 flex-shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <h3 className="font-bold text-white text-sm">Monthly Downtime Report</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Detailed tracking of operational hours, planned shutdown slots, unexpected failures, and Mean Time to Repair (MTTR) analytics.
              </p>
              <button
                onClick={() => triggerCSVDownload("downtime")}
                disabled={downloading !== null}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/25 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading === "downtime" ? "Compiling..." : "Export Downtime Report (CSV)"}
              </button>
            </div>
          </div>
        )}

        {/* Report Card 3: Machine Health */}
        <div className="p-5 glass-card rounded-2xl border border-brand-border flex gap-4 items-start">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 flex-shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 space-y-2 text-left">
            <h3 className="font-bold text-white text-sm">Machine Health Report</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Historical trends of temperature, vibration levels, current consumption, and model-derived health score projections.
            </p>
            <button
              onClick={() => triggerCSVDownload("health")}
              disabled={downloading !== null}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/25 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-xs font-semibold transition"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading === "health" ? "Compiling..." : "Export Health Summary (CSV)"}
            </button>
          </div>
        </div>

        {/* Report Card 4: Defect Summary */}
        {(!user || user.role !== "ENGINEER") && (
          <div className="p-5 glass-card rounded-2xl border border-brand-border flex gap-4 items-start">
            <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 flex-shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <h3 className="font-bold text-white text-sm">Defect Summary Log</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Computer Vision inspection audit logs detailing counts for each specific defect classification (missing labels, cracks, damages).
              </p>
              <button
                onClick={() => triggerCSVDownload("defect")}
                disabled={downloading !== null}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-600/25 hover:bg-rose-500/30 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-xs font-semibold transition"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading === "defect" ? "Compiling..." : "Export Defect Log (CSV)"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-brand-card border border-brand-border rounded-xl flex items-center gap-3 text-xs">
        <Database className="h-5 w-5 text-cyan-400 flex-shrink-0" />
        <span className="text-slate-300">
          <strong>Corporate Data Access:</strong> CSV outputs are formatted for instant drag-and-drop ingestion into business reporting packages like **Microsoft Power BI**, **Tableau**, or **Microsoft Excel**.
        </span>
      </div>
    </div>
  );
}

// Simple clock icon definition support
function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
