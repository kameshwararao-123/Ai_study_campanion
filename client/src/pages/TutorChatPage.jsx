import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Send,
  Sparkles,
  BookOpen,
  X,
  Bot,
  User,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  FileText,
  ChevronRight,
  RefreshCw,
  Zap,
  Globe,
  Search,
  CheckCircle,
} from "lucide-react";
import api from "../services/api.js";

// Clean formatter for AI responses
function formatMessage(text) {
  if (!text) return "";
  const paragraphs = text.split(/\n\n+/);
  return paragraphs
    .map((para) => {
      const lines = para.split("\n");
      const formattedLines = lines.map((line) => {
        let formatted = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        formatted = formatted.replace(/__(.+?)__/g, "<strong>$1</strong>");
        formatted = formatted.replace(
          /`([^`]+)`/g,
          '<code class="px-1.5 py-0.5 bg-indigo-50/70 border border-indigo-200/60 rounded text-xs font-mono text-indigo-700">$1</code>'
        );

        if (/^\s*[•\-\*]\s/.test(formatted)) {
          formatted = formatted.replace(/^\s*[•\-\*]\s+/, "");
          return `<li class="ml-4 list-disc text-slate-800 my-0.5">${formatted}</li>`;
        }
        if (/^\s*\d+[\.\)]\s/.test(formatted)) {
          formatted = formatted.replace(/^\s*\d+[\.\)]\s+/, "");
          return `<li class="ml-4 list-decimal text-slate-800 my-0.5">${formatted}</li>`;
        }
        return formatted;
      });

      const hasListItems = formattedLines.some((l) => l.includes("<li"));
      if (hasListItems) {
        return `<ul class="space-y-1 my-2">${formattedLines.join("")}</ul>`;
      }
      return `<p class="mb-2 leading-relaxed text-slate-800">${formattedLines.join("<br/>")}</p>`;
    })
    .join("");
}

export default function TutorChatPage() {
  const { projectId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("NORMAL");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [drawerCitation, setDrawerCitation] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (!projectId) return;
    api
      .get(`/tutor/sessions/project/${projectId}`)
      .then(async (res) => {
        if (res.data.success && res.data.data.sessions && res.data.data.sessions.length > 0) {
          const latestSession = res.data.data.sessions[0];
          setSessionId(latestSession.id);
          const msgRes = await api.get(`/tutor/sessions/${latestSession.id}/messages`);
          if (msgRes.data.success && msgRes.data.data.messages) {
            setMessages(msgRes.data.data.messages);
          }
        }
      })
      .catch((err) => console.error("Error loading chat history:", err));
  }, [projectId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = {
      id: "temp-" + Date.now(),
      sender: "USER",
      content: input,
      mode,
    };

    setMessages((prev) => [...prev, userMsg]);
    const messageToSend = input;
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/tutor/chat", {
        projectId,
        sessionId,
        content: messageToSend,
        mode,
      });

      const data = res.data;
      if (!data.success) throw new Error(data.error?.message || "Tutor request failed");

      setSessionId(data.data.sessionId);
      setMessages((prev) => [...prev, data.data.message]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ASSISTANT",
          content: "Sorry, I had trouble processing that request. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestionText) => {
    setInput(suggestionText);
  };

  const modes = [
    { id: "NORMAL", label: "Standard Q&A", icon: Zap },
    { id: "EXPLAIN", label: "ELI5 Simple", icon: Lightbulb },
    { id: "EXAMPLE", label: "Real-World Examples", icon: Globe },
    { id: "EXPLORE", label: "Deep Dive", icon: Search },
    { id: "REVISION", label: "Revision Summary", icon: CheckCircle },
  ];

  const suggestions = [
    { text: "Explain this concept simply (ELI5)", icon: Lightbulb },
    { text: "Can you give me a real-world example?", icon: Globe },
    { text: "Quiz me on this topic with a question", icon: HelpCircle },
    { text: "What are the common pitfalls or mistakes?", icon: AlertTriangle },
  ];

  return (
    <div className="flex flex-col h-[78vh] bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden relative">
      {/* 1. Tutor Header Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="h-5 w-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-slate-900 leading-tight">AI Personal Tutor</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold">
                Online &amp; Grounded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Verified top-1 citations from your uploaded materials
            </p>
          </div>
        </div>

        {/* Mode Selector Segmented Bar */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1.5 rounded-2xl overflow-x-auto max-w-full border border-slate-200/60">
          {modes.map((m) => {
            const ModeIcon = m.icon;
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 scale-102"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                }`}
              >
                <ModeIcon className="w-3.5 h-3.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Messages Scroll Area */}
      <div className="flex-1 p-6 sm:p-7 overflow-y-auto space-y-6 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 text-indigo-600 flex items-center justify-center shadow-lg ring-8 ring-indigo-50/80 animate-float">
              <Bot className="h-8 w-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-slate-900">How can I assist your learning today?</h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
                Ask questions about your uploaded materials, request intuitive real-world analogies, or explore core concepts step-by-step.
              </p>
            </div>

            {/* Initial suggestion chips */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3">
              {suggestions.map((s, idx) => {
                const SIcon = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="p-3.5 bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md hover:bg-indigo-50/30 rounded-2xl text-left text-xs font-semibold text-slate-700 transition-all flex items-center gap-2.5 group"
                  >
                    <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                      <SIcon className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate">{s.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "USER";
            let citations = [];
            try {
              citations = Array.isArray(msg.citations)
                ? msg.citations
                : msg.citations
                ? JSON.parse(msg.citations)
                : [];
            } catch (e) {
              citations = [];
            }
            let metadata = null;
            try {
              metadata = typeof msg.metadata === "string" ? JSON.parse(msg.metadata) : msg.metadata;
            } catch (e) {
              metadata = msg.metadata;
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 items-start ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 mt-1">
                    <Bot className="h-4.5 w-4.5" />
                  </div>
                )}

                <div
                  className={`max-w-2xl rounded-3xl p-5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                    isUser
                      ? "bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white rounded-tr-xs shadow-indigo-600/20"
                      : "bg-white border border-slate-200/80 text-slate-900 rounded-tl-xs hover:border-slate-300"
                  }`}
                >
                  {!isUser && metadata?.evidenceDecision === "PARTIAL" && (
                    <div className="mb-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                        ⚠️ Partially Supported in Learning Materials
                      </span>
                    </div>
                  )}

                  {isUser ? (
                    <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-slate-800 font-normal"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  )}

                  {/* Grounded Multi-Modal Source Citations */}
                  {citations.length > 0 && (
                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Grounded Evidence:
                      </span>
                      {citations.map((cit, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => setDrawerCitation(cit)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/80 hover:border-indigo-300 text-indigo-700 text-xs font-bold rounded-xl transition group shadow-2xs"
                          title={`Click to inspect evidence for ${cit.label || cit.documentTitle}`}
                        >
                          <BookOpen className="h-3.5 w-3.5 text-indigo-600 group-hover:scale-110 transition-transform" />
                          <span>{cit.label || `📄 ${cit.documentTitle} — Page ${cit.pageNumber}`}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-950 text-white flex items-center justify-center shrink-0 shadow-md mt-1 font-bold text-xs border border-slate-700">
                    <User className="h-4.5 w-4.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Typing Loading Indicator */}
        {loading && (
          <div className="flex gap-3.5 items-start justify-start">
            <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-3xl rounded-tl-xs px-5 py-3.5 shadow-sm flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              <span className="text-xs text-slate-500 font-semibold">Retrieving project knowledge &amp; verifying citations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Suggestion Chips Bar */}
      <div className="px-5 py-2.5 border-t border-slate-100 bg-white/95 backdrop-blur-md flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
          Quick Prompts:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSuggestionClick(s.text)}
            className="px-3 py-1 rounded-xl bg-slate-100/80 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200/60 text-xs font-semibold whitespace-nowrap transition-colors duration-150"
          >
            {s.text}
          </button>
        ))}
      </div>

      {/* 4. Chat Input Form Dock */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 border-t border-slate-100 flex items-center gap-3 bg-white"
      >
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask strictly about your uploaded material (${modes.find((m) => m.id === mode)?.label} mode)...`}
            className="w-full pl-5 pr-12 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:bg-white transition"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl shadow-md shadow-indigo-600/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 active:scale-95"
          title="Send message"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>

      {/* 5. Slide-Over Source Evidence Viewer */}
      {drawerCitation && (
        <div className="absolute inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  {drawerCitation.contentType === "TABLE" ? "📊" : drawerCitation.contentType === "DIAGRAM" ? "📐" : drawerCitation.contentType === "CHART" ? "📈" : drawerCitation.contentType === "OCR" ? "📄" : drawerCitation.contentType === "IMAGE" ? "🖼️" : "📖"}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Source Evidence Viewer</h4>
                  <span className="text-[11px] text-slate-500 font-medium">Validated Grounded Knowledge Item</span>
                </div>
              </div>
              <button
                onClick={() => setDrawerCitation(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto text-xs pr-1">
              {/* Provenance Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">
                    Document Source
                  </span>
                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {drawerCitation.contentType || "TEXT"}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs">{drawerCitation.documentTitle}</div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-block font-semibold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md text-[11px]">
                    Page {drawerCitation.pageNumber}
                  </span>
                  {drawerCitation.tableId && (
                    <span className="inline-block font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                      {drawerCitation.tableId}
                    </span>
                  )}
                  {drawerCitation.diagramId && (
                    <span className="inline-block font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md text-[11px]">
                      {drawerCitation.diagramId}
                    </span>
                  )}
                  {drawerCitation.chartId && (
                    <span className="inline-block font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md text-[11px]">
                      {drawerCitation.chartId}
                    </span>
                  )}
                  {drawerCitation.ocrConfidence && (
                    <span className="inline-block font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                      OCR Confidence: {typeof drawerCitation.ocrConfidence === "number" ? drawerCitation.ocrConfidence.toFixed(1) : drawerCitation.ocrConfidence}%
                    </span>
                  )}
                </div>
              </div>

              {/* TABLE View */}
              {drawerCitation.contentType === "TABLE" && drawerCitation.structuredData?.headers && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Structured Table Data
                  </span>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                        <tr>
                          {drawerCitation.structuredData.headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 border-r border-slate-200 last:border-r-0 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {(drawerCitation.structuredData.rows || []).map((r, ri) => (
                          <tr key={ri} className="hover:bg-slate-50/80">
                            {r.map((c, ci) => (
                              <td key={ci} className="px-3 py-2 border-r border-slate-200 last:border-r-0 whitespace-nowrap text-slate-700 font-medium">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* DIAGRAM / IMAGE / CHART View */}
              {(drawerCitation.contentType === "DIAGRAM" || drawerCitation.contentType === "IMAGE" || drawerCitation.contentType === "CHART") && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider block">
                    Visual Evidence
                  </span>
                  {(drawerCitation.structuredData?.originalDiagram || drawerCitation.structuredData?.originalImage || drawerCitation.structuredData?.originalChart) && (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center max-h-56 p-2">
                      <img
                        src={drawerCitation.structuredData.originalDiagram || drawerCitation.structuredData.originalImage || drawerCitation.structuredData.originalChart}
                        alt="Visual evidence"
                        className="max-h-52 object-contain rounded-xl"
                      />
                    </div>
                  )}
                  {drawerCitation.structuredData?.visualDescription && (
                    <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100 text-violet-900 text-xs leading-relaxed font-medium">
                      {drawerCitation.structuredData.visualDescription}
                    </div>
                  )}
                </div>
              )}

              {/* Grounding Excerpt */}
              <div>
                <span className="font-bold text-slate-700 block mb-2 text-[11px] uppercase tracking-wider">
                  Raw Grounded Content
                </span>
                <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100 leading-relaxed text-slate-800 text-xs whitespace-pre-wrap font-mono">
                  {drawerCitation.excerpt || drawerCitation.content}
                </div>
              </div>
            </div>

            <button
              onClick={() => setDrawerCitation(null)}
              className="w-full mt-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition active:scale-98 shadow-md"
            >
              Close Evidence Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
