import React, { useState } from "react";
import { useParams } from "react-router-dom";
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

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    setError("");
    setResults(null);
    setAnswers({});
    setCurrentStep(0);

    try {
      const res = await api.post("/quiz/generate", { projectId });
      if (!res.data.success) throw new Error(res.data.error?.message || "Failed to generate quiz");
      const newQuiz = res.data.data.quiz;
      if (!newQuiz || !Array.isArray(newQuiz.questions) || newQuiz.questions.length === 0) {
        throw new Error("Generated quiz contains no questions. Please try again.");
      }
      setQuiz(newQuiz);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectAnswer = (questionId, value) => {
    if (!questionId) return;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
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
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Initial State: No quiz started yet
  if (!quiz && !results) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="h-18 w-18 rounded-3xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center mx-auto mb-5 shadow-xl shadow-indigo-500/30 animate-float">
          <Award className="h-9 w-9" />
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3 border border-indigo-100">
          <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
          <span>Adaptive Assessment Engine</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Interactive Knowledge Check
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 mb-8 leading-relaxed max-w-md mx-auto">
          Challenge yourself with dynamic, AI-tailored questions adapted to your uploaded notes and current concept retention levels.
        </p>

        {/* Highlight Perks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 text-left">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Target className="w-4 h-4 text-indigo-600 mb-1.5" />
            <div className="text-xs font-bold text-slate-900">Personalized</div>
            <div className="text-[10px] text-slate-500">Targets weak spots</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Zap className="w-4 h-4 text-amber-500 mb-1.5" />
            <div className="text-xs font-bold text-slate-900">Instant Rubric</div>
            <div className="text-[10px] text-slate-500">Qualitative feedback</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <Flame className="w-4 h-4 text-rose-500 mb-1.5" />
            <div className="text-xs font-bold text-slate-900">Growth Score</div>
            <div className="text-[10px] text-slate-500">Updates mastery %</div>
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
    );
  }

  // 2. Results & Qualitative Feedback View
  if (results) {
    const submissionsList = Array.isArray(results)
      ? results
      : results.submissions || results.results || [];

    const totalScore =
      typeof results.percentage === "number"
        ? results.percentage
        : submissionsList.length > 0
        ? Math.round(
            submissionsList.reduce((acc, curr) => acc + (curr.scoreEarned || 0), 0) /
              submissionsList.length
          )
        : 0;

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
              Overall Accuracy &amp; Depth
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
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mb-6 leading-relaxed">
            Your concept mastery scores and growth trajectory have been automatically updated across the platform.
          </p>

          <button
            onClick={handleGenerateQuiz}
            disabled={generating}
            className="px-7 py-3.5 bg-white hover:bg-indigo-50 text-indigo-950 font-extrabold rounded-2xl text-xs sm:text-sm shadow-xl transition-all duration-200 inline-flex items-center gap-2 hover:scale-103 active:scale-95"
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
        </div>

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
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Question #{idx + 1}
                  </span>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      isUnanswered
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : sub.isCorrect
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {isUnanswered
                      ? "Unanswered (0%)"
                      : sub.isCorrect
                      ? "Proficient (100%)"
                      : "Needs Review (0%)"}
                  </span>
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

                {/* Qualitative Feedback / Explanation */}
                {(feedback || matchedQ?.explanation) && (
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
          <span className="text-[11px] font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full border border-slate-200/60">
            {currentQ.questionType === "OPEN_ENDED" ? "Open-Ended Response" : "Multiple Choice"}
          </span>
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
          onClick={() => setCurrentStep(safeStep - 1)}
          className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center gap-1.5"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        {safeStep < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(safeStep + 1)}
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
