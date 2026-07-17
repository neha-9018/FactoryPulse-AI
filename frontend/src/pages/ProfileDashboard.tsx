import React, { useState, useRef } from "react";
import { useAuth } from "../App";
import { User, ShieldCheck, Mail, Calendar, Key, CheckCircle, AlertTriangle } from "lucide-react";

export default function ProfileDashboard() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileImage, setProfileImage] = useState<string | null>(() => {
    const saved = localStorage.getItem("user");
    if (saved) {
      return JSON.parse(saved).profileImage || null;
    }
    return null;
  });
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setProfileImage(base64);
      
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.profileImage = base64;
        localStorage.setItem("user", JSON.stringify(parsed));
        
        // Dispatch local event so sidebar updates instantly
        window.dispatchEvent(new Event("storage"));
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMsg({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    setStatusMsg({ type: "success", text: "Password updated successfully in local session!" });
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  // Read details from current user session (set at registration)
  const details = {
    empId: user?.empId || "EMP-9081",
    shift: user?.shiftZone || "Day Shift (Bay A & B)",
    clearance: user?.clearanceLevel || "Level 3 (Asset Diagnostics)"
  };

  // Mock logs
  const activityLogs = [
    { id: 1, action: "User Session Authenticated", timestamp: "Today, 11:22 AM", ip: "127.0.0.1" },
    { id: 2, action: "Triggered Quality Inspection (CV Surface Crack)", timestamp: "Today, 10:14 AM", ip: "127.0.0.1" },
    { id: 3, action: "Updated Spindle Speed Telemetry threshold", timestamp: "Yesterday, 04:30 PM", ip: "127.0.0.1" }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-white font-sans">User Account Profile</h2>
        <p className="text-slate-400 text-sm">Manage your personal credentials, credentials role, and shop floor security</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: User Profile Badge Card */}
        <div className="md:col-span-1 p-6 glass-card rounded-2xl border border-brand-border text-center flex flex-col items-center justify-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="h-24 w-24 rounded-full bg-cyan-900/40 border-2 border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-3xl mb-1 cursor-pointer overflow-hidden group relative hover:border-cyan-400 transition"
            title="Click to upload profile photo"
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              user?.username?.charAt(0).toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold transition">
              Upload
            </div>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold mb-4 hover:underline transition"
          >
            Change Photo
          </button>
          <h3 className="text-lg font-bold text-white leading-tight mb-1">{user?.username}</h3>
          <div className="inline-flex items-center gap-1 text-[10px] bg-cyan-500/10 text-cyan-400 font-semibold px-2 py-0.5 rounded border border-cyan-500/20 uppercase mb-4">
            <ShieldCheck className="h-3 w-3" />
            {user?.role}
          </div>

          <div className="w-full text-left space-y-3 pt-4 border-t border-brand-border/40 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Employee ID:</span>
              <span className="text-slate-200 font-semibold font-mono">{details.empId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shift Zone:</span>
              <span className="text-slate-200 font-semibold">{details.shift}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Clearance:</span>
              <span className="text-slate-200 font-semibold">{details.clearance}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Account & Security settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: Detailed credentials */}
          <div className="p-6 glass-card rounded-2xl border border-brand-border space-y-4">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-cyan-400" />
              Credentials Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Full Username</label>
                <div className="p-3 bg-brand-bg/50 border border-brand-border rounded-xl text-slate-200 font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  {user?.username}
                </div>
              </div>
              <div>
                <label className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Corporate Email</label>
                <div className="p-3 bg-brand-bg/50 border border-brand-border rounded-xl text-slate-200 font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  {user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Change Password form */}
          <div className="p-6 glass-card rounded-2xl border border-brand-border">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Key className="h-4 w-4 text-cyan-400" />
              Security Settings
            </h4>

            {statusMsg && (
              <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 mb-4 ${
                statusMsg.type === "success" 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {statusMsg.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full rounded-xl bg-brand-bg border border-brand-border px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium uppercase tracking-wider block mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl bg-brand-bg border border-brand-border px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-medium uppercase tracking-wider block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl bg-brand-bg border border-brand-border px-3 py-2.5 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold transition"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Section 3: Recent Activity Logs */}
      <div className="p-6 glass-card rounded-2xl border border-brand-border">
        <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          Recent Session Logs
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border text-slate-400 uppercase font-semibold tracking-wider">
                <th className="py-2.5 px-3">Operation / Event</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3 text-right">Access IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 text-slate-300">
              {activityLogs.map(log => (
                <tr key={log.id} className="hover:bg-brand-border/10 transition">
                  <td className="py-3 px-3 font-semibold text-white">{log.action}</td>
                  <td className="py-3 px-3">{log.timestamp}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-400">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
