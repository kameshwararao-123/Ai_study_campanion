import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  LogOut,
  User,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export function AdminHeader({
  activeTab = "overview",
  onTabChange,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileOpen,
  setMobileOpen,
  searchQuery = "",
  setSearchQuery,
  onRefresh,
  refreshing = false,
  alertCount = 0,
  alerts = [],
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const tabLabels = {
    overview: "Dashboard Overview",
    analytics: "Platform Telemetry & Analytics",
    learners: "Learner Directory & Journey",
    problems: "Assessment & Problem Insights",
    submissions: "Submission Performance",
    topics: "Topic & Concept Progression",
    activity: "Activity Audit Log",
    jobs: "Background Queue & Workers",
    settings: "Platform & Engine Settings",
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Side: Collapse Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            aria-label="Toggle Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden md:flex p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label="Toggle Sidebar"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          {/* Breadcrumb & Title */}
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Admin Console</span>
              <span>/</span>
              <span className="text-rose-600 font-bold">{tabLabels[activeTab] || "Dashboard"}</span>
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight hidden sm:block">
              {tabLabels[activeTab] || "Dashboard Overview"}
            </h1>
          </div>
        </div>

        {/* Center: Quick Search */}
        <div className="flex-1 max-w-xs sm:max-w-sm hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search across learners, projects, events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Refresh, Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh Action */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition ${
                refreshing ? "animate-spin text-rose-600" : ""
              }`}
              title="Refresh Live Telemetry"
              aria-label="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
              aria-label="View notifications"
              title="Platform Alerts"
            >
              <Bell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">Platform Alerts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {alerts.length} Active
                    </span>
                  </div>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-50 text-xs">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 flex flex-col items-center gap-1.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      <span>All systems operating nominal.</span>
                    </div>
                  ) : (
                    alerts.map((al, i) => (
                      <div key={i} className="pt-2 flex items-start gap-2.5">
                        {al.type === "error" ? (
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800 leading-tight">{al.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5 leading-normal">{al.desc}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
              aria-label="User profile menu"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center font-black text-xs shadow-sm shadow-rose-600/30 shrink-0">
                {user?.name ? user.name[0].toUpperCase() : <User className="w-4 h-4" />}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[120px]">
                  {user?.name || "Admin"}
                </div>
                <div className="text-[10px] text-rose-600 font-semibold tracking-wide">
                  Super Admin
                </div>
              </div>
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{user?.name || "Administrator"}</div>
                  <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
                  <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    Administrator (RBAC)
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

