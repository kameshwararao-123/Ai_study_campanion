import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Home, Compass, BarChart3, LogOut, Sparkles, Menu, X, ChevronRight, User, Flame, Zap, ShieldCheck } from "lucide-react";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/", icon: Home, badge: "Daily" },
    { label: "Learning Spaces", path: "/spaces", icon: Compass },
    { label: "Growth & Analytics", path: "/analytics", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen flex bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] text-slate-900 font-sans antialiased selection:bg-indigo-600 selection:text-white">
      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 z-40 px-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white block leading-tight">
              AI Study Companion
            </span>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Learner Space</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation — Sleek Modern Midnight Style */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 w-72 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 ease-out shadow-2xl md:shadow-none text-slate-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand & Status Section */}
        <div>
          <div className="p-6 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 ring-2 ring-white/10 animate-float">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
              </div>
              <div>
                <div className="font-extrabold text-base text-white tracking-tight leading-tight flex items-center gap-1.5">
                  StudyCompanion
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    AI
                  </span>
                </div>
                <div className="text-[11px] text-emerald-400 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Grounded &amp; Ready
                </div>
              </div>
            </div>

            {/* Streak & Motivation Capsule */}
            <div className="mt-5 p-3 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-slate-800/80 shadow-inner">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500 animate-pulse" /> Daily Learning Streak
                </span>
                <span className="font-extrabold text-amber-400">Day 3</span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-indigo-500 h-1.5 rounded-full w-3/4 transition-all duration-500"></div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="px-4 pt-5 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-3">
              Navigation
            </span>
          </div>

          <nav className="px-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.path);

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200 group relative ${
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`p-1.5 rounded-xl transition-colors ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-900 text-slate-400 group-hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && !isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="h-4 w-4 text-white/80" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3 overflow-hidden pr-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-indigo-500/20">
                {user?.name ? user.name[0].toUpperCase() : <User className="h-4 w-4" />}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate leading-tight">
                  {user?.name || "Student"}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition rounded-xl shrink-0"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pt-16 md:pt-0">
        <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
