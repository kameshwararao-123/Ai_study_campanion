import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Check,
  ChevronLeft,
  Trophy,
  Flame,
  Target,
  Zap,
  XCircle,
  HelpCircle as QuestionIcon,
  BookOpen,
  Lightbulb,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import api from "../services/api.js";

export default function AdaptiveQuizPage() {
  const { projectId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [projectMastery, setProjectMastery] = useState([]);
  const [loadingMastery, setLoadingMastery] = useState(false);
  const [savedSession, setSavedSession] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoadingMastery(true);
    api.get(`/mastery/${projectId}`)
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data?.data?.concepts)) {
          setProjectMastery(res.data.data.concepts);
        }
      })
      .catch((err) => console.warn("Failed to load project mastery:", err.message))
      .finally(() => setLoadingMastery(false));

    // Check for saved local progress (REQ-046: accidental reload resilience)
    try {
      const saved = localStorage.getItem(`quiz_progress_${projectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.quiz && Array.isArray(parsed.quiz.questions) && parsed.quiz.questions.length > 0) {
          setSavedSession(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to read saved quiz progress:", e);
    }
  }, [projectId]);

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    setError("");
    setResults(null);
    setAnswers({});
    setCurrentStep(0);
    localStorage.removeItem(`quiz_progress_${projectId}`);
    setSavedSession(null);

    try {
      const res = await api.post("/quiz/generate", { projectId });
      if (!res.data.success) throw new Error(res.data.error?.message || "Failed to generate quiz");
      const newQuiz = res.data.data.quiz;
      if (!newQuiz || !Array.isArray(newQuiz.questions) || newQuiz.questions.length === 0) {
        throw new Error("Generated quiz contains no questions. Please try again.");
      }
      setQuiz(newQuiz);
      localStorage.setItem(
        `quiz_progress_${projectId}`,
        JSON.stringify({ quiz: newQuiz, currentStep: 0, answers: {} })
      );
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleResumeSession = () => {
    if (!savedSession) return;
    setQuiz(savedSession.quiz);
    setCurrentStep(savedSession.currentStep || 0);
    setAnswers(savedSession.answers || {});
    setSavedSession(null);
  };

  const handleSelectAnswer = (questionId, value) => {
    if (!questionId) return;
    setAnswers((prev) => {
      const updated = { ...prev, [questionId]: value };
      try {
        if (quiz) {
          localStorage.setItem(
            `quiz_progress_${projectId}`,
            JSON.stringify({ quiz, currentStep, answers: updated })
          );
        }
      } catch (e) {}
      return updated;
    });
  };

  const handleStepChange = (newStep) => {
    setCurrentStep(newStep);
    try {
      if (quiz) {
        localStorage.setItem(
          `quiz_progress_${projectId}`,
          JSON.stringify({ quiz, currentStep: newStep, answers })
        );
      }
    } catch (e) {}
  };

  const questions = Array.isArray(quiz?.questions) ? quiz.questions : [];

  const handleSubmitQuiz = async () => {
    if (!quiz || !quiz.id) return;
    setSubmitting(true);
    setError("");

    // Submit all questions, providing empty string for any unanswered questions
    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      userAnswer: answers[q.id] || "",
    }));

    try {
      const res = await api.post(`/quiz/${quiz.id}/submit`, { answers: answersPayload });
      if (!res.data.success) throw new Error(res.data.error?.message || "Failed to submit quiz");
      setResults(res.data.data);
      localStorage.removeItem(`quiz_progress_${projectId}`);
      setSavedSession(null);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial State: No quiz started yet (Understand Current Mastery & Calibrated Targets)
  if (!quiz && !results) {
    const weakConcepts = projectMastery.filter((c) => c.masteryScore < 60 || c.trend === "REQUIRING_ATTENTION");
    const strongConcepts = projectMastery.filter((c) => c.masteryScore >= 75 || c.trend === "IMPROVING");

    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
        {/* Resume Active Session Banner if exists */}
        {savedSession && (
          <div className="bg-indigo-900/90 text-white rounded-3xl p-5 shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/30 flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="font-extrabold text-sm">Resume In-Progress Assessment</div>
                <div className="text-xs text-indigo-200">
                  Question {(savedSession.currentStep || 0) + 1} of {savedSession.quiz?.questions?.length || 0} saved
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleResumeSession}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-white hover:bg-indigo-50 text-indigo-950 font-bold rounded-xl text-xs transition shadow-sm"
              >
                Resume Session
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(`quiz_progress_${projectId}`);
                  setSavedSession(null);
                }}
                className="px-3 py-2.5 text-indigo-300 hover:text-white text-xs font-semibold"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="h-16 w-16 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30 animate-float">
            <Award className="h-8 w-8" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-100">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
            <span>Adaptive Assessment Engine (REQ-042 - REQ-049)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Interactive Knowledge Check
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed max-w-md mx-auto">
            Dynamic, AI-tailored questions adapted to your uploaded notes, previous mistakes, and current concept retention levels.
          </p>

          {/* Understand Current Mastery: Adaptive Diagnostic Overview (REQ-046) */}
          {projectMastery.length > 0 && (
            <div className="mb-6 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Adaptive Calibration Diagnostic</span>
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  {projectMastery.length} Concepts Tracked
                </span>
              </div>

              {/* Weak spots targeted for reinforcement */}
              {weakConcepts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                    <span>Priority Focus (Needs Practice):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {weakConcepts.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-amber-600">({Math.round(c.masteryScore)}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Proficient topics */}
              {strongConcepts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
                    <span>Advancing Concepts:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {strongConcepts.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>{c.name}</span>
                        <span className="text-[10px] font-mono text-emerald-600">({Math.round(c.masteryScore)}%)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Highlight Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Target className="w-4 h-4 text-indigo-600 mb-1.5" />
              <div className="text-xs font-bold text-slate-900">Multi-Signal Adaptive</div>
              <div className="text-[10px] text-slate-500">Calibrates to weak areas</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Zap className="w-4 h-4 text-amber-500 mb-1.5" />
              <div className="text-xs font-bold text-slate-900">Deep Rubric Feedback</div>
              <div className="text-[10px] text-slate-500">What was missed &amp; review tips</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <Flame className="w-4 h-4 text-rose-500 mb-1.5" />
              <div className="text-xs font-bold text-slate-900">Instant Growth Sync</div>
              <div className="text-[10px] text-slate-500">Immediate mastery update</div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 text-left flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGenerateQuiz}
            disabled={generating}
            className="px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold rounded-2xl text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-103 flex items-center justify-center gap-2.5 mx-auto disabled:opacity-50 disabled:hover:scale-100 active:scale-95"
          >
            {generating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Synthesizing Adaptive Quiz...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Start Assessment</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // 2. Results & Qualitative Feedback View
  if (results) {
    const submissionsList = Array.isArray(results)
      ? results
      : results.submissions || results.results || [];

    // Prefer the weighted (partial-credit) score so open-ended depth is reflected.
    const totalScore =
      typeof results.weightedPercentage === "number"
        ? results.weightedPercentage
        : typeof results.percentage === "number"
        ? results.percentage
        : submissionsList.length > 0
        ? Math.round(
            submissionsList.reduce((acc, curr) => acc + (curr.scoreEarned || 0), 0) /
              submissionsList.length
          )
        : 0;

    const accuracyPercentage =
      typeof results.percentage === "number" ? results.percentage : null;

    const conceptBreakdown = Array.isArray(results.conceptBreakdown)
      ? results.conceptBreakdown
      : [];

    const scoreOf = (sub) =>
      typeof sub.scoreEarned === "number"
        ? Math.round(sub.scoreEarned)
        : sub.isCorrect
        ? 100
        : 0;

    const labelOf = (score) =>
      score >= 85
        ? "Proficient"
        : score >= 70
        ? "Developing"
        : score >= 40
        ? "Needs Review"
        : "Insufficient";

    const correctCount =
      typeof results.correct === "number"
        ? results.correct
        : submissionsList.filter((s) => s.isCorrect).length;

    const unansweredCount =
      typeof results.unanswered === "number"
        ? results.unanswered
        : submissionsList.filter(
            (s) => s.isUnanswered || s.userAnswer === "Unanswered" || !s.userAnswer
          ).length;

    const incorrectCount =
      typeof results.incorrect === "number"
        ? results.incorrect
        : Math.max(0, submissionsList.length - correctCount - unansweredCount);

    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
        {/* Celebration Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 rounded-3xl p-7 sm:p-9 text-white shadow-2xl text-center border border-indigo-500/20">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-600 text-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/30 animate-bounce">
            <Trophy className="h-10 w-10" />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-emerald-300 bg-emerald-500/20 px-3.5 py-1.5 rounded-full border border-emerald-500/30">
            Assessment Completed
          </span>

          <div className="mt-4 mb-2">
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-white">
              {totalScore}%
            </div>
            <p className="text-xs text-indigo-200 font-semibold mt-1 uppercase tracking-wider">
              Overall Mastery Score
            </p>
          </div>

          {/* Results Summary Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3 mb-4">
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {correctCount} Correct
            </span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {incorrectCount} Incorrect
            </span>
            {unansweredCount > 0 && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {unansweredCount} Unanswered
              </span>
            )}
            {accuracyPercentage !== null && accuracyPercentage !== totalScore && (
              <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                {accuracyPercentage}% Fully Correct
              </span>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
            Your concept mastery scores and growth trajectory have been automatically updated across the platform.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleGenerateQuiz}
              disabled={generating}
              className="px-6 py-3 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-xl transition-all duration-200 inline-flex items-center gap-2 hover:scale-103 active:scale-95"
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating New Quiz...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 text-indigo-600" />
                  <span>Practice Another Quiz</span>
                </>
              )}
            </button>

            <Link
              to={`../growth`}
              className="px-6 py-3 bg-indigo-800/60 hover:bg-indigo-700/80 text-white font-bold rounded-2xl text-xs sm:text-sm border border-indigo-400/30 transition-all duration-200 inline-flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>View Growth Trajectory</span>
            </Link>
          </div>
        </div>

        {/* Per-Topic Mastery Breakdown */}
        {conceptBreakdown.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Topic Coverage ({conceptBreakdown.length} topics assessed):
            </h3>
            <div className="space-y-2.5">
              {conceptBreakdown.map((topic, idx) => (
                <div key={topic.conceptId || topic.conceptName || idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{topic.conceptName}</span>
                    <span
                      className={`font-extrabold ${
                        topic.percentage >= 70 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {topic.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        topic.percentage >= 70
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : "bg-gradient-to-r from-rose-500 to-amber-500"
                      }`}
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detailed Question Review Cards */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
            Question Feedback &amp; Answer Key:
          </h3>
          {submissionsList.map((sub, idx) => {
            let feedback = sub.evalFeedback;
            if (typeof feedback === "string") {
              try {
                feedback = JSON.parse(feedback);
              } catch (e) {}
            }

            const matchedQ = questions.find((q) => q.id === sub.questionId);
            const questionPrompt = sub.prompt || matchedQ?.prompt || `Question #${idx + 1}`;
            const isUnanswered = sub.isUnanswered || sub.userAnswer === "Unanswered" || !sub.userAnswer;

            return (
              <div
                key={sub.questionId || idx}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0">
                      Question #{idx + 1}
                    </span>
                    {sub.conceptName && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 truncate">
                        {sub.conceptName}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const score = scoreOf(sub);
                    const tone = isUnanswered
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : score >= 70
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : score >= 40
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200";
                    return (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${tone}`}>
                        {isUnanswered ? "Unanswered (0%)" : `${labelOf(score)} (${score}%)`}
                      </span>
                    );
                  })()}
                </div>

                {/* Prompt */}
                <div className="font-bold text-slate-900 text-xs sm:text-sm">
                  {questionPrompt}
                </div>

                {/* Learner's Response */}
                <div className="text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-400 block uppercase text-[10px]">
                    Your Response:
                  </span>
                  <span
                    className={`font-semibold ${
                      isUnanswered
                        ? "text-amber-700 italic"
                        : sub.isCorrect
                        ? "text-emerald-800"
                        : "text-rose-800"
                    }`}
                  >
                    {isUnanswered ? "No answer submitted (Skipped)" : sub.userAnswer}
                  </span>
                </div>

                {/* Correct Answer (Shown if incorrect or unanswered) */}
                {(!sub.isCorrect || isUnanswered) && (sub.correctAnswer || feedback?.correctAnswer) && (
                  <div className="text-xs bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100">
                    <span className="font-bold text-emerald-700 block uppercase text-[10px] mb-0.5">
                      Correct Answer:
                    </span>
                    <span className="font-bold text-emerald-950">
                      {sub.correctAnswer || feedback?.correctAnswer}
                    </span>
                  </div>
                )}

                {/* Qualitative Feedback / Explanation (REQ-047, REQ-048) */}
                {(feedback || matchedQ?.explanation) && (
                  <div className="space-y-2">
                    {/* Key concepts covered tags */}
                    {Array.isArray(feedback?.keyConceptsCovered) && feedback.keyConceptsCovered.length > 0 && (
                      <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-emerald-800 shrink-0">Concepts Covered:</span>
                        {feedback.keyConceptsCovered.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3 text-emerald-600" />
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Missing concepts tags */}
                    {Array.isArray(feedback?.missingConcepts) && feedback.missingConcepts.length > 0 && (
                      <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="font-bold text-rose-800 shrink-0">Missing Concepts:</span>
                        {feedback.missingConcepts.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Study Suggestion Tip */}
                    {feedback?.reviewSuggestion && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-extrabold">Study Suggestion: </span>
                          <span>{feedback.reviewSuggestion}</span>
                        </div>
                      </div>
                    )}

                    {/* Tutor Rationale & Explanation */}
                    <div className="text-xs text-indigo-950 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
                      <span className="font-bold text-indigo-600 block mb-1 text-[10px] uppercase">
                        Tutor Rationale &amp; Explanation:
                      </span>
                      <p className="leading-relaxed font-normal">
                        {typeof feedback === "string"
                          ? feedback
                          : feedback?.comments ||
                            feedback?.explanation ||
                            feedback?.feedback ||
                            feedback?.understanding ||
                            matchedQ?.explanation ||
                            JSON.stringify(feedback)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. Question Data Guard
  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs">
        <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">No Questions Available</h2>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          The selected quiz does not contain any questions. Please generate a new adaptive assessment.
        </p>
        <button
          onClick={handleGenerateQuiz}
          disabled={generating}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow transition inline-flex items-center gap-2"
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span>Generate New Quiz</span>
        </button>
      </div>
    );
  }

  // 4. Safe Question Runner
  const safeStep = Math.min(Math.max(0, currentStep), questions.length - 1);
  const currentQ = questions[safeStep];

  let options = [];
  try {
    if (currentQ?.options) {
      options = typeof currentQ.options === "string" ? JSON.parse(currentQ.options) : currentQ.options;
      if (!Array.isArray(options)) options = [];
    }
  } catch (e) {
    options = [];
  }

  const currentAnswer = answers[currentQ.id] || "";
  const isAnswerSelected = Boolean(currentAnswer && currentAnswer.trim().length > 0);
  const progressPercent = Math.round(((safeStep + 1) / questions.length) * 100);
  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl">
      {/* Top Header & Progress Bar */}
      <div className="border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-xs">
              Question {safeStep + 1} of {questions.length}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              ({progressPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {currentQ.conceptName && (
              <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60 max-w-[160px] truncate">
                {currentQ.conceptName}
              </span>
            )}
            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60">
              {currentQ.questionType === "OPEN_ENDED" ? "Open-Ended" : "MCQ"}
            </span>
            {currentQ.difficultyScore !== undefined && (
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                currentQ.difficultyScore >= 0.7
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : currentQ.difficultyScore >= 0.5
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {currentQ.difficultyScore >= 0.7 ? "Advanced" : currentQ.difficultyScore >= 0.5 ? "Intermediate" : "Foundational"}
              </span>
            )}
          </div>
        </div>

        {/* Progress Meter with Gradient Glow */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Content */}
      <div className="mb-8">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed mb-6">
          {currentQ.prompt}
        </h3>

        {/* Multiple Choice Options */}
        {currentQ.questionType === "MCQ" && options.length > 0 ? (
          <div className="space-y-3">
            {options.map((opt, i) => {
              const optVal =
                typeof opt === "object" && opt?.value
                  ? String(opt.value).trim().toUpperCase()
                  : optionLetters[i] || String(i + 1);

              const optLabel =
                typeof opt === "object"
                  ? (opt.label || opt.text || opt.title || opt.value || String(opt)).trim()
                  : (typeof opt === "string" ? opt : String(opt)).trim();

              const isSelected =
                answers[currentQ.id] === optVal ||
                answers[currentQ.id] === optLabel;

              return (
                <button
                  key={optVal || i}
                  type="button"
                  onClick={() => handleSelectAnswer(currentQ.id, optVal)}
                  className={`w-full text-left p-4.5 rounded-2xl border text-xs sm:text-sm font-medium transition-all duration-150 flex items-center justify-between group ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-md ring-2 ring-indigo-500/20"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {optVal}
                    </span>
                    <span className="leading-snug">{optLabel}</span>
                  </div>

                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 group-hover:border-slate-400"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* Open Ended Response Editor */
          <div>
            <textarea
              rows={4}
              value={currentAnswer}
              onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
              placeholder="Write your explanation or reasoning here..."
              className="w-full p-4 rounded-2xl border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-relaxed transition bg-slate-50/50 focus:bg-white"
            />
            <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
              <span>Ground your explanation in core principles</span>
              <span className="font-mono">{currentAnswer.length} characters</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex justify-between items-center pt-5 border-t border-slate-100">
        <button
          type="button"
          disabled={safeStep === 0}
          onClick={() => handleStepChange(safeStep - 1)}
          className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {safeStep < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => handleStepChange(safeStep + 1)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-102 flex items-center gap-2"
          >
            <span>{isAnswerSelected ? "Next Question" : "Skip / Next"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmitQuiz}
            className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-102 disabled:opacity-40 disabled:hover:scale-100 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <span>Submit Assessment</span>
                <Check className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
