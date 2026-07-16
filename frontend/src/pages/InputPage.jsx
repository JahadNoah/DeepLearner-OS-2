import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import {
  FileText, UploadCloud, Info, Trash2, Bold, Sparkles, Link2, FileJson
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function InputPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const noMatrik = user?.email?.split("@")[0] || user?.displayName || "unknown";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("ms");
  const fileInputRef = useRef(null);

  // Audio files route to the transcription pipeline (/transcribe); everything
  // else (PDF/PPTX/DOCX/pasted text) goes to the document extractor (/extract-pdf).
  const AUDIO_EXT = /\.(wav|mp3|m4a|aac|ogg|oga|flac|webm|mp4|mpeg|mpga)$/i;
  const isAudioFile = (f) => !!f && (f.type.startsWith("audio/") || AUDIO_EXT.test(f.name));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const showApiError = (err, fallback) => {
    if (!err.response || err.response.status === 502 || err.response.status === 503) {
      setError(t(lang, "inputPage.errConnect"));
      return;
    }
    const detail = err.response?.data?.detail;
    let msg = "";
    if (typeof detail === "string") {
      msg = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      // FastAPI validation error format
      msg = detail.map(d => d.msg || JSON.stringify(d)).join(", ");
    } else if (detail) {
      msg = JSON.stringify(detail);
    }
    setError(msg || fallback);
  };

  const handleSubmit = async () => {
    if (!text && !file) {
      setError(t(lang, "inputPage.errNoInput"));
      return;
    }
    setError("");
    setLoading(true);

    try {
      // Audio → transcription pipeline
      if (file && isAudioFile(file)) {
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("noMatrik", noMatrik);
        formData.append("language", language);
        const res = await axios.post(`${API_URL}/transcribe`, formData);
        navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
        return;
      }

      // Document or pasted text → extraction pipeline
      const formData = new FormData();
      if (file) {
        formData.append("dokumen", file);
      } else {
        const blob = new Blob([text], { type: "text/plain" });
        const txtFile = new File([blob], "transcript.txt", { type: "text/plain" });
        formData.append("dokumen", txtFile);
      }
      formData.append("noMatrik", noMatrik);
      const res = await axios.post(`${API_URL}/extract-pdf`, formData);
      navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
    } catch (err) {
      showApiError(err, t(lang, "inputPage.errProcess"));
    } finally {
      setLoading(false);
    }
  };

  // Soft peach icon chip — matches the Dashboard feature-tile treatment.
  const iconChip = {
    width: "48px", height: "48px", borderRadius: "12px",
    background: "var(--clay-accent)", color: "var(--clay-on-accent)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div className="proto-content" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: "48px" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingTop: "12px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--clay-text-3)", marginBottom: "8px", fontWeight: "600", letterSpacing: "0.05em" }}>
            {t(lang, "inputPage.breadcrumb")} &nbsp;&nbsp;›&nbsp;&nbsp; <span style={{ color: "var(--clay-link)" }}>{t(lang, "inputPage.step")}</span>
          </div>
          <h1 style={{ fontFamily: "var(--clay-font-head)", fontSize: "28px", fontWeight: 700, color: "var(--clay-text)", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            {t(lang, "inputPage.heading")}
          </h1>
          <p style={{ color: "var(--clay-text-sub)", fontSize: "14px", maxWidth: "600px", lineHeight: 1.6 }}>
            {t(lang, "inputPage.subtitle")}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "16px" }}>
          <button style={{ background: "transparent", border: "none", color: "var(--clay-text-sub)", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={(e) => e.target.style.color = "var(--clay-text)"} onMouseOut={(e) => e.target.style.color = "var(--clay-text-sub)"}>
            {t(lang, "inputPage.saveDraft")}
          </button>
          <button
            className="clay-btn clay-btn-primary"
            style={{ fontSize: "14px", padding: "12px 28px" }}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? t(lang, "inputPage.processing") : t(lang, "inputPage.next")}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--clay-danger-tint)", border: "1px solid var(--clay-danger)", borderRadius: "12px", padding: "14px 20px", marginBottom: "24px", color: "var(--clay-text)", fontSize: "14px", fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "24px", flex: 1 }}>

        {/* LEFT COLUMN: Dokumen & Slaid */}
        <div className="clay-card" style={{ padding: "32px", display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
            <div style={iconChip}>
              <FileJson size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>{t(lang, "inputPage.uploadTitle")}</h2>
              <div style={{ fontSize: "11px", color: "var(--clay-text-3)", letterSpacing: "0.05em", marginTop: "4px", fontWeight: 600 }}>{t(lang, "inputPage.uploadFormats")}</div>
            </div>
          </div>

          <div
            style={{
              border: `2px dashed ${dragOver ? "var(--clay-primary-deep)" : "rgba(139,124,246,0.30)"}`,
              borderRadius: "20px",
              padding: "48px 24px",
              textAlign: "center",
              background: dragOver ? "var(--clay-primary-glow)" : "transparent",
              transition: "all 0.2s ease",
              cursor: "pointer",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "280px"
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--clay-primary-deep)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: "24px", boxShadow: "0 8px 20px var(--clay-primary-glow)" }}>
              <UploadCloud size={28} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)" }}>{t(lang, "inputPage.dropHere")}</div>
            <div style={{ fontSize: "13px", color: "var(--clay-text-3)", marginBottom: "32px" }}>{t(lang, "inputPage.orBrowse")}</div>

            {file ? (
              <div style={{ background: "var(--clay-surface-2)", padding: "10px 20px", borderRadius: "20px", color: "var(--clay-text)", fontSize: "13px", fontWeight: 600, border: "1px solid var(--clay-primary-deep)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} color="var(--clay-link)" /> {file.name}
              </div>
            ) : (
              <button style={{ background: "var(--clay-text)", color: "var(--clay-bg)", border: "none", padding: "14px 32px", borderRadius: "24px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer", transition: "transform 0.2s" }} onMouseOver={(e) => {e.target.style.transform="scale(1.02)";}} onMouseOut={(e) => {e.target.style.transform="scale(1)";}} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                {t(lang, "inputPage.chooseFile")}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.pdf,.pptx,.docx,.txt" hidden onChange={(e) => { if(e.target.files[0]) setFile(e.target.files[0]); }} />
          </div>

          {/* Audio language selector — only relevant when an audio file is chosen */}
          {file && isAudioFile(file) && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "12px", color: "var(--clay-text-sub)", fontWeight: 600 }}>
                {t(lang, "inputPage.audioLang")}
              </span>
              {[["ms", "Bahasa Melayu"], ["en", "English"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setLanguage(val)}
                  style={{
                    padding: "8px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                    cursor: "pointer", transition: "all 0.2s",
                    border: `1px solid ${language === val ? "var(--clay-primary-deep)" : "rgba(139,124,246,0.30)"}`,
                    background: language === val ? "var(--clay-primary-deep)" : "transparent",
                    color: language === val ? "#fff" : "var(--clay-text-sub)",
                  }}
                >
                  {language === val ? "✓ " : ""}{label}
                </button>
              ))}
            </div>
          )}

          <div style={{ background: "var(--clay-surface-2)", borderRadius: "16px", padding: "16px 20px", display: "flex", gap: "12px", marginTop: "24px", alignItems: "flex-start" }}>
            <div style={{ color: "var(--clay-link)", marginTop: "2px", background: "rgba(109,91,208,0.15)", borderRadius: "50%", padding: "4px" }}><Info size={14} style={{ display: "block" }} /></div>
            <div style={{ fontSize: "12px", color: "var(--clay-text-sub)", lineHeight: 1.6, fontWeight: 500 }}>
              {t(lang, "inputPage.uploadInfo")}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Text Area & Sub-cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>

          {/* Top right card: Text Area */}
          <div className="clay-card" style={{ padding: "32px", display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={iconChip}>
                   <FileText size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--clay-text)", fontFamily: "var(--clay-font-head)" }}>{t(lang, "inputPage.pasteTitle")}</h2>
                  <div style={{ fontSize: "11px", color: "var(--clay-text-3)", letterSpacing: "0.05em", marginTop: "4px", fontWeight: 600 }}>{t(lang, "inputPage.manualEntry")}</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "20px", color: "var(--clay-text-3)" }}>
                <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--clay-text)"} onMouseOut={(e) => e.currentTarget.style.color = "inherit"}><Bold size={20} /></button>
                <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--clay-text)"} onMouseOut={(e) => e.currentTarget.style.color = "inherit"} onClick={() => setText("")}><Trash2 size={20} /></button>
              </div>
            </div>

            <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: "280px" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t(lang, "inputPage.pastePlaceholder")}
                style={{
                  width: "100%",
                  height: "100%",
                  flex: 1,
                  background: "var(--clay-surface-2)",
                  border: "none",
                  borderRadius: "16px",
                  padding: "24px",
                  fontSize: "15px",
                  color: "var(--clay-text)",
                  fontFamily: "var(--clay-font-body)",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.6
                }}
              />
              <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "var(--clay-surface)", padding: "10px 16px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: "var(--clay-text-3)", letterSpacing: "0.05em", boxShadow: "var(--clay-shadow)" }}>
                {t(lang, "inputPage.wordCount", { count: wordCount })}
              </div>
            </div>
          </div>

          {/* Bottom two small cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="clay-card" style={{ padding: "24px", cursor: "pointer" }}>
              <div style={{ color: "var(--clay-text-3)", marginBottom: "16px" }}><Sparkles size={24} /></div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)" }}>{t(lang, "inputPage.quickTitle")}</div>
              <div style={{ fontSize: "12px", color: "var(--clay-text-3)", lineHeight: 1.6 }}>{t(lang, "inputPage.quickDesc")}</div>
            </div>
            <div className="clay-card" style={{ padding: "24px", cursor: "pointer" }}>
              <div style={{ color: "var(--clay-text-3)", marginBottom: "16px" }}><Link2 size={24} /></div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)" }}>{t(lang, "inputPage.urlTitle")}</div>
              <div style={{ fontSize: "12px", color: "var(--clay-text-3)", lineHeight: 1.6 }}>{t(lang, "inputPage.urlDesc")}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)"
        }}>
          <div className="clay-card" style={{ textAlign: "center", padding: "40px", width: "320px" }}>
            <div className="spinner" style={{ margin: "0 auto 24px", borderTopColor: "var(--clay-primary-deep)" }} />
            <h3 style={{ color: "var(--clay-text)", marginBottom: "8px", fontFamily: "var(--clay-font-head)", fontSize: "20px" }}>
              {t(lang, "inputPage.processingTitle")}
            </h3>
            <p style={{ color: "var(--clay-text-sub)", fontSize: "14px" }}>
              {t(lang, "inputPage.processingSub")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
