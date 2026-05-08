import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { TopbarTabs } from "../components/ui/TopbarTabs";
import { Sparkles, Download, Archive, Target, FileText, Zap } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Shared 3-step progress indicator */
function StepIndicator({ current, lang }) {
  const steps = [
    lang === "ms" ? "Input" : "Input",
    lang === "ms" ? "Transkripsi" : "Transcript",
    lang === "ms" ? "Ringkasan" : "Summary",
  ];
  return (
    <div className="proto-step-indicator">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
            <div className="proto-step-item">
              <div className={`proto-step-circle ${state}`}>
                {state === "done" ? "✓" : i + 1}
              </div>
              <div className={`proto-step-label ${state}`}>{label}</div>
            </div>
            {i < steps.length - 1 && (
              <div className={`proto-step-line ${state === "done" ? "done" : "pending"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Summary() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [summary, setSummary] = useState(location.state?.summary || null);
  const [transcript] = useState(location.state?.transcript || null);
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(!location.state?.summary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const tabs = [
    { label: lang === "ms" ? "Utama" : "Dashboard", path: "/app" },
    { label: lang === "ms" ? "Sesi Baharu" : "New Session", path: "/input" },
    { label: lang === "ms" ? "Sejarah" : "History", path: "/history" },
  ];

  useEffect(() => {
    if (!summary && id) {
      setLoadingSummary(true);
      axios
        .get(`${API_URL}/ringkasan/${id}`)
        .then((res) => setSummary(res.data))
        .catch(() => setError(t(lang, "summary.errFetch")))
        .finally(() => setLoadingSummary(false));
    }
  }, [id]);

  const handleGenerateQuiz = async () => {
    setLoading(true);
    setError("");
    const noMatrik = auth.currentUser?.email?.split("@")[0] || "unknown";
    try {
      const res = await axios.post(`${API_URL}/generate-quiz`, {
        idRingkasan: id,
        noMatrik,
        num_questions: 5,
      });
      navigate(`/quiz/${id}`, {
        state: { quiz: res.data, summary, transcript },
      });
    } catch (err) {
      setError(t(lang, "summary.errQuiz"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!summary || !transcript) return;
    setSaving(true);
    const noMatrik = auth.currentUser?.email?.split("@")[0] || "unknown";
    try {
      await setDoc(doc(db, "nota", `${noMatrik}_${Date.now()}`), {
        noMatrik,
        tajuk: `Nota ${new Date().toLocaleDateString("ms-MY")}`,
        IDtranskripsi: transcript.IDtranskripsi,
        idRingkasan: id,
        tarikhSimpan: serverTimestamp(),
      });
      setSaved(true);
    } catch (err) {
      setError(t(lang, "summary.errSave"));
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(t(lang, "summary.pdfTitle"), 20, 20);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(t(lang, "summary.pdfDate", { date: new Date().toLocaleDateString("ms-MY") }), 20, 32);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text(t(lang, "summary.pdfSection"), 20, 48);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const summaryLines = pdf.splitTextToSize(summary?.teksRingkasan || "", 170);
    pdf.text(summaryLines, 20, 58);
    pdf.save(`DeepLearner_Ringkasan_${Date.now()}.pdf`);
  };

  const stripMarkdown = (text) =>
    text
      .replace(/#{1,6}\s+/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();

  const extractKeyPoints = (text) => {
    if (!text) return [];
    const clean = stripMarkdown(text);
    const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    return sentences.slice(0, 5).map((s) => s.trim());
  };

  const keyPoints = summary?.keyPoints || extractKeyPoints(summary?.teksRingkasan);

  // Stats derived from summary text
  const summaryText = summary?.teksRingkasan || "";
  const summaryWordCount = summaryText.split(/\s+/).filter(Boolean).length;
  const summaryReadTime = Math.ceil(summaryWordCount / 200);
  // Rough key concepts count: unique capitalised nouns (approximation)
  const conceptCount = [...new Set(summaryText.match(/\b[A-Z][a-z]{3,}\b/g) || [])].length || keyPoints.length;

  if (loadingSummary) {
    return (
      <>
        <TopbarTabs tabs={tabs} activeTab={lang === "ms" ? "Sesi Baharu" : "New Session"} />
        <div className="proto-content">
          <div className="proto-card" style={{ textAlign: "center", padding: "48px" }}>
            <div className="spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: "16px", color: "var(--proto-text)" }}>{t(lang, "summary.fetchLoading")}</p>
          </div>
        </div>
      </>
    );
  }

  if (!summary) {
    return (
      <>
        <TopbarTabs tabs={tabs} activeTab={lang === "ms" ? "Sesi Baharu" : "New Session"} />
        <div className="proto-content">
          <div className="proto-card" style={{ textAlign: "center", padding: "48px" }}>
            <p style={{ color: "var(--proto-text)", marginBottom: "16px" }}>{error || t(lang, "summary.notFound")}</p>
            <button className="proto-btn-primary" onClick={() => navigate("/input")}>
              {t(lang, "summary.backBtn")}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopbarTabs tabs={tabs} activeTab={lang === "ms" ? "Sesi Baharu" : "New Session"} />

      <div className="proto-content">
        {/* Step Indicator */}
        <StepIndicator current={2} lang={lang} />

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <Sparkles size={24} style={{ color: "var(--amber)" }} />
          <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "24px", fontWeight: 700, color: "var(--proto-text)" }}>
            {t(lang, "summary.heading")}
          </h1>
        </div>

        <p style={{ marginBottom: "20px", color: "var(--proto-text-2)", fontSize: "14px", maxWidth: "520px" }}>
          {t(lang, "summary.subtitle")}
        </p>

        {/* Stats Row */}
        <div className="proto-stats-row">
          <div className="proto-stat-chip">
            <span className="proto-stat-chip-label">{t(lang, "proto.statsWordCount")}</span>
            <span className="proto-stat-chip-value">{summaryWordCount.toLocaleString()}</span>
            <span className="proto-stat-chip-unit">{t(lang, "proto.words")}</span>
          </div>
          <div className="proto-stat-chip">
            <span className="proto-stat-chip-label">{t(lang, "proto.keyConcepts")}</span>
            <span className="proto-stat-chip-value">{conceptCount}</span>
            <span className="proto-stat-chip-unit">{lang === "ms" ? "konsep" : "concepts"}</span>
          </div>
          <div className="proto-stat-chip">
            <span className="proto-stat-chip-label">{t(lang, "proto.statsReadTime")}</span>
            <span className="proto-stat-chip-value">~{summaryReadTime}</span>
            <span className="proto-stat-chip-unit">{t(lang, "proto.minutes")}</span>
          </div>
          <div className="proto-stat-chip">
            <span className="proto-stat-chip-label">{lang === "ms" ? "Poin Utama" : "Key Points"}</span>
            <span className="proto-stat-chip-value">{keyPoints.length}</span>
            <span className="proto-stat-chip-unit">{lang === "ms" ? "poin" : "points"}</span>
          </div>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div style={{
            background: "rgba(244,67,54,0.1)", border: "1px solid #f44336",
            borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", color: "#f44336", fontSize: "13px",
          }}>
            {error}
          </div>
        )}
        {saved && (
          <div style={{
            background: "rgba(76,175,80,0.1)", border: "1px solid #4caf50",
            borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", color: "#4caf50", fontSize: "13px",
          }}>
            {t(lang, "summary.savedMsg")}
          </div>
        )}

        {/* Two-Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Key Points Card */}
          <div className="proto-card">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Target size={18} style={{ color: "var(--amber)" }} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--proto-text)" }}>
                {t(lang, "proto.keyPoints")}
              </div>
            </div>

            <ul className="proto-key-points-list">
              {keyPoints.map((point, idx) => (
                <li key={idx}>
                  <span className="proto-number-badge">{idx + 1}</span>
                  <span style={{ fontSize: "13px", color: "var(--proto-text)", lineHeight: 1.6 }}>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Full Summary Card */}
          <div className="proto-card" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <FileText size={18} style={{ color: "var(--amber)" }} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--proto-text)" }}>
                {t(lang, "proto.fullSummary")}
              </div>
            </div>

            <div className="summary-markdown" style={{ flex: 1 }}>
              <ReactMarkdown>{summary.teksRingkasan}</ReactMarkdown>
            </div>

            {/* Generated by chip */}
            <div>
              <span className="proto-generated-chip">
                <Zap size={10} style={{ color: "var(--amber)" }} />
                {t(lang, "proto.generatedBy")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="proto-bottom-bar">
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="proto-btn-outline" onClick={handleExportPDF}>
            <Download size={14} /> {t(lang, "proto.downloadSummary")}
          </button>
          <button
            className="proto-btn-outline"
            onClick={handleSave}
            disabled={saving || saved}
          >
            <Archive size={14} /> {saved ? t(lang, "summary.saved") : saving ? t(lang, "summary.saving") : t(lang, "proto.saveToArchive")}
          </button>
        </div>
        <button
          className="proto-btn-primary"
          onClick={handleGenerateQuiz}
          disabled={loading}
        >
          {loading ? t(lang, "summary.quizLoading") : t(lang, "proto.generateQuiz")} →
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div className="proto-card" style={{ textAlign: "center", padding: "32px", minWidth: "240px" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ color: "var(--proto-text)", marginBottom: "8px" }}>
              {t(lang, "summary.loadingHeading")}
            </h3>
            <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>
              {t(lang, "summary.loadingBody")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
