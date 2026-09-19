import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BarChart3, Activity, Award, Cpu, Sparkles, Clock, History } from "lucide-react";
import api from "../services/api.js";

export default function ProjectAnalyticsPage() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/analytics/project/${projectId}`)
      .then((res) => {
        if (res.data.success) setData(res.data.data);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 rounded-3xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-3xl"></div>
          <div className="h-72 bg-slate-200 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const quizHistory = data?.quizHistory || [];
  const events = data?.events || [];
  const aiStats = data?.aiStats || { totalCalls: 0, totalTokens: 0, totalCost: 0, avgLatencyMs: 0 };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* AI Telemetry & Observability Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{aiStats.totalCalls}</div>
            <div className="text-xs text-slate-500 font-medium">AI Interactions</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{aiStats.totalTokens.toLocaleString()}</div>
            <div className="text-xs text-slate-500 font-medium">Tokens Used</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">${aiStats.totalCost.toFixed(4)}</div>
            <div className="text-xs text-slate-500 font-medium">Estimated Cost</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center shrink-0">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{aiStats.avgLatencyMs}ms</div>
            <div className="text-xs text-slate-500 font-medium">Avg AI Latency</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Quiz Performance & Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assessment Performance History */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Award className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Assessment History</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {quizHistory.length} completed
            </span>
          </div>

          <div className="flex-1">
            {quizHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No assessments taken for this project yet.
              </div>
            ) : (
              <div className="space-y-3">
                {quizHistory.map((q) => {
                  const score = q.score !== null ? Math.round(q.score) : null;
                  const isHigh = score !== null && score >= 75;
                  const isMedium = score !== null && score >= 50 && score < 75;

                  return (
                    <div
                      key={q.id}
                      className="flex justify-between items-center p-3.5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-100 transition text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 font-semibold text-[11px]">
                          Q
                        </div>
                        <span className="font-semibold text-slate-800">{q.title}</span>
                      </div>
                      <span
                        className={`font-bold px-3 py-1 rounded-full text-xs border ${
                          isHigh
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                            : isMedium
                            ? "bg-blue-50 text-blue-700 border-blue-200/60"
                            : "bg-amber-50 text-amber-700 border-amber-200/60"
                        }`}
                      >
                        {score !== null ? `${score}%` : "N/A"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Activity Event Stream */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <History className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">Learning Event Log</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
              {events.length} events
            </span>
          </div>

          <div className="flex-1">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">No events logged yet.</div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {events.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs flex justify-between items-center"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="font-semibold text-slate-800">{ev.eventType}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

