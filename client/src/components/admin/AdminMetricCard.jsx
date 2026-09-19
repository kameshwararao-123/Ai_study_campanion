import React from "react";

export function AdminMetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorScheme = "rose",
  trend,
  onClick,
}) {
  const colorMap = {
    rose: {
      iconBg: "bg-rose-50 border-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white",
      borderHover: "hover:border-rose-300",
      pill: "bg-rose-50 text-rose-700 border-rose-200",
    },
    indigo: {
      iconBg: "bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white",
      borderHover: "hover:border-indigo-300",
      pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    emerald: {
      iconBg: "bg-emerald-50 border-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
      borderHover: "hover:border-emerald-300",
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    blue: {
      iconBg: "bg-blue-50 border-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
      borderHover: "hover:border-blue-300",
      pill: "bg-blue-50 text-blue-700 border-blue-200",
    },
    amber: {
      iconBg: "bg-amber-50 border-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
      borderHover: "hover:border-amber-300",
      pill: "bg-amber-50 text-amber-700 border-amber-200",
    },
    purple: {
      iconBg: "bg-purple-50 border-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
      borderHover: "hover:border-purple-300",
      pill: "bg-purple-50 text-purple-700 border-purple-200",
    },
  };

  const scheme = colorMap[colorScheme] || colorMap.rose;

  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-lg ${scheme.borderHover} hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-200 ${scheme.iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {subtext && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="truncate">{subtext}</span>
          {trend && (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                trend.type === "positive"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : trend.type === "warning"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

