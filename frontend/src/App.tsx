import React, { useState, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import ProductionDashboard from "./pages/ProductionDashboard";
import MaintenanceDashboard from "./pages/MaintenanceDashboard";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import QualityDashboard from "./pages/QualityDashboard";
import AssistantDashboard from "./pages/AssistantDashboard";
import ProfileDashboard from "./pages/ProfileDashboard";
import ReportsDashboard from "./pages/ReportsDashboard";
import { ShieldAlert, Cpu } from "lucide-react";

// Auth Context
interface User {
  username: string;
  role: string;
  email: string;
  empId?: string;
  shiftZone?: string;
  clearanceLevel?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, role: string, token: string, extraData?: Partial<User>) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  const login = (username: string, role: string, userToken: string, extraData?: Partial<User>) => {
    const userData = { 
      username, 
      role, 
      email: extraData?.email || `${username.toLowerCase()}@meidensha.com`,
      empId: extraData?.empId || "EMP-9081",
      shiftZone: extraData?.shiftZone || "Day Shift (Bay A & B)",
      clearanceLevel: extraData?.clearanceLevel || "Level 3 (Asset Diagnostics)"
    };
    setUser(userData);
    setToken(userToken);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  // Protected Route Wrapper
  const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
    if (!token) return <Navigate to="/login" replace />;
    if (roles && user && !roles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
    return <>{children}</>;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginView />} />

          {/* Protected Main Layout routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER"]}><ExecutiveDashboard /></ProtectedRoute>} />
            <Route path="production" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"]}><ProductionDashboard /></ProtectedRoute>} />
            <Route path="maintenance" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"]}><MaintenanceDashboard /></ProtectedRoute>} />
            <Route path="analytics" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"]}><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="quality" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"]}><QualityDashboard /></ProtectedRoute>} />
            <Route path="assistant" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER", "OPERATOR"]}><AssistantDashboard /></ProtectedRoute>} />
            <Route path="profile" element={<ProfileDashboard />} />
            <Route path="reports" element={<ProtectedRoute roles={["ADMIN", "MANAGER", "ENGINEER"]}><ReportsDashboard /></ProtectedRoute>} />
          </Route>

          <Route path="/unauthorized" element={<UnauthorizedView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

// 1. Simple Login Page
function LoginView() {
  const { token, user, login } = useAuth();
  if (token && user) {
    const targetPath = ["ADMIN", "MANAGER"].includes(user.role) ? "/" : "/maintenance";
    return <Navigate to={targetPath} replace />;
  }
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ENGINEER");
  
  // Custom Registration Fields
  const [empId, setEmpId] = useState("");
  const [shiftZone, setShiftZone] = useState("Day Shift (Bay A & B)");
  const [clearanceLevel, setClearanceLevel] = useState("Level 3 (Asset Diagnostics)");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister) {
      // 1. STRICTOR VALIDATION RULES
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        setError("Username must be 3-20 characters, containing only letters, numbers, or underscores (no spaces or email symbols).");
        setLoading(false);
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError("Please enter a valid corporate email address (e.g., name@meidensha.com).");
        setLoading(false);
        return;
      }

      const empIdRegex = /^EMP-\d{4}$/;
      if (!empIdRegex.test(empId)) {
        setError("Employee ID must follow the standard format EMP-XXXX (e.g., EMP-2342).");
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
      }

      // 2. REGISTRATION FLOW
      try {
        const regResponse = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username, 
            email: email || `${username}@meidensha.com`, 
            password, 
            role,
            emp_id: empId,
            shift_zone: shiftZone,
            clearance_level: clearanceLevel
          })
        });

        if (regResponse.ok) {
          // Immediately log in after successful registration
          const loginResponse = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ username, password })
          });

          if (loginResponse.ok) {
            const data = await loginResponse.json();
            login(data.user.username, data.user.role, data.access_token, { 
              email: data.user.email, 
              empId: data.user.emp_id, 
              shiftZone: data.user.shift_zone, 
              clearanceLevel: data.user.clearance_level 
            });
            return;
          }
        } else {
          const errData = await regResponse.json();
          setError(errData.detail || "Registration failed. Try a different username/email.");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Offline registration. Simulating account creation.");
      }
      
      // Fallback/Simulated register login
      login(username, role, "mock-offline-token-12345", { email, empId, shiftZone, clearanceLevel });
      setLoading(false);
    } else {
      // 2. SIGN IN FLOW
      try {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username, password })
        });

        if (response.ok) {
          const data = await response.json();
          login(data.user.username, data.user.role, data.access_token, { 
            email: data.user.email, 
            empId: data.user.emp_id, 
            shiftZone: data.user.shift_zone, 
            clearanceLevel: data.user.clearance_level 
          });
        } else {
          setError("Incorrect username or password. Please check your credentials and try again.");
        }
      } catch (err) {
        console.warn("Backend offline. Logging in with offline mock settings.");
        const mockRole = username.toLowerCase().includes("admin") 
          ? "ADMIN" 
          : username.toLowerCase().includes("operator") 
            ? "OPERATOR" 
            : "ENGINEER";
        login(username, mockRole, "mock-offline-token-12345");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 glass-panel p-8 rounded-2xl shadow-glow">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400">
            <Cpu className="h-8 w-8 animate-pulse" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white font-sans">
            {isRegister ? "Create Account" : "Smart Factory Portal"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            AI Manufacturing Data Platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                placeholder="Enter username"
              />
            </div>

            {isRegister && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                    placeholder="name@meidensha.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Assigned Shift Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="ENGINEER">ENGINEER</option>
                    <option value="OPERATOR">OPERATOR</option>
                    <option value="MANAGER">MANAGER</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                    placeholder="EMP-2342"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Shift Zone Zone</label>
                  <select
                    value={shiftZone}
                    onChange={(e) => setShiftZone(e.target.value)}
                    className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                  >
                    <option value="Day Shift (Bay A & B)">Day Shift (Bay A & B)</option>
                    <option value="Night Shift (Bay C & D)">Night Shift (Bay C & D)</option>
                    <option value="Morning Shift (Bay E)">Morning Shift (Bay E)</option>
                    <option value="All-Shift Authority">All-Shift Authority</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clearance Level</label>
                  <select
                    value={clearanceLevel}
                    onChange={(e) => setClearanceLevel(e.target.value)}
                    className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                  >
                    <option value="Level 4 (System Owner)">Level 4 (System Owner)</option>
                    <option value="Level 3 (Asset Diagnostics)">Level 3 (Asset Diagnostics)</option>
                    <option value="Level 2 (General Clearance)">Level 2 (General Clearance)</option>
                    <option value="Level 1 (Shop Floor Viewer)">Level 1 (Shop Floor Viewer)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-lg bg-brand-bg border border-brand-border px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 sm:text-sm"
                placeholder="Password123"
              />
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-brand-bg transition duration-150 ease-in-out"
            >
              {loading ? "Connecting..." : isRegister ? "Create Account" : "Sign In"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
                setUsername("");
                setEmail("");
                setPassword("");
                setEmpId("");
              }}
              className="w-full text-center text-xs text-cyan-400 hover:text-cyan-300 font-medium py-1 transition"
            >
              {isRegister ? "Already have an account? Sign In" : "Don't have an account? Register Here"}
            </button>
          </div>

          {!isRegister && (
            <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-brand-border/30 tracking-wide">
              <span>Authorized personnel only. Access logging is active. Contact corporate IT support for credentials.</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// 2. Unauthorized View
function UnauthorizedView() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg text-center px-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mb-6">
        <ShieldAlert className="h-10 w-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-white mb-2">Access Denied</h1>
      <p className="text-slate-400 max-w-md mb-6">
        Your assigned user role does not possess the permissions required to view this factory station.
      </p>
      <a href="/" className="px-5 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-sm font-semibold transition">
        Return to Safety Dashboard
      </a>
    </div>
  );
}
