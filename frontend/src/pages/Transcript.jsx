import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import { TopbarTabs } from "../components/ui/TopbarTabs";
import { FileText, Copy, Download, Archive, Share2, Sparkles } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

/** Visual 3-step progress indicator */
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

export default function Transcript() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [transcript] = useState(location.state?.transcript || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const tabs = [
    { label: lang === "ms" ? "Utama" : "Dashboard", path: "/app" },
    { label: lang === "ms" ? "Sesi Baharu" : "New Session", path: "/input" },
    { label: lang === "ms" ? "Sejarah" : "History", path: "/history" },
  ];

  const handleSummarize = async () => {
    setLoading(true);
    setError("");
    const noMatrik = auth.currentUser?.email?.split("@")[0] || "unknown";
    try {
      const res = await axios.post(`${API_URL}/summarize`, {
        IDtranskripsi: id,
        noMatrik,
      });
      navigate(`/summary/${res.data.idRingkasan}`, {
        state: { summary: res.data, transcript },
      });
    } catch (err) {
      setError(t(lang, "transcript.errSummarize"));
    } finally {
      setLoading(false);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(transcript?.teksPenuh || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = transcript?.teksPenuh?.split(/\s+/).filter(Boolean).length || 0;
  const readTime = Math.ceil(wordCount / 200);
  const refId = `AC-${(id || "7742").slice(-4).toUpperCase()}`;
  const today = new Date().toLocaleDateString(lang === "ms" ? "ms-MY" : "en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  if (!transcript) {
    return (
      <div className="proto-content">
        <div className="proto-card" style={{ textAlign: "center", padding: "48px" }}>
          <p style={{ color: "var(--proto-text)", marginBottom: "16px" }}>{t(lang, "transcript.notFound")}</p>
          <button className="proto-btn-primary" onClick={() => navigate("/input")}>
            {t(lang, "transcript.backBtn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopbarTabs tabs={tabs} activeTab={lang === "ms" ? "Sesi Baharu" : "New Session"} />

      <div className="proto-content">
        {/* Step Indicator */}
        <StepIndicator current={1} lang={lang} />

        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "6px" }}>
          <div style={{
            display: "inline-block",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "var(--proto-text-3)",
            marginBottom: "10px",
          }}>
            {t(lang, "proto.transcriptionAnalysis")}
          </div>
          <h1 style={{
            fontFamily: "var(--proto-font)",
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--proto-text)",
            marginBottom: "4px",
          }}>
            {transcript.tajuk || (lang === "ms" ? "Sesi Tanpa Tajuk" : "Untitled Session")}
          </h1>
          <div style={{ fontSize: "12px", color: "var(--proto-text-3)" }}>
            {today} &bull; {t(lang, "proto.referenceId")}: <strong style={{ color: "var(--amber)" }}>{refId}</strong>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: "10px", margin: "16px 0", flexWrap: "wrap", justifyContent: "center" }}>
          <span className="proto-lang-tag">
            🌐 {t(lang, "proto.detectedLang")}:
            <strong style={{ color: "var(--amber)", marginLeft: "4px" }}>
              {transcript.bahasa === "ms" ? "Bahasa Melayu" : "English"}
            </strong>
          </span>
          <span className="proto-date-tag">
            📅 {today}
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "rgba(244,67,54,0.1)",
            border: "1px solid #f44336",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "20px",
            color: "#f44336",
            fontSize: "13px",
          }}>
            {error}
          </div>
        )}

        {/* Two-Column Layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px" }}>
          {/* Main Transcript Box */}
          <div className="proto-transcript-box">
            <div className="proto-transcript-header">
              ≡ {t(lang, "transcript.fullText")}
            </div>
            <div className="proto-transcript-body">
              <div className="proto-page-block">
                <div className="proto-page-marker">[{lang === "ms" ? "HALAMAN" : "PAGE"} 1]</div>
                <div className="proto-page-time">00:00 – {Math.floor(wordCount / 150)}:{String(Math.floor((wordCount % 150) / 2.5)).padStart(2, "0")}</div>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{transcript.teksPenuh}</p>
              </div>
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Session Info Card */}
            <div className="proto-card">
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-3)", marginBottom: "14px" }}>
                {t(lang, "proto.sessionInfo")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginBottom: "2px" }}>
                    {t(lang, "proto.sessionTitle")}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                    {transcript.tajuk || (lang === "ms" ? "Sesi Tanpa Tajuk" : "Untitled Session")}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginBottom: "2px" }}>
                    {t(lang, "proto.detectedLang")}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                    {transcript.bahasa === "ms" ? "Bahasa Melayu" : "English (UK)"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginBottom: "2px" }}>
                      {t(lang, "proto.wordCount")}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                      {wordCount.toLocaleString()} {t(lang, "proto.words")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginBottom: "2px" }}>
                      {t(lang, "proto.readTime")}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--proto-text)" }}>
                      ~{readTime} {t(lang, "proto.minutes")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="proto-card">
              <div style={{ fontSize: "10px", letterSpacing: "0.1em", color: "var(--proto-text-3)", marginBottom: "14px" }}>
                {t(lang, "proto.quickActions")}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button className="proto-btn-ghost" style={{ justifyContent: "flex-start", padding: "10px 12px" }}>
                  <Download size={14} /> {t(lang, "proto.exportPdf")}
                </button>
                <button className="proto-btn-ghost" style={{ justifyContent: "flex-start", padding: "10px 12px" }}>
                  <Archive size={14} /> {t(lang, "proto.saveToArchive")}
                </button>
                <button className="proto-btn-ghost" style={{ justifyContent: "flex-start", padding: "10px 12px" }}>
                  <Share2 size={14} /> {t(lang, "proto.shareLink")}
                </button>
              </div>
            </div>

            {/* AI Ready Badge */}
            <div className="proto-ai-badge">
              <div className="proto-ai-badge-title">
                <div className="proto-ai-badge-dot" />
                <Sparkles size={11} />
                {t(lang, "proto.aiReady")}
              </div>
              <div className="proto-ai-badge-msg">
                {t(lang, "proto.aiReadyMsg")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="proto-bottom-bar">
        <button className="proto-btn-outline" onClick={copyText}>
          <Copy size={14} /> {copied ? "✓" : t(lang, "proto.copyText")}
        </button>
        <button
          className="proto-btn-primary"
          onClick={handleSummarize}
          disabled={loading}
        >
          {loading ? t(lang, "transcript.summarizeLoading") : t(lang, "proto.generateSummary")} →
        </button>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div className="proto-card" style={{ textAlign: "center", padding: "32px", minWidth: "240px" }}>
            <div className="spinner" style={{ margin: "0 auto 16px" }} />
            <h3 style={{ color: "var(--proto-text)", marginBottom: "8px" }}>
              {t(lang, "transcript.loadingHeading")}
            </h3>
            <p style={{ color: "var(--proto-text-2)", fontSize: "13px" }}>
              {t(lang, "transcript.loadingBody")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
