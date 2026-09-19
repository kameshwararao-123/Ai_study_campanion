import React from "react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  HelpCircle,
  CheckCircle2,
  Layers,
  Activity,
  Server,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export function AdminSidebar({
  activeTab = "overview",
  onTabChange,
  collapsed = false,
  setCollapsed,
  mobileOpen = false,
  setMobileOpen,
  badgeCounts = {},
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard, badge: null },
    { id: "analytics", label: "Analytics", icon: BarChart3, badge: null },
    { id: "learners", label: "Learners", icon: Users, badge: badgeCounts.users },
    { id: "problems", label: "Problems", icon: HelpCircle, badge: badgeCounts.problems },
    { id: "submissions", label: "Submissions", icon: CheckCircle2, badge: badgeCounts.submissions },
    { id: "topics", label: "Performance", icon: Layers, badge: null },
    { id: "activity", label: "Recent Activity", icon: Activity, badge: badgeCounts.events },
    { id: "jobs", label: "Workers & Jobs", icon: Server, badge: badgeCounts.failedJobs ? `${badgeCounts.failedJobs} err` : null, badgeColor: badgeCounts.failedJobs ? "bg-rose-500 text-white" : null },
    { id: "settings", label: "Settings", icon: Settings, badge: null },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Admin Sidebar — Midnight Crimson Palette */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-50 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-out shadow-2xl md:shadow-none text-slate-300 ${
          collapsed ? "md:w-20" : "md:w-68"
        } ${mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Top Header & Navigation */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-800/60">
            <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-red-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30 ring-2 ring-white/10 animate-float">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-slate-950" />
                </div>

                {!collapsed && (
                  <div className="overflow-hidden">
                    <div className="font-extrabold text-sm text-white tracking-tight leading-tight flex items-center gap-1.5">
                      AdminConsole
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold uppercase">
                        PRO
                      </span>
                    </div>
                    <div className="text-[10px] text-rose-400 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      Observability Active
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Toggle in Header when not collapsed */}
              {!collapsed && (
                <button
                  onClick={() => setCollapsed(true)}
                  className="hidden md:flex p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Health Status Pill */}
            {!collapsed && (
              <div className="mt-4 p-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-rose-950/20 border border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Platform Status
                  </span>
                  <span className="font-extrabold text-emerald-400 text-[11px]">100% OK</span>
                </div>
              </div>
            )}
          </div>

          {/* Nav Section Label */}
          {!collapsed && (
            <div className="px-5 pt-4 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Platform Analytics
              </span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const ItemIcon = item.icon;
              const isSelected = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    if (setMobileOpen) setMobileOpen(false);
                  }}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? "justify-center px-2 py-3" : "justify-between px-3.5 py-2.5"
                  } rounded-xl text-xs font-bold transition-all duration-150 group ${
                    isSelected
                      ? "bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 text-white shadow-lg shadow-rose-600/25"
                      : "text-slate-400 hover:text-white hover:bg-slate-900/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ItemIcon
                      className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                        isSelected ? "text-white" : "text-slate-400 group-hover:text-white group-hover:scale-110"
                      }`}
                    />
                    {!collapsed && <span className="tracking-tight">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                        item.badgeColor || (isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400")
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer: User Profile Card & Sign Out */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleLogout}
                className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCollapsed(false)}
                className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition"
                title="Expand Sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-2.5 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-rose-500/20">
                  {user?.name ? user.name[0].toUpperCase() : <User className="h-3.5 w-3.5" />}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-white truncate leading-tight">
                    {user?.name || "Administrator"}
                  </div>
                  <div className="text-[10px] text-rose-400 truncate mt-0.5 font-semibold">
                    Super Admin
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition rounded-lg shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

