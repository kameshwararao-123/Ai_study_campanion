import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Compass,
  FolderKanban,
  ArrowRight,
  Layers,
  Sparkles,
  X,
  AlertCircle,
} from "lucide-react";
import api from "../services/api.js";

export default function SpacesListPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("indigo");
  const [error, setError] = useState("");

  const fetchSpaces = () => {
    api
      .get("/spaces")
      .then((res) => {
        if (res.data.success) setSpaces(res.data.data.spaces);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/spaces", {
        name,
        description,
        visualConfig: { color },
      });
      if (!res.data.success) throw new Error(res.data.error?.message || "Failed to create space");

      setShowModal(false);
      setName("");
      setDescription("");
      fetchSpaces();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  const colors = [
    { id: "indigo", bg: "bg-indigo-500", label: "Indigo" },
    { id: "violet", bg: "bg-violet-500", label: "Violet" },
    { id: "blue", bg: "bg-blue-500", label: "Blue" },
    { id: "emerald", bg: "bg-emerald-500", label: "Emerald" },
    { id: "amber", bg: "bg-amber-500", label: "Amber" },
    { id: "rose", bg: "bg-rose-500", label: "Rose" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="h-3.5 w-3.5 text-indigo-600" />
            <span>Learning Domains</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Learning Spaces
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Curate study domains, organize syllabus projects, and track domain-level progress.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-indigo-200 transition-all hover:scale-102 flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Space</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-3xl bg-slate-200/80 p-6" />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xs">
          <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 ring-8 ring-indigo-50/60">
            <Compass className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Learning Spaces Yet</h3>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
            Create a Space to represent a course, certification, or skill domain (e.g., "Machine Learning", "System Design").
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow transition inline-flex items-center gap-2 hover:scale-102"
          >
            <Plus className="h-4 w-4" />
            <span>Create Space</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spaces.map((space) => {
            const projectCount = space._count?.projects || 0;

            return (
              <Link
                key={space.id}
                to={`/spaces/${space.id}`}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all duration-150 group block flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-150">
                      <Compass className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full flex items-center gap-1.5 border border-slate-200/60">
                      <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                      <span>{projectCount} {projectCount === 1 ? "Project" : "Projects"}</span>
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition mb-1.5 line-clamp-1">
                    {space.name}
                  </h2>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {space.description || "No description provided for this learning space."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:underline">
                  <span>Open Space</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Modal: Create Space */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create Learning Space</h3>
                <p className="text-xs text-slate-500 mt-0.5">Organize related syllabus projects</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Space Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems, Machine Learning"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of what you want to explore in this domain..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Theme Accent
                </label>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`h-8 w-8 rounded-full ${c.bg} transition-all ${
                        color === c.id ? "ring-4 ring-indigo-200 scale-110" : "opacity-70 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Create Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
