import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import {
  FileText, UploadCloud, Info, Trash2, Bold, Sparkles, Link2, FileJson,
  Mic, Square, Headphones
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function InputPage() {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const user = auth.currentUser;
  const noMatrik = user?.email?.split("@")[0] || user?.displayName || "unknown";

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState("");
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const fileInputRef = useRef(null);

  // Audio state
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const audioInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

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
        stream.getTracks().forEach((tr) => tr.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((s) => s + 1), 1000);
    } catch {
      setError(lang === "ms" ? "Tidak dapat mengakses mikrofon." : "Could not access microphone.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) setFile(droppedFile);
  };

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const parseApiError = (err, fallback) => {
    if (!err.response || err.response.status === 502 || err.response.status === 503) {
      return lang === "ms"
        ? "Gagal menyambung ke pelayan AI. Sila cuba lagi."
        : "Failed to connect to AI server. Please try again.";
    }
    const detail = err.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
    }
    if (detail) return JSON.stringify(detail);
    return fallback;
  };

  const startProgressStream = async () => {
    try {
      const res = await axios.post(`${API_URL}/progress/create`);
      const jobId = res.data.job_id;
      const es = new EventSource(`${API_URL}/progress/${jobId}`);
      const stepLabels = {
        transcribing: lang === "ms" ? "Mentranskrip audio..." : "Transcribing audio...",
        cleaning: lang === "ms" ? "Membersihkan teks..." : "Cleaning text...",
        saving: lang === "ms" ? "Menyimpan..." : "Saving...",
        done: lang === "ms" ? "Selesai." : "Done.",
      };
      es.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        setProgressStep(stepLabels[data.step] || data.label || data.step);
      });
      es.addEventListener("done", () => es.close());
      es.addEventListener("error", () => es.close());
      return { jobId, es };
    } catch {
      return { jobId: null, es: null };
    }
  };

  const handleSubmit = async () => {
    if (!text && !file && !audioFile) {
      setError(
        lang === "ms"
          ? "Sila muat naik fail, tampal teks, atau rakam audio."
          : "Please upload a file, paste text, or record audio."
      );
      return;
    }
    setError("");
    setProgressStep("");
    setLoading(true);

    // ── Audio path: POST to /api/transcribe ──
    if (audioFile) {
      const { jobId, es } = await startProgressStream();
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("noMatrik", noMatrik);
      if (jobId) formData.append("job_id", jobId);
      try {
        const res = await axios.post(`${API_URL}/transcribe`, formData);
        navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
      } catch (err) {
        es?.close();
        setError(
          parseApiError(
            err,
            lang === "ms" ? "Gagal mentranskrip audio. Sila cuba lagi." : "Failed to transcribe audio. Please try again."
          )
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── Document / Text path: POST to /api/extract-pdf ──
    const formData = new FormData();
    if (file) {
      formData.append("dokumen", file);
    } else {
      const blob = new Blob([text], { type: "text/plain" });
      const txtFile = new File([blob], "transcript.txt", { type: "text/plain" });
      formData.append("dokumen", txtFile);
    }
    formData.append("noMatrik", noMatrik);
    try {
      const res = await axios.post(`${API_URL}/extract-pdf`, formData);
      navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
    } catch (err) {
      setError(
        parseApiError(
          err,
          lang === "ms" ? "Gagal memproses dokumen. Sila cuba lagi." : "Failed to process document. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="proto-content" style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", paddingBottom: "120px" }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingTop: "12px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "var(--proto-text-3)", marginBottom: "8px", fontWeight: "600", letterSpacing: "0.05em" }}>
            Projects &nbsp;&nbsp;›&nbsp;&nbsp; <span style={{ color: "var(--amber)" }}>Langkah 1: Input Kandungan</span>
          </div>
          <h1 style={{ fontFamily: "var(--proto-font)", fontSize: "28px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "12px", letterSpacing: "-0.02em" }}>
            Pusat Sumber Penyelidikan
          </h1>
          <p style={{ color: "var(--proto-text-2)", fontSize: "14px", maxWidth: "600px", lineHeight: 1.6 }}>
            Sediakan bahan akademik anda. AI kami akan memproses teks dan dokumen untuk menjana wawasan penyelidikan yang mendalam.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginTop: "16px" }}>
          <button style={{ background: "transparent", border: "none", color: "var(--proto-text-2)", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "color 0.2s" }} onMouseOver={(e) => e.target.style.color = "var(--proto-text)"} onMouseOut={(e) => e.target.style.color = "var(--proto-text-2)"}>
            Simpan Draf
          </button>
          <button 
            style={{ 
              background: "var(--amber)", color: "#fff", padding: "12px 28px", 
              borderRadius: "24px", fontWeight: 600, fontSize: "14px", 
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px",
              boxShadow: "0 4px 12px rgba(184, 92, 0, 0.2)",
              transition: "transform 0.2s, box-shadow 0.2s"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(184, 92, 0, 0.3)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(184, 92, 0, 0.2)"; }}
            onClick={handleSubmit} 
            disabled={loading}
          >
            {loading ? "Memproses..." : "Seterusnya →"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(244,67,54,0.1)", border: "1px solid #f44336", borderRadius: "12px", padding: "14px 20px", marginBottom: "24px", color: "#f44336", fontSize: "14px", fontWeight: 500 }}>
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "24px", flex: 1 }}>
          
        {/* LEFT COLUMN: Dokumen & Slaid */}
        <div className="proto-card" style={{ padding: "32px", display: "flex", flexDirection: "column", height: "100%", borderRadius: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(184, 92, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--amber)" }}>
              <FileJson size={24} /> 
            </div>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>Dokumen & Slaid</h2>
              <div style={{ fontSize: "11px", color: "var(--proto-text-3)", letterSpacing: "0.05em", marginTop: "4px", fontWeight: 600 }}>PDF, PPTX, DOCX</div>
            </div>
          </div>
          
          <div 
            style={{ 
              border: `2px dashed ${dragOver ? "var(--amber)" : "var(--proto-border)"}`, 
              borderRadius: "20px", 
              padding: "48px 24px", 
              textAlign: "center", 
              background: dragOver ? "var(--amber-glow)" : "transparent",
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
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", marginBottom: "24px", boxShadow: "0 8px 20px rgba(184, 92, 0, 0.2)" }}>
              <UploadCloud size={28} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--proto-text)", marginBottom: "8px", fontFamily: "var(--proto-font)" }}>Letakkan fail di sini</div>
            <div style={{ fontSize: "13px", color: "var(--proto-text-3)", marginBottom: "32px" }}>atau klik untuk melayari fail anda</div>
            
            {file ? (
              <div style={{ background: "var(--proto-surface2)", padding: "10px 20px", borderRadius: "20px", color: "var(--proto-text)", fontSize: "13px", fontWeight: 600, border: "1px solid var(--amber)", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} color="var(--amber)" /> {file.name}
              </div>
            ) : (
              <button style={{ background: "var(--proto-text)", color: "var(--proto-bg)", border: "none", padding: "14px 32px", borderRadius: "24px", fontSize: "12px", fontWeight: 600, letterSpacing: "0.05em", cursor: "pointer", transition: "transform 0.2s, background 0.2s" }} onMouseOver={(e) => {e.target.style.transform="scale(1.02)";}} onMouseOut={(e) => {e.target.style.transform="scale(1)";}} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                PILIH FAIL
              </button>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,.pptx,.docx,.txt" hidden onChange={(e) => { if(e.target.files[0]) setFile(e.target.files[0]); }} />
          </div>

          <div style={{ background: "var(--proto-surface2)", borderRadius: "16px", padding: "16px 20px", display: "flex", gap: "12px", marginTop: "24px", alignItems: "flex-start" }}>
            <div style={{ color: "var(--amber)", marginTop: "2px", background: "rgba(184, 92, 0, 0.15)", borderRadius: "50%", padding: "4px" }}><Info size={14} style={{ display: "block" }} /></div>
            <div style={{ fontSize: "12px", color: "var(--proto-text-2)", lineHeight: 1.6, fontWeight: 500 }}>
              AI akan mengekstrak jadual, teks, dan rujukan secara automatik daripada dokumen akademik yang kompleks.
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Text Area & Sub-cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", height: "100%" }}>
          
          {/* Top right card: Text Area */}
          <div className="proto-card" style={{ padding: "32px", display: "flex", flexDirection: "column", flex: 1, borderRadius: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--proto-text)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--proto-bg)" }}>
                   <FileText size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>Tampal Teks Penyelidikan</h2>
                  <div style={{ fontSize: "11px", color: "var(--proto-text-3)", letterSpacing: "0.05em", marginTop: "4px", fontWeight: 600 }}>MANUAL ENTRY</div>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "20px", color: "var(--proto-text-3)" }}>
                <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--proto-text)"} onMouseOut={(e) => e.currentTarget.style.color = "inherit"}><Bold size={20} /></button>
                <button style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", transition: "color 0.2s" }} onMouseOver={(e) => e.currentTarget.style.color = "var(--proto-text)"} onMouseOut={(e) => e.currentTarget.style.color = "inherit"} onClick={() => setText("")}><Trash2 size={20} /></button>
              </div>
            </div>

            <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: "280px" }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tampal petikan jurnal, nota lapangan, atau transkrip temu bual di sini untuk dianalisis oleh DeepLearner..."
                style={{
                  width: "100%",
                  height: "100%",
                  flex: 1,
                  background: "var(--proto-surface2)",
                  border: "none",
                  borderRadius: "16px",
                  padding: "24px",
                  fontSize: "15px",
                  color: "var(--proto-text)",
                  fontFamily: "var(--proto-font-body)",
                  resize: "none",
                  outline: "none",
                  lineHeight: 1.6
                }}
              />
              <div style={{ position: "absolute", bottom: "16px", right: "16px", background: "var(--proto-surface)", padding: "10px 16px", borderRadius: "20px", fontSize: "10px", fontWeight: 700, color: "var(--proto-text-3)", letterSpacing: "0.05em", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                {wordCount} / 50,000 PATAH PERKATAAN
              </div>
            </div>
          </div>

          {/* Bottom two small cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div className="proto-card" style={{ padding: "24px", cursor: "pointer", transition: "all 0.2s", borderRadius: "20px" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--amber)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--proto-border)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ color: "var(--proto-text-3)", marginBottom: "16px" }}><Sparkles size={24} /></div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "8px", fontFamily: "var(--proto-font)" }}>Analisis Pantas</div>
              <div style={{ fontSize: "12px", color: "var(--proto-text-3)", lineHeight: 1.6 }}>Dapatkan ringkasan eksekutif secara automatik selepas input.</div>
            </div>
            <div className="proto-card" style={{ padding: "24px", cursor: "pointer", transition: "all 0.2s", borderRadius: "20px" }} onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--amber)"; e.currentTarget.style.transform = "translateY(-2px)"; }} onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--proto-border)"; e.currentTarget.style.transform = "none"; }}>
              <div style={{ color: "var(--proto-text-3)", marginBottom: "16px" }}><Link2 size={24} /></div>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--proto-text)", marginBottom: "8px", fontFamily: "var(--proto-font)" }}>Import dari URL</div>
              <div style={{ fontSize: "12px", color: "var(--proto-text-3)", lineHeight: 1.6 }}>Ambil kandungan terus dari laman web akademik atau blog.</div>
            </div>
          </div>

        </div>
      </div>

      {/* THIRD ROW: Audio Kuliah */}
      <div className="proto-card" style={{ padding: "28px 32px", marginTop: "24px", borderRadius: "24px", display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "0 0 auto" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: isRecording ? "rgba(244,67,54,0.15)" : "rgba(184, 92, 0, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: isRecording ? "#f44336" : "var(--amber)" }}>
            <Headphones size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--proto-text)", fontFamily: "var(--proto-font)" }}>
              {lang === "ms" ? "Audio Kuliah" : "Lecture Audio"}
            </h2>
            <div style={{ fontSize: "11px", color: "var(--proto-text-3)", letterSpacing: "0.05em", marginTop: "4px", fontWeight: 600 }}>
              MP3 · M4A · WAV · WEBM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto", flexWrap: "wrap" }}>
          {/* Record / Stop button */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              style={{ background: "var(--amber)", color: "#fff", border: "none", padding: "12px 22px", borderRadius: "24px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(184,92,0,0.2)", transition: "transform 0.2s" }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "none")}
            >
              <Mic size={16} /> {lang === "ms" ? "Mula Rekod" : "Start Recording"}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              style={{ background: "#f44336", color: "#fff", border: "none", padding: "12px 22px", borderRadius: "24px", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(244,67,54,0.25)" }}
            >
              <Square size={14} fill="currentColor" /> {lang === "ms" ? "Hentikan" : "Stop"} · {formatTime(recordingTime)}
            </button>
          )}

          {/* Upload audio file */}
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isRecording || loading}
            style={{ background: "var(--proto-surface2)", color: "var(--proto-text)", border: "1px solid var(--proto-border)", padding: "12px 22px", borderRadius: "24px", fontSize: "13px", fontWeight: 600, cursor: isRecording ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", opacity: isRecording ? 0.5 : 1 }}
          >
            <UploadCloud size={16} /> {lang === "ms" ? "Muat Naik Audio" : "Upload Audio"}
          </button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.flac"
            hidden
            onChange={(e) => {
              if (e.target.files?.[0]) setAudioFile(e.target.files[0]);
            }}
          />

          {/* Selected audio chip */}
          {audioFile && (
            <div style={{ background: "var(--proto-surface2)", padding: "8px 14px", borderRadius: "20px", color: "var(--proto-text)", fontSize: "12px", fontWeight: 600, border: "1px solid var(--amber)", display: "flex", alignItems: "center", gap: "8px", maxWidth: "260px" }}>
              <Headphones size={14} color="var(--amber)" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{audioFile.name}</span>
              <button
                onClick={() => setAudioFile(null)}
                style={{ background: "transparent", border: "none", color: "var(--proto-text-3)", cursor: "pointer", padding: 0, display: "flex" }}
                title={lang === "ms" ? "Buang" : "Remove"}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Items */}
      <div style={{ position: "absolute", bottom: "32px", left: "48px", right: "48px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", pointerEvents: "none" }}>
        
        {/* Left: Avatars */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="https://i.pravatar.cc/150?u=a" alt="A" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid var(--proto-bg)", marginLeft: "0", objectFit: "cover" }} />
            <img src="https://i.pravatar.cc/150?u=b" alt="B" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid var(--proto-bg)", marginLeft: "-10px", objectFit: "cover" }} />
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid var(--proto-bg)", marginLeft: "-10px", background: "var(--proto-surface2)", color: "var(--proto-text)", fontSize: "10px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
              +12
            </div>
          </div>
          <div style={{ fontSize: "13px", color: "var(--proto-text-2)", fontWeight: 500 }}>
            <strong style={{ color: "var(--proto-text)", fontWeight: 700 }}>14 rakan penyelidik</strong> baru sahaja memuat naik bahan hari ini.
          </div>
        </div>

        {/* Right: AI Insight Pulse */}
        <div className="proto-card" style={{ padding: "20px 24px", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "12px", pointerEvents: "auto", borderRadius: "20px", boxShadow: "var(--proto-shadow-lg)", background: "var(--proto-surface)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Sparkles size={14} />
            </div>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--amber)", letterSpacing: "0.05em", fontFamily: "var(--proto-font)" }}>AI INSIGHT PULSE</div>
          </div>
          <div style={{ fontSize: "13px", color: "var(--proto-text)", fontStyle: "italic", lineHeight: 1.6, fontWeight: 500 }}>
            "Tip: Muat naik fail PDF yang mempunyai lapisan teks untuk ketepatan analisis 99.8%."
          </div>
        </div>

      </div>

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(8px)"
        }}>
          <div className="proto-card" style={{ textAlign: "center", padding: "40px", width: "320px", borderRadius: "24px" }}>
            <div className="spinner" style={{ margin: "0 auto 24px", borderTopColor: "var(--amber)" }} />
            <h3 style={{ color: "var(--proto-text)", marginBottom: "8px", fontFamily: "var(--proto-font)", fontSize: "20px" }}>
              {lang === "ms" ? "Sedang Memproses..." : "Processing..."}
            </h3>
            <p style={{ color: "var(--proto-text-2)", fontSize: "14px" }}>
              {progressStep || (lang === "ms" ? "Sila tunggu sebentar" : "Please wait a moment")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
