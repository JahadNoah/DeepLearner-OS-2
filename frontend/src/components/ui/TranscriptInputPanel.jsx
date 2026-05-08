import { useState, useRef } from "react";
import { useLanguage } from "../../context/useLanguage";

const t = (lang, key) => {
  const translations = {
    ms: {
      sessionTitlePlaceholder: "cth: Kuliah Sejarah 10/3",
      pasteMode: "Tampal Teks",
      uploadMode: "Muat Naik Fail",
      transcriptPlaceholder: "Tampalkan teks transkrip anda di sini...",
      uploadPrompt: "Klik atau seret fail ke sini",
      uploadHint: "Format: .txt, .pdf, .docx",
      words: "perkataan",
      processing: "Sedang memproses...",
      processBtn: "Proses Analisis",
      selectLanguage: "Pilih Bahasa",
    },
    en: {
      sessionTitlePlaceholder: "e.g., History Lecture 10/3",
      pasteMode: "Paste Text",
      uploadMode: "Upload File",
      transcriptPlaceholder: "Paste your transcript text here...",
      uploadPrompt: "Click or drag file here",
      uploadHint: "Format: .txt, .pdf, .docx",
      words: "words",
      processing: "Processing...",
      processBtn: "Process Analysis",
      selectLanguage: "Select Language",
    },
  };
  return translations[lang]?.[key] || key;
};

export function TranscriptInputPanel({ onSubmit, loading = false }) {
  const { lang } = useLanguage();
  const [selectedLang, setSelectedLang] = useState("ms");
  const [sessionTitle, setSessionTitle] = useState("");
  const [mode, setMode] = useState("paste");
  const [transcriptText, setTranscriptText] = useState("");
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const languages = [
    { code: "ms", label: "🇲🇾 Bahasa Melayu" },
    { code: "en", label: "🇬🇧 English" },
    { code: "zh", label: "🇨🇳 Mandarin" },
    { code: "ar", label: "🇸🇦 Arab" },
  ];

  const wordCount = transcriptText.split(/\s+/).filter(Boolean).length;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
    }
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        text: mode === "paste" ? transcriptText : undefined,
        file: mode === "upload" ? file : undefined,
        language: selectedLang,
        title: sessionTitle,
      });
    }
  };

  const canSubmit = !loading && ((mode === "paste" && transcriptText.trim()) || (mode === "upload" && file));

  return (
    <div className="proto-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Language Selector */}
      <div>
        <div style={{ fontSize: "11px", color: "var(--proto-text-3)", marginBottom: "8px", letterSpacing: "0.05em" }}>
          {t(lang, "selectLanguage").toUpperCase()}
        </div>
        <div className="proto-lang-selector">
          {languages.map((l) => (
            <button
              key={l.code}
              className={`proto-chip ${selectedLang === l.code ? "selected" : ""}`}
              onClick={() => setSelectedLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session Title */}
      <input
        type="text"
        className="proto-input"
        placeholder={t(lang, "sessionTitlePlaceholder")}
        value={sessionTitle}
        onChange={(e) => setSessionTitle(e.target.value)}
      />

      {/* Mode Tabs */}
      <div className="proto-mode-tabs">
        <button
          className={`proto-mode-tab ${mode === "paste" ? "active" : ""}`}
          onClick={() => setMode("paste")}
        >
          {t(lang, "pasteMode")}
        </button>
        <button
          className={`proto-mode-tab ${mode === "upload" ? "active" : ""}`}
          onClick={() => setMode("upload")}
        >
          {t(lang, "uploadMode")}
        </button>
      </div>

      {/* Content Area */}
      {mode === "paste" ? (
        <>
          <textarea
            className="proto-textarea"
            placeholder={t(lang, "transcriptPlaceholder")}
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            style={{ minHeight: "200px" }}
          />
          {transcriptText && (
            <div className="proto-word-count">
              {wordCount} {t(lang, "words")}
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={`proto-file-dropzone ${dragOver ? "drag-over" : ""}`}
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="proto-upload-icon">📂</div>
            <div className="proto-upload-title">{t(lang, "uploadPrompt")}</div>
            <div className="proto-upload-desc">{t(lang, "uploadHint")}</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf,.docx"
              hidden
              onChange={handleFileChange}
            />
          </div>
          {file && (
            <div style={{ fontSize: "12px", color: "var(--proto-text-2)", marginTop: "-8px" }}>
              ✓ {file.name}
            </div>
          )}
        </>
      )}

      {/* Submit Button */}
      <button
        className="proto-btn-primary"
        disabled={!canSubmit}
        onClick={handleSubmit}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? t(lang, "processing") : t(lang, "processBtn")}
      </button>
    </div>
  );
}
