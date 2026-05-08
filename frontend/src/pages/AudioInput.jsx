import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function AudioInput() {
    const [activeTab, setActiveTab] = useState("audio");
    const { lang } = useLanguage();

    // Audio state
    const [audioFile, setAudioFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [language, setLanguage] = useState("ms");

    // PDF / Text state
    const [pdfFile, setPdfFile] = useState(null);
    const [transcriptText, setTranscriptText] = useState("");

    // Shared state
    const [loading, setLoading] = useState(false);
    const [progressStep, setProgressStep] = useState("");
    const [error, setError] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const navigate = useNavigate();
    const user = auth.currentUser;
    const noMatrik = user?.email?.split("@")[0] || user?.displayName || "unknown";

    // ─── Audio Recording ─────────────────────────────────────
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);
            mediaRecorderRef.current = mr;
            chunksRef.current = [];
            mr.ondataavailable = (e) => chunksRef.current.push(e.data);
            mr.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                setAudioFile(new File([blob], `rakaman_${Date.now()}.webm`, { type: "audio/webm" }));
                stream.getTracks().forEach(t => t.stop());
            };
            mr.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
        } catch {
            setError(t(lang, "audioInput.errMic"));
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        clearInterval(timerRef.current);
        setIsRecording(false);
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ─── Submit Handlers ──────────────────────────────────────
    // ─── SSE Progress ─────────────────────────────────────────
    const startProgressStream = async () => {
        try {
            const res = await axios.post(`${API_URL}/progress/create`);
            const jobId = res.data.job_id;
            const es = new EventSource(`${API_URL}/progress/${jobId}`);
            const stepLabels = {
                transcribing: t(lang, "audioInput.progressTranscribing"),
                cleaning: t(lang, "audioInput.progressCleaning"),
                saving: t(lang, "audioInput.progressSaving"),
                summarising: t(lang, "audioInput.progressSummarising"),
                done: t(lang, "audioInput.progressDone"),
            };
            es.addEventListener("progress", (e) => {
                const data = JSON.parse(e.data);
                setProgressStep(stepLabels[data.step] || data.label || data.step);
            });
            es.addEventListener("done", () => {
                setProgressStep(t(lang, "audioInput.progressDone"));
                es.close();
            });
            es.addEventListener("error", () => es.close());
            return { jobId, es };
        } catch {
            return { jobId: null, es: null };
        }
    };

    const mapApiError = (err, fallbackKey) => {
        if (!err.response || err.response.status === 502 || err.response.status === 503) {
            return t(lang, "audioInput.errNoServer");
        }
        const detail = err.response?.data?.detail;
        const errorMap = {
            "AUDIO_TOO_LONG": t(lang, "audioInput.errAudioTooLong"),
            "AUDIO_FORMAT_INVALID": t(lang, "audioInput.errAudioFormat"),
            "PDF_NO_TEXT": t(lang, "audioInput.errPdfNoText"),
            "AI_SERVICE_UNAVAILABLE": t(lang, "audioInput.errAiUnavailable"),
            "FILE_TOO_LARGE": t(lang, "audioInput.errFileTooLarge"),
            "TRANSCRIPT_TOO_LONG": t(lang, "audioInput.errTextTooLong"),
            "MIME_NOT_SUPPORTED": t(lang, "audioInput.errMimeNotSupported"),
        };
        if (detail && errorMap[detail]) return errorMap[detail];
        if (typeof detail === "string") return detail;
        return t(lang, fallbackKey);
    };

    const handleSubmitAudio = async () => {
        if (!audioFile) return setError(t(lang, "audioInput.errNoAudio"));
        setError(""); setLoading(true); setProgressStep("");
        const { jobId, es } = await startProgressStream();
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("noMatrik", noMatrik);
        formData.append("language", language);
        if (jobId) formData.append("job_id", jobId);
        try {
            const res = await axios.post(`${API_URL}/transcribe`, formData);
            navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
        } catch (err) {
            es?.close();
            setError(mapApiError(err, "audioInput.errAudio"));
        } finally { setLoading(false); }
    };

    const handleSubmitPdf = async () => {
        if (!pdfFile && !transcriptText.trim()) return setError(t(lang, "audioInput.errNoPdfOrText"));
        if (transcriptText.length > 50000) return setError(t(lang, "audioInput.errTextTooLong"));
        setError(""); setLoading(true); setProgressStep(t(lang, "audioInput.loadingPdfHeading"));
        const formData = new FormData();

        if (pdfFile) {
            formData.append("dokumen", pdfFile);
        } else {
            const blob = new Blob([transcriptText], { type: "text/plain" });
            const file = new File([blob], "transcript.txt", { type: "text/plain" });
            formData.append("dokumen", file);
        }

        formData.append("noMatrik", noMatrik);
        try {
            const res = await axios.post(`${API_URL}/extract-pdf`, formData);
            navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
        } catch (err) {
            setError(mapApiError(err, "audioInput.errPdf"));
        } finally { setLoading(false); }
    };

    // ─── Drag & Drop ─────────────────────────────────────────
    const handleDrop = (e, type) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        if (type === "audio" && f.type.startsWith("audio/")) setAudioFile(f);
        if (type === "pdf" && (f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".txt") || f.name.toLowerCase().endsWith(".docx"))) setPdfFile(f);
    };

    const selectedFile = activeTab === "audio" ? audioFile : pdfFile;

    return (
        <div className="page">
            <div className="step-label">
                <div className="num">{lang === "ms" ? "LANGKAH 01" : "STEP 01"}</div>
                <div className="line"></div>
            </div>
            <h1>{t(lang, "audioInput.heading")}</h1>
            <p style={{ marginBottom: "2rem" }}>{t(lang, "audioInput.subtitle")}</p>

            {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="grid-auto-sm" style={{ marginTop: "28px" }}>
                {/* ════ LEFT COLUMN: AUDIO ════ */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                    {/* ══════════════════════════════════════
          AUDIO TAB
      ══════════════════════════════════════ */}
                    {/* Language selector */}
                    <div className="card">
                        <div className="flex items-center gap-8" style={{ marginBottom: "12px" }}>
                            <span style={{ fontSize: "16px" }}>🌐</span>
                            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
                                {t(lang, "audioInput.audioLangHeading")}
                            </div>
                        </div>
                        <div className="lang-row">
                            {[["ms", t(lang, "audioInput.langMs")], ["en", t(lang, "audioInput.langEn")]].map(([val, label]) => (
                                <div
                                    key={val}
                                    className={`chip ${language === val ? "selected" : ""}`}
                                    onClick={() => setLanguage(val)}
                                >
                                    {language === val ? "✓ " : ""}{label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Recording */}
                    <div className="audio-card">
                        <div className="feat-icon" style={{ background: "rgba(184,92,0,0.15)", marginBottom: "14px", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", fontSize: "18px" }}>🎙️</div>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)", fontFamily: "var(--font, inherit)" }}>
                            {t(lang, "audioInput.recordHeading")}
                        </div>
                        <p style={{ fontSize: "13px", color: "var(--text-sub)", marginTop: "8px", maxWidth: "360px", lineHeight: 1.6 }}>
                            {t(lang, "audioInput.recordDesc")}
                        </p>

                        <div className="flex items-center gap-12 mt-20" style={{ marginTop: "20px" }}>
                            {isRecording ? (
                                <>
                                    <div className="rec-ready" style={{ display: "flex" }}>
                                        <span className="rec-dot"></span>
                                        {formatTime(recordingTime)}
                                    </div>
                                    <button className="rec-btn" style={{ marginLeft: "auto", background: "var(--error)" }} onClick={stopRecording}>
                                        {t(lang, "audioInput.stopBtn")}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="rec-ready" style={{ display: "flex" }}>
                                        <span className="rec-dot" style={{ background: "var(--text-muted)", animation: "none" }}></span>
                                        {t(lang, "audioInput.readyToRecord")}
                                    </div>
                                    <button className="rec-btn" style={{ marginLeft: "auto" }} onClick={startRecording}>
                                        {t(lang, "audioInput.startBtn")}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="card">
                        <div style={{ marginBottom: "16px", fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>{t(lang, "audioInput.uploadHeading")}</div>
                        <div
                            className={`upload-card ${dragOver ? "drag-over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => handleDrop(e, "audio")}
                            onClick={() => document.getElementById("audio-input").click()}
                        >
                            <div className="upload-icon">📂</div>
                            <div className="upload-title">{t(lang, "audioInput.uploadPrompt")}</div>
                            <div className="upload-desc">{t(lang, "audioInput.uploadHint")}</div>
                            <input id="audio-input" type="file" accept="audio/*" hidden onChange={(e) => setAudioFile(e.target.files[0])} />
                        </div>
                    </div>

                    {selectedFile && activeTab === "audio" && (
                        <div className="card" style={{ background: "rgba(184,92,0,0.08)", borderColor: "var(--amber)" }}>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>{t(lang, "audioInput.fileSelected", { name: selectedFile.name })}</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem", color: "var(--text-sub)" }}>{t(lang, "audioInput.fileSize", { size: (selectedFile.size / 1024 / 1024).toFixed(2) })}</p>
                        </div>
                    )}

                    <button id="transcribe-btn" className="btn btn-primary" onClick={handleSubmitAudio}
                        disabled={loading || !audioFile} style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
                        {loading ? t(lang, "audioInput.submitLoading") : t(lang, "audioInput.submitBtn")}
                    </button>
                </div>

                {/* ════ RIGHT COLUMN: TEXT & PDF ════ */}
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "24px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{t(lang, "audioInput.transcriptContentHeading")}</div>
                        <p style={{ fontSize: "12px", color: "var(--text-sub)" }}>
                            {t(lang, "audioInput.transcriptContentDesc")}
                        </p>

                        <textarea
                            value={transcriptText}
                            maxLength={50000}
                            onChange={(e) => {
                                setTranscriptText(e.target.value);
                                if (e.target.value) setPdfFile(null);
                            }}
                            placeholder={lang === "ms" ? "Tampalkan teks transkrip anda di sini..." : "Paste your transcript text here..."}
                            style={{
                                width: "100%", height: "150px", borderRadius: "10px", padding: "12px",
                                border: `1px solid ${transcriptText.length > 45000 ? "var(--amber)" : "var(--border)"}`,
                                background: "var(--surface2)",
                                color: "var(--text)", resize: "vertical", fontFamily: "inherit", fontSize: "13px"
                            }}
                        />
                        {transcriptText.length > 0 && (
                            <div style={{ fontSize: "11px", textAlign: "right", color: transcriptText.length > 45000 ? "var(--amber)" : "var(--text-sub)" }}>
                                {transcriptText.length > 45000 && <span style={{ marginRight: "6px" }}>⚠️ {t(lang, "audioInput.charWarning")} — </span>}
                                {t(lang, "audioInput.charCount", { count: transcriptText.length.toLocaleString() })}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-8" style={{ marginTop: "8px" }}>
                            <button className="btn btn-outline" style={{ fontSize: "12px" }} onClick={() => document.getElementById("pdf-input").click()}>
                                📄 {t(lang, "audioInput.uploadFileBtn")}
                            </button>
                            <input id="pdf-input" type="file" accept=".pdf,.txt,.docx" hidden onChange={(e) => {
                                setPdfFile(e.target.files[0]);
                                if (e.target.files[0]) setTranscriptText("");
                            }} />
                            <button className="btn btn-primary" style={{ fontSize: "12px" }} onClick={handleSubmitPdf} disabled={loading || (!pdfFile && !transcriptText.trim())}>
                                ✨ {t(lang, "audioInput.analyzeBtn")} →
                            </button>
                        </div>
                    </div>

                    {pdfFile && (
                        <div className="card" style={{ background: "rgba(108,99,255,0.08)", borderColor: "var(--primary)" }}>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>{t(lang, "audioInput.fileSelected", { name: pdfFile.name })}</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>{t(lang, "audioInput.fileSize", { size: (pdfFile.size / 1024 / 1024).toFixed(2) })}</p>
                        </div>
                    )}

                    <div className="help-card">
                        <div className="help-title">{t(lang, "audioInput.helpTitle")}</div>
                        <p style={{ fontSize: "12px", opacity: 0.75, lineHeight: 1.6 }}>
                            {t(lang, "audioInput.helpDesc")}
                        </p>
                        <div className="help-link">{t(lang, "audioInput.helpCta")}</div>
                    </div>
                </div>
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="card processing-card" style={{ marginTop: "1.5rem" }}>
                    <div className="spinner" />
                    <h3>{progressStep || (activeTab === "pdf" ? t(lang, "audioInput.loadingPdfHeading") : t(lang, "audioInput.loadingAudioHeading"))}</h3>
                    <p>{activeTab === "pdf" ? t(lang, "audioInput.loadingPdfBody") : t(lang, "audioInput.loadingAudioBody")}</p>
                </div>
            )}
        </div>
    );
}
