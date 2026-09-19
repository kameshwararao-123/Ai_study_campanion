import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  BookOpen,
  Compass,
  Award,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Flame,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  TrendingUp,
  FolderGit2,
  ChevronRight,
} from "lucide-react";
import api from "../services/api.js";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function UserHomePage() {
  const { user } = useAuth();
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
      <div className="space-y-6 animate-pulse">
        <div className="h-52 rounded-3xl bg-slate-200/80 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-200/70 p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-3xl bg-slate-200/70" />
          <div className="h-80 rounded-3xl bg-slate-200/70" />
        </div>
      </div>
    );
  }

  const summary = data?.summary || {
    totalSpaces: 0,
    totalProjects: 0,
    completedQuizzes: 0,
    masteredConcepts: 0,
  };
  const recentProjects = data?.recentProjects || [];
  const weakAreas = data?.weakAreas || [];
  const featuredProject = recentProjects.length > 0 ? recentProjects[0] : null;

  return (
    <div className="space-y-8">
      {/* 1. Radiant Hero Banner with Ambient Glow */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 p-7 sm:p-9 text-white shadow-2xl border border-indigo-500/20">
        {/* Ambient Aurora Orbs */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-purple-500/25 blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none animate-pulse-glow" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200 shadow-inner">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Personalized AI Study Engine</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {getGreeting()},{" "}
              <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                {user?.name || "Scholar"}
              </span>
              !
            </h1>

            <p className="text-sm sm:text-base text-indigo-100/80 leading-relaxed font-normal">
              {summary.completedQuizzes > 0
                ? `You have conquered ${summary.completedQuizzes} assessments and established mastery over ${summary.masteredConcepts} core concepts. Ready to push further today?`
                : "Welcome to your intelligent workspace. Pick a space, upload learning materials, and unlock grounded AI tutoring."}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 bg-indigo-900/60 px-3 py-1.5 rounded-xl border border-indigo-700/40">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Streak: 3 Days</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-300 bg-purple-900/60 px-3 py-1.5 rounded-xl border border-purple-700/40">
                <Zap className="w-4 h-4 text-purple-400" />
                <span>Mastery Rate: {summary.totalProjects > 0 ? Math.round((summary.masteredConcepts / Math.max(summary.totalProjects * 5, 1)) * 100) : 85}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/spaces"
              className="px-6 py-3.5 bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold rounded-2xl text-xs sm:text-sm transition-all duration-200 shadow-xl shadow-indigo-600/30 hover:scale-102 flex items-center justify-center gap-2 group"
            >
              <Compass className="h-4 w-4 transition-transform group-hover:rotate-45" />
              <span>Explore Spaces</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Key Metric Cards with Gradient Rings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Metric 1: Spaces */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-indigo-600/10 border border-indigo-500/20 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalSpaces}
            </div>
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Learning Spaces
            </div>
          </div>
        </div>

        {/* Metric 2: Active Projects */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-blue-600/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.totalProjects}
            </div>
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Active Projects
            </div>
          </div>
        </div>

        {/* Metric 3: Concepts Mastered */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-emerald-600/10 border border-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.masteredConcepts}
            </div>
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Mastered Concepts
            </div>
          </div>
        </div>

        {/* Metric 4: Quizzes Completed */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-purple-300 hover:-translate-y-1 transition-all duration-300 flex items-center gap-4 group">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-500/10 to-purple-600/10 border border-purple-500/20 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {summary.completedQuizzes}
            </div>
            <div className="text-xs text-slate-500 font-semibold tracking-wide">
              Quizzes Passed
            </div>
          </div>
        </div>
      </div>

      {/* 3. Featured Spotlight: Today's Learning Focus */}
      {featuredProject ? (
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-500/30">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-400/30 flex items-center gap-1.5 shadow-xs">
                  <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> Today's Focus
                </span>
                <span className="text-xs text-indigo-200/70 flex items-center gap-1 font-medium">
                  <Clock className="h-3 w-3" /> Recommended Daily Track
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {featuredProject.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed line-clamp-2">
                Goal: {featuredProject.learningGoal || "Deepen your understanding through AI-assisted practice."}
              </p>
            </div>

            <div className="shrink-0 flex items-center">
              <Link
                to={`/spaces/${featuredProject.spaceId}/projects/${featuredProject.id}`}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 hover:from-indigo-400 hover:to-pink-500 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all shadow-lg shadow-indigo-900/40 hover:shadow-indigo-500/30 hover:scale-103 flex items-center justify-center gap-2 group active:scale-95"
              >
                <span>Continue Learning</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs">
          <div className="h-16 w-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-indigo-50/50">
            <Compass className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Start Your First Learning Journey</h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            Create a Space to organize your course notes, generate interactive quizzes, and chat with your personalized AI tutor.
          </p>
          <Link
            to="/spaces"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition hover:scale-102"
          >
            <span>Create or Browse Spaces</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* 4. Active Topics & Areas Requiring Attention Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Topic Cards */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Learning Projects</h2>
              <p className="text-xs text-slate-500 mt-0.5">Jump directly into your interactive workspaces</p>
            </div>
            <Link
              to="/spaces"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 group"
            >
              <span>View All Spaces</span>
              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {recentProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No projects enrolled yet. Pick a space to begin.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recentProjects.map((proj) => (
                <Link
                  key={proj.id}
                  to={`/spaces/${proj.spaceId}/projects/${proj.id}`}
                  className="p-5 rounded-3xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-lg transition-all duration-200 group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-indigo-100/70 text-indigo-700 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition truncate">
                      {proj.name}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 font-normal leading-relaxed">
                      {proj.learningGoal || proj.description || "Goal-oriented study companion"}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                    </span>
                    <span className="text-indigo-600 group-hover:underline">Launch Workspace →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Areas Requiring Attention */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="h-4 w-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Review &amp; Strengthen
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">Concepts with lower retention scores</p>

            {weakAreas.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="font-bold text-slate-800 text-xs">All Concepts in Good Standing</div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  No concepts require urgent remediation. Continue quizzing to maintain high retention.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakAreas.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-2xl space-y-2 hover:bg-amber-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[140px]">
                        {w.conceptName}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {w.score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Project: {w.projectName}
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-amber-200/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full"
                        style={{ width: `${Math.max(w.score, 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/analytics"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition inline-flex items-center gap-1 group"
            >
              <span>View Full Growth Analytics</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
