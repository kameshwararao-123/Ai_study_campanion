import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Plus, BookOpen, Compass, ArrowRight, ArrowLeft, Target, Sparkles, X, FolderGit2 } from "lucide-react";
import api from "../services/api.js";

export default function SpaceDashboardPage() {
  const { spaceId } = useParams();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [error, setError] = useState("");

  const fetchSpace = () => {
    api
      .get(`/spaces/${spaceId}`)
      .then((res) => {
        if (res.data.success) setSpace(res.data.data.space);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpace();
  }, [spaceId]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post(`/projects/space/${spaceId}`, {
        name,
        description,
        learningGoal,
      });
      if (!res.data.success) throw new Error(res.data.error?.message || "Failed to create project");

      setShowModal(false);
      setName("");
      setDescription("");
      setLearningGoal("");
      fetchSpace();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded-md"></div>
        <div className="h-36 bg-slate-200 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
          <div className="h-44 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (!space) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <X className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Space Not Found</h3>
        <p className="text-xs text-slate-500 mb-6">The space you are looking for does not exist or has been removed.</p>
        <Link
          to="/spaces"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to All Spaces
        </Link>
      </div>
    );
  }

  const projects = space.projects || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link to="/spaces" className="hover:text-indigo-600 transition flex items-center gap-1 font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Spaces
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 truncate max-w-xs">{space.name}</span>
      </div>

      {/* Space Header Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/20 backdrop-blur-md">
                <Compass className="w-3.5 h-3.5 text-indigo-300" />
                Learning Space
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50">
                {projects.length} {projects.length === 1 ? "Project" : "Projects"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">{space.name}</h1>
            <p className="text-sm text-slate-300/90 leading-relaxed">{space.description || "Organize, study, and master concepts through focused learning projects."}</p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="self-start md:self-center inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-2xl shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-95 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
      </div>

      {/* Projects List within Space */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Focused Projects</h2>
            <p className="text-xs text-slate-500">Goal-oriented tracks with customized study materials and AI tutoring</p>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">No projects in this space yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
              Create a focused learning project to upload PDFs, interact with your grounded AI tutor, and practice adaptive quizzes.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                to={`/spaces/${spaceId}/projects/${proj.id}`}
                className="group relative bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white flex items-center justify-center transition-colors duration-200">
                        <FolderGit2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 text-base transition-colors duration-200">
                          {proj.name}
                        </h3>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                    {proj.description || "No description provided."}
                  </p>
                </div>

                <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-start gap-2.5">
                  <Target className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-indigo-700">Goal:</span> {proj.learningGoal || "Master key competencies"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Project Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Focused Project</h3>
                <p className="text-xs text-slate-500">Define a learning journey inside {space.name}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <span className="font-bold">•</span> {error}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. System Design & Distributed Systems"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Focus areas, key topics, or scope..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Target Learning Goal</label>
                <input
                  type="text"
                  required
                  value={learningGoal}
                  onChange={(e) => setLearningGoal(e.target.value)}
                  placeholder="e.g. Master sharding, consensus protocols, and caching"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
