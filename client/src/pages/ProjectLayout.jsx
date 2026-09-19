import React, { useState, useEffect } from "react";
import { useParams, Outlet, Link, useLocation } from "react-router-dom";
import { BookOpen, Sparkles, Award, TrendingUp, BarChart3, ArrowLeft, Layers, ChevronRight } from "lucide-react";
import api from "../services/api.js";

export default function ProjectLayout() {
  const { spaceId, projectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/projects/${projectId}`)
      .then((res) => {
        if (res.data.success) setProject(res.data.data.project);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-3xl bg-slate-200/80 w-full" />
        <div className="h-96 rounded-3xl bg-slate-200/60 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-md mx-auto space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Layers className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">The requested learning workspace could not be located.</p>
        <Link
          to={`/spaces/${spaceId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Space
        </Link>
      </div>
    );
  }

  const tabs = [
    { label: "Overview", path: `/spaces/${spaceId}/projects/${projectId}`, icon: Layers, exact: true },
    { label: "Materials", path: `/spaces/${spaceId}/projects/${projectId}/materials`, icon: BookOpen },
    { label: "AI Tutor", path: `/spaces/${spaceId}/projects/${projectId}/tutor`, icon: Sparkles },
    { label: "Adaptive Quiz", path: `/spaces/${spaceId}/projects/${projectId}/quiz`, icon: Award },
    { label: "Growth", path: `/spaces/${spaceId}/projects/${projectId}/growth`, icon: TrendingUp },
    { label: "Analytics", path: `/spaces/${spaceId}/projects/${projectId}/analytics`, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Project Header & Workspace Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-3">
          <Link to="/spaces" className="hover:text-indigo-600 transition">
            Spaces
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/spaces/${spaceId}`} className="hover:text-indigo-600 transition">
            {project.space?.name || "Space"}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-700 font-bold truncate">{project.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed max-w-2xl">
              {project.description || "Active interactive study companion workspace."}
            </p>
          </div>
          <div className="px-3.5 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs shrink-0 self-start md:self-center">
            <span className="font-bold text-indigo-700">Goal:</span>{" "}
            <span className="text-slate-700 font-medium">{project.learningGoal}</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 border-b border-slate-100 mt-6 -mb-6 overflow-x-auto pb-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.exact
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path);

            return (
              <Link
                key={tab.label}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/40 rounded-t-xl"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50/60 rounded-t-xl"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Active Tab Content Outlet */}
      <div>
        <Outlet context={{ project }} />
      </div>
    </div>
  );
}
