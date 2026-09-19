import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Compass, BookOpen, Award, Sparkles, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import api from "../services/api.js";

export default function GlobalAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/analytics/global")
      .then((res) => {
        if (res.data.success) setData(res.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-28 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalSpaces: 0, totalProjects: 0, completedQuizzes: 0, masteredConcepts: 0 };
  const recentProjects = data?.recentProjects || [];
  const weakAreas = data?.weakAreas || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Global Learner Analytics</h1>
            <p className="text-xs text-slate-500">Cross-space aggregated learning performance, mastery, and activity</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{summary.totalSpaces}</div>
            <div className="text-xs text-slate-500 font-medium">Total Spaces</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{summary.totalProjects}</div>
            <div className="text-xs text-slate-500 font-medium">Total Projects</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{summary.masteredConcepts}</div>
            <div className="text-xs text-slate-500 font-medium">Mastered (&ge; 75%)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{summary.completedQuizzes}</div>
            <div className="text-xs text-slate-500 font-medium">Quizzes Completed</div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Recent Projects & Areas to Strengthen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Recent Projects</h2>
            </div>
            <Link to="/spaces" className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1">
            {recentProjects.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">No recent projects found.</div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/spaces/${p.spaceId}/projects/${p.id}`}
                    className="p-4 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 transition flex items-center justify-between group"
                  >
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Focus / Weak Areas */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Focus Areas to Strengthen</h2>
            </div>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/50">
              {weakAreas.length} concepts
            </span>
          </div>

          <div className="flex-1">
            {weakAreas.length === 0 ? (
              <div className="text-center py-10 text-emerald-600/80 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                Great job! No weak concepts detected across your spaces.
              </div>
            ) : (
              <div className="space-y-3">
                {weakAreas.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100/70 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-900">{w.name}</span>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{w.definition || "Concept needing review"}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 shrink-0 ml-3">
                      {w.masteryScore ? `${w.masteryScore.toFixed(0)}%` : "0%"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

