import React from "react";
import { AlertCircle, RefreshCw, Inbox, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Skeleton Loader for Metric Cards, Charts, and Data Tables
 */
export function AdminSkeletonLoader({ variant = "all" }) {
  if (variant === "metrics") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70 p-4 border border-slate-200/50" />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200/70 rounded-xl w-1/4" />
        <div className="space-y-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-36 rounded-3xl bg-slate-200/80 w-full" />

      {/* KPI Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200/70 p-4 border border-slate-200/50" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 rounded-3xl bg-slate-200/70 p-6 border border-slate-200/50" />
        <div className="h-72 rounded-3xl bg-slate-200/70 p-6 border border-slate-200/50" />
      </div>

      {/* Table Skeleton */}
      <div className="h-80 rounded-3xl bg-slate-200/70 p-6 border border-slate-200/50" />
    </div>
  );
}

/**
 * Error State with user-friendly retry button
 */
export function AdminErrorState({ message = "Unable to load analytics telemetry", onRetry }) {
  return (
    <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-8 sm:p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 shadow-inner">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base font-extrabold text-slate-900 mb-1.5">Telemetry Synchronization Error</h3>
      <p className="text-xs text-slate-600 mb-6 max-w-sm mx-auto leading-relaxed">
        {message}. The server may be restarting or experiencing transient latency.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}

/**
 * Empty State for empty tables, charts, or event logs
 */
export function AdminEmptyState({
  icon: Icon = Inbox,
  title = "No Data Recorded Yet",
  description = "There are no records matching your current filter criteria or time range.",
  actionText,
  onAction,
}) {
  return (
    <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 my-3">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

