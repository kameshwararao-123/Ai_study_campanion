import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Upload, FileText, CheckCircle2, Clock, AlertTriangle, Trash2, Eye, X, Layers, Sparkles } from "lucide-react";
import api from "../services/api.js";

export default function MaterialsHubPage() {
  const { projectId } = useParams();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [viewChunks, setViewChunks] = useState(null);
  const [activeChunkMaterial, setActiveChunkMaterial] = useState(null);

  const fetchMaterials = () => {
    api
      .get(`/materials/project/${projectId}`)
      .then((res) => {
        if (res.data.success) setMaterials(res.data.data.materials);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMaterials();
    // Poll for processing status updates
    const interval = setInterval(fetchMaterials, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("projectId", projectId);

    try {
      const res = await api.post("/materials/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res.data.success) throw new Error(res.data.error?.message || "Upload failed");

      setSelectedFile(null);
      fetchMaterials();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this material and its chunks?")) return;
    try {
      await api.delete(`/materials/${id}`);
      fetchMaterials();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInspectChunks = async (mat) => {
    try {
      setActiveChunkMaterial(mat);
      const res = await api.get(`/materials/${mat.id}/chunks`);
      if (res.data.success) setViewChunks(res.data.data.chunks);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Upload Box */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Learning Materials</h2>
            <p className="text-xs text-slate-500">
              Upload PDF lecture notes, documentation, or textbooks (Max 25MB). Chunks and concepts are extracted automatically.
            </p>
          </div>
        </div>

        {error && (
          <div className="my-4 p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full relative flex-1">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition cursor-pointer border border-slate-200 rounded-2xl p-1 bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            disabled={!selectedFile || uploading}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold rounded-2xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap active:scale-95"
          >
            <Upload className="h-4 w-4" />
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                Extracting &amp; Indexing...
              </span>
            ) : (
              "Upload & Extract"
            )}
          </button>
        </form>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Project Knowledge Base</h2>
            <p className="text-xs text-slate-500">Indexed documents powering the AI Tutor and Adaptive Quiz engine</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {materials.length} {materials.length === 1 ? "document" : "documents"}
          </span>
        </div>

        {loading ? (
          <div className="py-10 space-y-3">
            <div className="h-16 bg-slate-100 rounded-2xl animate-pulse"></div>
            <div className="h-16 bg-slate-100 rounded-2xl animate-pulse"></div>
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">No study materials uploaded</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Upload course syllabus, chapters, or lecture slides to enable targeted AI tutoring and adaptive practice quizzes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {materials.map((mat) => (
              <div key={mat.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-3 bg-indigo-50/70 rounded-2xl text-indigo-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 text-sm">{mat.filename}</div>
                    <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>{(mat.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{mat.pageCount || 0} Pages</span>
                      <span>•</span>
                      <span>{mat._count?.chunks || 0} Chunks</span>
                    </div>
                    {(() => {
                      let bd = null;
                      try {
                        bd = typeof mat.metadata === "string" ? JSON.parse(mat.metadata) : mat.metadata;
                      } catch (e) {}
                      if (!bd) return null;
                      return (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                            📝 {bd.text || 0} Text
                          </span>
                          {bd.tables > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 rounded-md text-[11px] font-bold">
                              📊 {bd.tables} Tables
                            </span>
                          )}
                          {bd.images > 0 && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200/60 rounded-md text-[11px] font-bold">
                              🖼️ {bd.images} Images
                            </span>
                          )}
                          {bd.diagrams > 0 && (
                            <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200/60 rounded-md text-[11px] font-bold">
                              📐 {bd.diagrams} Diagrams
                            </span>
                          )}
                          {bd.charts > 0 && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200/60 rounded-md text-[11px] font-bold">
                              📈 {bd.charts} Charts
                            </span>
                          )}
                          {bd.ocr > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-md text-[11px] font-bold">
                              📄 {bd.ocr} OCR
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Status Badges & Actions */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  {mat.status === "READY" && (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/50 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                    </span>
                  )}
                  {mat.status === "PROCESSING" && (
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200/50 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse shadow-xs">
                      <Clock className="h-3.5 w-3.5" /> Processing...
                    </span>
                  )}
                  {mat.status === "QUEUED" && (
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200/50 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                      <Clock className="h-3.5 w-3.5" /> Queued
                    </span>
                  )}
                  {mat.status === "FAILED" && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200/50 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-xs">
                        <AlertTriangle className="h-3.5 w-3.5" /> Failed
                      </span>
                      <button
                        onClick={async () => {
                          try {
                            await api.post(`/materials/${mat.id}/retry`);
                            fetchMaterials();
                          } catch (err) {
                            setError(err.response?.data?.error?.message || err.message);
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition flex items-center gap-1"
                        title="Retry Processing"
                      >
                        <Clock className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleInspectChunks(mat)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition rounded-xl hover:bg-indigo-50"
                    title="Inspect Chunks"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(mat.id)}
                    className="p-2 text-slate-400 hover:text-red-600 transition rounded-xl hover:bg-red-50"
                    title="Delete Material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chunks Inspector Modal */}
      {viewChunks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[82vh] flex flex-col p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Extracted Multi-Modal Chunks</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-sm">
                    {activeChunkMaterial?.filename} ({viewChunks.length} items)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setViewChunks(null);
                  setActiveChunkMaterial(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3.5 flex-1 pr-2 py-4">
              {viewChunks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No chunks extracted for this material.</div>
              ) : (
                viewChunks.map((c) => {
                  let pd = null;
                  try {
                    pd = typeof c.structuredData === "string" ? JSON.parse(c.structuredData) : c.structuredData;
                  } catch (e) {}

                  return (
                    <div key={c.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                            Chunk #{c.chunkIndex + 1}
                          </span>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${
                              c.contentType === "TABLE"
                                ? "bg-amber-100 text-amber-800"
                                : c.contentType === "DIAGRAM"
                                ? "bg-cyan-100 text-cyan-800"
                                : c.contentType === "IMAGE"
                                ? "bg-purple-100 text-purple-800"
                                : c.contentType === "OCR"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {c.contentType || "TEXT"}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                          Page {c.startPage}
                        </span>
                      </div>

                      {/* Render structured TABLE if present */}
                      {c.contentType === "TABLE" && pd?.headers && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs my-2">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                              <tr>
                                {pd.headers.map((h, i) => (
                                  <th key={i} className="px-3 py-1.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(pd.rows || []).map((r, ri) => (
                                <tr key={ri} className="hover:bg-slate-50/80">
                                  {r.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-1.5 border-r border-slate-200 last:border-r-0 whitespace-nowrap text-slate-700">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Render IMAGE / DIAGRAM / CHART visual if data URI is present */}
                      {(c.contentType === "IMAGE" || c.contentType === "DIAGRAM" || c.contentType === "CHART") && (pd?.originalImage || pd?.originalDiagram || pd?.originalChart) && (
                        <div className="rounded-xl border border-slate-200 bg-white p-2 flex justify-center max-h-56 overflow-hidden">
                          <img
                            src={pd.originalImage || pd.originalDiagram || pd.originalChart}
                            alt="Visual preview"
                            className="max-h-52 object-contain rounded-lg"
                          />
                        </div>
                      )}

                      <pre className="text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">{c.content}</pre>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
