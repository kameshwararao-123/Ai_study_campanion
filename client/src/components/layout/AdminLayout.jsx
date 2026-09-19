import React, { useState, useEffect } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { AdminSidebar } from "../admin/AdminSidebar.jsx";
import { AdminHeader } from "../admin/AdminHeader.jsx";

export default function AdminLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeCounts, setBadgeCounts] = useState({});
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    try {
      localStorage.setItem("admin_sidebar_collapsed", String(sidebarCollapsed));
    } catch (e) {
      console.error(e);
    }
  }, [sidebarCollapsed]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900 font-sans antialiased selection:bg-rose-500 selection:text-white">
      {/* Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        badgeCounts={badgeCounts}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Universal Admin Top Header */}
        <AdminHeader
          activeTab={activeTab}
          onTabChange={handleTabChange}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          alertCount={alerts.length}
          alerts={alerts}
        />

        {/* Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet
            context={{
              activeTab,
              setActiveTab: handleTabChange,
              searchQuery,
              setSearchQuery,
              refreshTrigger,
              setRefreshing,
              setBadgeCounts,
              setAlerts,
            }}
          />
        </main>
      </div>
    </div>
  );
}
