import React from "react";
import { useOutletContext, Link, useParams } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Award,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Zap,
  Target,
  FileText,
  Compass,
} from "lucide-react";

export default function ProjectDashboardPage() {
  const { project } = useOutletContext();
  const { spaceId, projectId } = useParams();

  const concepts = project?.concepts || [];
  const recommendations = project?.recommendations || [];

  const journeySteps = [
    {
      num: "01",
      title: "Study Materials",
      desc: "Upload PDFs & extract core concepts",
      path: `/spaces/${spaceId}/projects/${projectId}/materials`,
      icon: BookOpen,
      color: "blue",
      bg: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    },
    {
      num: "02",
      title: "AI Personal Tutor",
      desc: "Grounded Q&A with top-1 citations",
      path: `/spaces/${spaceId}/projects/${projectId}/tutor`,
      icon: Sparkles,
      color: "indigo",
      bg: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
    },
    {
      num: "03",
      title: "Adaptive Quiz",
      desc: "MCQ & open-ended assessments",
      path: `/spaces/${spaceId}/projects/${projectId}/quiz`,
      icon: Award,
      color: "violet",
      bg: "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
    },
    {
      num: "04",
      title: "Growth & Mastery",
      desc: "Track concept trajectory over time",
      path: `/spaces/${spaceId}/projects/${projectId}/growth`,
      icon: TrendingUp,
      color: "emerald",
      bg: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4-Step Interactive Learning Journey */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {journeySteps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.num}
              to={step.path}
              className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-150 group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl transition-all ${step.bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-black text-slate-400">{step.num}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-indigo-600 transition">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{step.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover:text-indigo-600 transition">
                <span>Launch Tool</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Concepts Mastery & Actionable Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Concepts & Mastery Levels */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Concept Retention &amp; Mastery
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically calculated from your quiz submissions
              </p>
            </div>
            <Link
              to={`/spaces/${spaceId}/projects/${projectId}/growth`}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1"
            >
              <span>View Trajectory</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {concepts.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">No Concepts Extracted Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Upload your course PDF documents in the Materials Hub to automatically extract key concepts.
              </p>
              <Link
                to={`/spaces/${spaceId}/projects/${projectId}/materials`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-xs"
              >
                <span>Upload Materials</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {concepts.map((c) => {
                const score = c.masteryRecords?.[0]?.masteryScore ?? 45.0;
                const isMastered = score >= 75;
                const isDeveloping = score >= 50 && score < 75;

                return (
                  <div key={c.id} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isMastered
                              ? "bg-emerald-100/70 text-emerald-800"
                              : isDeveloping
                              ? "bg-amber-100/70 text-amber-800"
                              : "bg-indigo-100/70 text-indigo-800"
                          }`}
                        >
                          {isMastered ? "Mastered" : isDeveloping ? "Developing" : "Learning"}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700">{score.toFixed(0)}%</span>
                    </div>

                    <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isMastered ? "bg-emerald-500" : isDeveloping ? "bg-amber-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${Math.max(score, 8)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actionable Recommended Next Action Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-md flex flex-col justify-between border border-slate-700/60">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold uppercase tracking-wider mb-4 border border-indigo-400/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Recommended Next Step</span>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {recommendations[0].title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {recommendations[0].message}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Reinforce Learning with an Adaptive Quiz
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Test your understanding on key project concepts with dynamically generated questions.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-slate-700/50">
            <Link
              to={`/spaces/${spaceId}/projects/${projectId}/quiz`}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white text-xs font-bold rounded-xl text-center transition-all flex items-center justify-center gap-2 shadow-md hover:scale-102"
            >
              <span>Launch Assessment</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
