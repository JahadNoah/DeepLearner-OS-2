import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { HelpCircle, RotateCcw, Home, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const quiz = location.state?.quiz;
  const summary = location.state?.summary;
  const idRingkasan = quiz?.idRingkasan;
  const [questions, setQuestions] = useState(quiz?.soalanKuiz || []);
  const [enriching, setEnriching] = useState(false);
  const pollRef = useRef(null);

  // sessionStorage key based on first question as a stable ID
  const STORAGE_KEY = `quiz_state_${questions[0]?.idKuiz || "active"}`;
  const QUESTIONS_KEY = `quiz_questions_${questions[0]?.idKuiz || "active"}`;

  // Persist questions so they survive a hard refresh
  useEffect(() => {
    if (questions.length > 0) {
      try { sessionStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions)); } catch {}
    }
  }, [QUESTIONS_KEY, questions.length]);

  // Poll /api/quiz-status until explanations are enriched, then re-fetch from Firestore
  useEffect(() => {
    if (!idRingkasan || questions.length === 0) return;
    const needsPoll = questions.some(
      q => !q.penjelasan?.trim() ||
           q.penjelasan.includes("Jawapan betul ialah") ||
           q.penjelasan.includes("The correct answer is") ||
           q.status === "enriching"
    );
    if (!needsPoll) return;

    setEnriching(true);
    let attempts = 0;
    const MAX_ATTEMPTS = 24; // 2 min max (24 × 5s)

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${API_URL}/quiz-status/${idRingkasan}`);
        const data = await res.json();
        if (data.status === "ready" || attempts >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current);
          setEnriching(false);
          // Re-fetch updated questions from Firestore
          const snap = await getDocs(
            query(collection(db, "kuiz"), where("idRingkasan", "==", idRingkasan))
          );
          const updated = snap.docs.map(d => d.data());
          if (updated.length > 0) setQuestions(updated);
        }
      } catch {
        if (attempts >= MAX_ATTEMPTS) {
          clearInterval(pollRef.current);
          setEnriching(false);
        }
      }
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [idRingkasan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hydrate state from sessionStorage on mount
  const savedState = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"); } catch { return null; }
  })();

  const [current, setCurrent] = useState(savedState?.current ?? 0);
  const [selected, setSelected] = useState(savedState?.selected ?? null);
  const [answered, setAnswered] = useState(savedState?.answered ?? false);
  const [score, setScore] = useState(savedState?.score ?? 0);
  const [done, setDone] = useState(savedState?.done ?? false);
  const [results, setResults] = useState(savedState?.results ?? []);

  // Persist state on every change
  useEffect(() => {
    if (questions.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ current, selected, answered, score, done, results }));
      } catch {}
    }
  }, [STORAGE_KEY, current, selected, answered, score, done, results, questions.length]);

  if (!quiz || questions.length === 0) {
    return (
      <div className="proto-content">
        <div className="proto-card" style={{ maxWidth: "440px", margin: "56px auto", textAlign: "center", padding: "48px 40px" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--clay-accent)", color: "var(--clay-on-accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <HelpCircle size={26} />
          </div>
          <h2 style={{ fontFamily: "var(--clay-font-head)", fontSize: "18px", fontWeight: 700, color: "var(--clay-text)", margin: "0 0 8px" }}>
            {t(lang, "quiz.notFound")}
          </h2>
          <p style={{ color: "var(--clay-text-sub)", fontSize: "13px", lineHeight: 1.6, maxWidth: "320px", margin: "0 auto 24px" }}>
            {t(lang, "proto.notFoundHint")}
          </p>
          <button className="proto-btn proto-btn-primary" onClick={() => navigate("/input")}>
            {t(lang, "quiz.backBtn")}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const labels = ["A", "B", "C", "D"];

  const handleSelect = (option) => {
    if (answered) return;
    setSelected(option);
    setAnswered(true);
    const correct = option === q.jawapanBetul;
    if (correct) setScore((s) => s + 1);
    setResults((prev) => [
      ...prev,
      { soalan: q.soalan, pilihan: option, jawapan: q.jawapanBetul, penjelasan: q.penjelasan, correct },
    ]);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const handleRetry = () => {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setAnswered(false);
    setDone(false);
    setResults([]);
  };

  const getOptionClass = (option) => {
    if (!answered) return "";
    if (option === q.jawapanBetul) return "correct";
    if (option === selected && option !== q.jawapanBetul) return "wrong";
    return "";
  };

  const percentage = Math.round((score / questions.length) * 100);
  const progressWidth = ((current + (answered ? 1 : 0)) / questions.length) * 100;

  // Ring circumference for r=40: 2π×40 ≈ 251
  const CIRC = 251;
  const ringOffset = CIRC - (percentage / 100) * CIRC;

  // Grade
  const gradeKey = percentage >= 80
    ? "proto.gradeExcellent"
    : percentage >= 50
    ? "proto.gradeGood"
    : "proto.gradeNeedsReview";
  const gradeClass = percentage >= 80 ? "excellent" : percentage >= 50 ? "good" : "review";

  // ─── Results Screen ───────────────────────────────────────
  if (done) {
    return (
      <>
        <div className="proto-content" style={{ maxWidth: "640px", margin: "0 auto" }}>

          {/* Congratulations Card */}
          <div className="proto-card" style={{ textAlign: "center", marginBottom: "20px", padding: "32px" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🎉</div>
            <h1 style={{
              fontFamily: "var(--proto-font)", fontSize: "22px", fontWeight: 700,
              color: "var(--proto-text)", marginBottom: "6px",
            }}>
              {t(lang, "proto.congratulations")}
            </h1>
            <p style={{ color: "var(--proto-text-2)", marginBottom: "24px", fontSize: "14px" }}>
              {t(lang, "quiz.completedMsg")}
            </p>

            {/* Score Ring */}
            <div className="proto-score-ring-wrap">
              <div className="proto-score-ring">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle className="proto-score-ring-bg" cx="60" cy="60" r="40" />
                  <circle
                    className="proto-score-ring-fill"
                    cx="60" cy="60" r="40"
                    style={{ strokeDashoffset: ringOffset }}
                  />
                </svg>
                <div className="proto-score-ring-text">
                  <span className="proto-score-ring-pct">{percentage}%</span>
                  <span className="proto-score-ring-sub">{score}/{questions.length}</span>
                </div>
              </div>

              {/* Grade chip */}
              <span className={`proto-grade-chip ${gradeClass}`}>
                {t(lang, gradeKey)}
              </span>

              <div style={{ fontSize: "13px", color: "var(--proto-text-2)" }}>
                {t(lang, "quiz.scoreSummary", { score, total: questions.length })}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button className="proto-btn-outline" onClick={handleRetry}>
                <RotateCcw size={14} /> {t(lang, "proto.retryQuiz")}
              </button>
              {summary && (
                <button
                  className="proto-btn-outline"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft size={14} /> {t(lang, "proto.backToSummary")}
                </button>
              )}
              <Link to="/app" className="proto-btn-primary" style={{ textDecoration: "none" }}>
                <Home size={14} /> {t(lang, "quiz.homeBtn")}
              </Link>
            </div>
          </div>

          {/* Results Breakdown */}
          <div className="proto-card">
            <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "16px" }}>
              {t(lang, "quiz.resultsHeading")}
            </div>

            {results.map((r, i) => (
              <div key={i} className={`proto-result-item ${r.correct ? "correct" : "wrong"}`}>
                <div className={`proto-result-icon ${r.correct ? "correct" : "wrong"}`}>
                  {r.correct ? "✓" : "✗"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--proto-text)", marginBottom: "4px" }}>
                    {t(lang, "quiz.questionLabel", { n: i + 1 })}: {r.soalan.length > 80 ? r.soalan.slice(0, 80) + "…" : r.soalan}
                  </div>
                  <div style={{ fontSize: "12px", color: r.correct ? "#00e676" : "var(--proto-text-2)" }}>
                    {t(lang, "quiz.correctAnswer", { answer: r.jawapan })}
                  </div>
                  {!r.correct && r.penjelasan && (
                    <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginTop: "4px" }}>
                      💡 {r.penjelasan}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  // ─── Quiz Screen ──────────────────────────────────────────
  return (
    <>
      <div className="proto-content" style={{ maxWidth: "700px", margin: "0 auto" }}>
        {/* Enrichment banner */}
        {enriching && (
          <div style={{
            background: "var(--clay-primary-glow)", border: "1px solid var(--clay-primary-deep)",
            borderRadius: "10px", padding: "10px 16px", marginBottom: "12px",
            fontSize: "12px", color: "var(--clay-text)", display: "flex", alignItems: "center", gap: "8px"
          }}>
            <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
            {lang === "ms" ? "AI sedang memperkaya penjelasan..." : "AI is enriching explanations..."}
          </div>
        )}
        {/* Quiz Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <HelpCircle size={24} style={{ color: "var(--amber)" }} />
          <h1 style={{
            fontFamily: "var(--proto-font)", fontSize: "24px",
            fontWeight: 700, color: "var(--proto-text)",
          }}>
            {t(lang, "quiz.heading")}
          </h1>
        </div>

        {/* Question Counter + Progress */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <div className="proto-quiz-counter">
            {t(lang, "quiz.questionLabel", { n: current + 1 })} {t(lang, "proto.of")} {questions.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--amber)", fontWeight: 700 }}>
            {score} {t(lang, "proto.correct")}
          </div>
        </div>

        <div className="proto-quiz-progress-bar" style={{ marginBottom: "20px" }}>
          <div className="proto-quiz-progress-fill" style={{ width: `${progressWidth}%` }} />
        </div>

        {/* Question Card */}
        <div className="proto-card">
          <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-3)", marginBottom: "12px" }}>
            {t(lang, "proto.question")} {current + 1}
          </div>
          <div style={{
            fontSize: "16px", fontWeight: 600, color: "var(--proto-text)",
            lineHeight: 1.6, marginBottom: "24px", whiteSpace: "pre-line",
          }}>
            {q.soalan}
          </div>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {q.pilihanJawapan.map((option, i) => (
              <div
                key={i}
                className={`proto-quiz-option ${getOptionClass(option)} ${selected === option ? "selected" : ""}`}
                onClick={() => handleSelect(option)}
                style={{ cursor: answered ? "default" : "pointer" }}
              >
                <span className="proto-quiz-letter-badge">{labels[i]}</span>
                <span style={{ flex: 1, fontSize: "14px" }}>{option}</span>
                {answered && option === q.jawapanBetul && (
                  <CheckCircle size={18} style={{ color: "#00e676" }} />
                )}
                {answered && option === selected && option !== q.jawapanBetul && (
                  <XCircle size={18} style={{ color: "#f44336" }} />
                )}
              </div>
            ))}
          </div>

          {/* Feedback & Explanation */}
          {answered && (
            <>
              {/* Feedback Message */}
              <div style={{
                marginTop: "20px",
                padding: "14px 16px",
                borderRadius: "10px",
                background: selected === q.jawapanBetul ? "rgba(0,230,118,0.1)" : "rgba(244,67,54,0.1)",
                border: `1px solid ${selected === q.jawapanBetul ? "#00e676" : "#f44336"}`,
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                {selected === q.jawapanBetul ? (
                  <>
                    <CheckCircle size={20} style={{ color: "#00e676" }} />
                    <span style={{ fontSize: "14px", fontWeight: 600, color: "#00e676" }}>
                      {t(lang, "proto.correct")}!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={20} style={{ color: "#f44336" }} />
                    <div>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#f44336" }}>
                        {t(lang, "proto.wrong")}
                      </span>
                      <div style={{ fontSize: "12px", color: "var(--proto-text-2)", marginTop: "2px" }}>
                        {t(lang, "quiz.correctAnswer", { answer: q.jawapanBetul })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Explanation */}
              {q.penjelasan && (
                <div style={{
                  marginTop: "12px",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  background: "var(--proto-surface2)",
                  border: "1px solid var(--proto-border)",
                  fontSize: "13px",
                  color: "var(--proto-text-2)",
                  lineHeight: 1.6,
                }}>
                  <strong style={{ color: "var(--amber)" }}>{t(lang, "quiz.explanation")}</strong> {q.penjelasan}
                </div>
              )}

              {/* Next Button */}
              <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                <button className="proto-btn-primary" onClick={handleNext}>
                  {current + 1 >= questions.length ? t(lang, "quiz.finishBtn") : t(lang, "proto.nextQuestion")} →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
