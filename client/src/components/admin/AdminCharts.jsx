import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#e11d48", "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#8b5cf6"];

/**
 * Activity Timeline Area Chart
 */
export function ActivityTimelineChart({ events = [] }) {
  // Aggregate events by day or timestamp slice
  const aggregatedMap = {};

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  sorted.forEach((ev) => {
    const d = new Date(ev.timestamp);
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!aggregatedMap[dateLabel]) {
      aggregatedMap[dateLabel] = { date: dateLabel, total: 0, quizzes: 0, interactions: 0 };
    }
    aggregatedMap[dateLabel].total += 1;
    if (ev.eventType?.toLowerCase().includes("quiz")) {
      aggregatedMap[dateLabel].quizzes += 1;
    } else {
      aggregatedMap[dateLabel].interactions += 1;
    }
  });

  const chartData = Object.values(aggregatedMap);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No activity events available to graph.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "12px",
              border: "none",
              color: "#fff",
              fontSize: "12px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.3)",
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="All Activities"
            stroke="#e11d48"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
          />
          <Area
            type="monotone"
            dataKey="quizzes"
            name="Quizzes Completed"
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorQuizzes)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * AI Usage by Feature Bar Chart
 */
export function AIUsageByFeatureChart({ aiLogs = [] }) {
  const featureMap = {};

  aiLogs.forEach((log) => {
    const feat = log.featureName || "OTHER";
    if (!featureMap[feat]) {
      featureMap[feat] = {
        name: feat.replace(/_/g, " "),
        tokens: 0,
        requests: 0,
        cost: 0,
      };
    }
    featureMap[feat].tokens += log.totalTokens || 0;
    featureMap[feat].requests += 1;
    featureMap[feat].cost += log.estimatedCostUsd || 0;
  });

  const chartData = Object.values(featureMap);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No AI telemetry records available.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "12px",
              border: "none",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(val, name) => [
              name === "Total Tokens" ? val.toLocaleString() : val,
              name,
            ]}
          />
          <Bar dataKey="tokens" name="Total Tokens" fill="#4f46e5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Submission Accuracy Donut Chart
 */
export function SubmissionAccuracyChart({ correct = 0, incorrect = 0 }) {
  const total = correct + incorrect;
  const data = [
    { name: "Proficient / Correct", value: correct, color: "#10b981" },
    { name: "Needs Review", value: incorrect, color: "#f43f5e" },
  ];

  if (total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        No submissions evaluated yet.
      </div>
    );
  }

  const accuracyPct = Math.round((correct / total) * 100);

  return (
    <div className="relative h-48 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={52}
            outerRadius={75}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "10px",
              border: "none",
              color: "#fff",
              fontSize: "11px",
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Statistic */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xl font-black text-slate-900 leading-none">{accuracyPct}%</span>
        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
          Accuracy
        </span>
      </div>
    </div>
  );
}

/**
 * Model Latency Distribution Line Chart
 */
export function LatencyTrendChart({ aiLogs = [] }) {
  const sorted = [...aiLogs]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-25);

  const data = sorted.map((log, idx) => ({
    index: `#${idx + 1}`,
    latency: log.latencyMs,
    feature: log.featureName,
  }));

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No latency data recorded.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="index" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} unit="ms" />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderRadius: "12px",
              border: "none",
              color: "#fff",
              fontSize: "12px",
            }}
            formatter={(val) => [`${val} ms`, "Latency"]}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ fill: "#f59e0b", r: 3 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

