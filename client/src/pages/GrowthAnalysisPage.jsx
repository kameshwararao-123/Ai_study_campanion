import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, Sparkles, BookOpen } from "lucide-react";
import api from "../services/api.js";

export default function GrowthAnalysisPage() {
  const { projectId } = useParams();
  const [growth, setGrowth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/mastery/${projectId}/growth`)
      .then((res) => {
        if (res.data.success) setGrowth(res.data.data.growth);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-28 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
          <div className="h-64 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const improving = growth?.improving || [];
  const stable = growth?.stable || [];
  const requiringAttention = growth?.requiringAttention || [];
  const totalConcepts = improving.length + stable.length + requiringAttention.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Overview Hero */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Concept Mastery &amp; Growth Trajectory</h1>
              <p className="text-xs text-slate-500">
                Real-time categorization based on quiz accuracy, spaced repetition retrieval, and learning evidence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
              {totalConcepts} {totalConcepts === 1 ? "Tracked Concept" : "Tracked Concepts"}
            </span>
          </div>
        </div>
      </div>

      {/* 3-Column Growth Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Improving / Mastered */}
        <div className="bg-white rounded-3xl border border-emerald-200/80 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-emerald-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Mastered</h2>
                <p className="text-[11px] text-emerald-700 font-medium">&ge; 75% Retention</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {improving.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {improving.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center">
                <Sparkles className="w-6 h-6 text-slate-300 mb-2" />
                No concepts in this tier yet. Take quizzes to build mastery!
              </div>
            ) : (
              improving.map((c, idx) => {
                const score = Number(c.masteryScore ?? 75);
                return (
                  <div key={c.id || idx} className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                      <span className="text-xs font-bold text-emerald-700">{score.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-emerald-100/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{c.definition}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Stable Retention */}
        <div className="bg-white rounded-3xl border border-blue-200/80 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-blue-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Stable Retention</h2>
                <p className="text-[11px] text-blue-700 font-medium">50% – 74% Developing</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
              {stable.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {stable.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center justify-center">
                <Clock className="w-6 h-6 text-slate-300 mb-2" />
                No concepts currently developing.
              </div>
            ) : (
              stable.map((c, idx) => {
                const score = Number(c.masteryScore ?? 50);
                return (
                  <div key={c.id || idx} className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                      <span className="text-xs font-bold text-blue-700">{score.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-blue-100/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{c.definition}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Requiring Attention */}
        <div className="bg-white rounded-3xl border border-amber-200/80 p-5 sm:p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Needs Review</h2>
                <p className="text-[11px] text-amber-700 font-medium">&lt; 50% Attention</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
              {requiringAttention.length}
            </span>
          </div>

          <div className="space-y-3 flex-1">
            {requiringAttention.length === 0 ? (
              <div className="text-center py-10 text-emerald-600/80 text-xs flex flex-col items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mb-2" />
                All concepts are currently in stable or mastered standing!
              </div>
            ) : (
              requiringAttention.map((c, idx) => {
                const score = Number(c.masteryScore ?? 40);
                return (
                  <div key={c.id || idx} className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900 text-xs">{c.name}</span>
                      <span className="text-xs font-bold text-amber-700">{score.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-amber-100/60 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                      ></div>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{c.definition}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

