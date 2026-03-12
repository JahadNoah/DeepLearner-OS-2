import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const TABS = [
    { id: "audio", label: "🎙️ Audio", desc: "Rakam atau muat naik fail audio" },
    { id: "pdf", label: "📄 PDF / Slaid", desc: "Muat naik nota kuliah atau slaid PDF" },
];

export default function AudioInput() {
    const [activeTab, setActiveTab] = useState("audio");

    // Audio state
    const [audioFile, setAudioFile] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [language, setLanguage] = useState("ms");

    // PDF state
    const [pdfFile, setPdfFile] = useState(null);

    // Shared state
    const [loading, setLoading] = useState(false);
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
            setError("Tidak dapat akses mikrofon. Sila benarkan kebenaran.");
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        clearInterval(timerRef.current);
        setIsRecording(false);
    };

    const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

    // ─── Submit Handlers ──────────────────────────────────────
    const handleSubmitAudio = async () => {
        if (!audioFile) return setError("Sila pilih atau rakam fail audio terlebih dahulu.");
        setError(""); setLoading(true);
        const formData = new FormData();
        formData.append("audio", audioFile);
        formData.append("noMatrik", noMatrik);
        formData.append("language", language);
        try {
            const res = await axios.post(`${API_URL}/transcribe`, formData);
            navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
        } catch {
            setError("Gagal memproses audio. Pastikan server backend sedang berjalan.");
        } finally { setLoading(false); }
    };

    const handleSubmitPdf = async () => {
        if (!pdfFile) return setError("Sila pilih fail PDF terlebih dahulu.");
        setError(""); setLoading(true);
        const formData = new FormData();
        formData.append("dokumen", pdfFile);
        formData.append("noMatrik", noMatrik);
        try {
            const res = await axios.post(`${API_URL}/extract-pdf`, formData);
            navigate(`/transcript/${res.data.IDtranskripsi}`, { state: { transcript: res.data } });
        } catch (err) {
            if (!err.response) {
                setError("Tidak dapat sambung ke server. Pastikan backend sedang berjalan di port 8000.");
            } else {
                const msg = err.response?.data?.detail || "Gagal mengekstrak PDF. Sila cuba lagi.";
                setError(typeof msg === "string" ? msg : "Gagal mengekstrak PDF. Sila cuba lagi.");
            }
        } finally { setLoading(false); }
    };

    // ─── Drag & Drop ─────────────────────────────────────────
    const handleDrop = (e, type) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (!f) return;
        if (type === "audio" && f.type.startsWith("audio/")) setAudioFile(f);
        if (type === "pdf" && f.name.toLowerCase().endsWith(".pdf")) setPdfFile(f);
    };

    const selectedFile = activeTab === "audio" ? audioFile : pdfFile;

    return (
        <div className="page">
            <div className="step-badge">Langkah 1 daripada 3</div>
            <h1>📥 Input Kandungan</h1>
            <p style={{ marginBottom: "2rem" }}>Pilih kaedah input — audio atau PDF/slaid — untuk ditukar kepada nota, ringkasan & kuiz.</p>

            {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}

            {/* ── Tab Switcher ── */}
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.75rem" }}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
                        onClick={() => { setActiveTab(tab.id); setError(""); }}
                        style={{ flex: 1, justifyContent: "center" }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════
          AUDIO TAB
      ══════════════════════════════════════ */}
            {activeTab === "audio" && (
                <>
                    {/* Language selector */}
                    <div className="card" style={{ marginBottom: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1rem" }}>🌐 Bahasa Audio</h3>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            {[["ms", "🇲🇾 Bahasa Melayu"], ["en", "🇬🇧 English"]].map(([val, label]) => (
                                <button key={val} className={`btn ${language === val ? "btn-primary" : "btn-outline"}`} onClick={() => setLanguage(val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Live Recording */}
                    <div className="card" style={{ marginBottom: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1rem" }}>🔴 Rakaman Langsung</h3>
                        {isRecording ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                <div className="recording-indicator"><div className="rec-dot" /> Merakam... {formatTime(recordingTime)}</div>
                                <button className="btn btn-danger" onClick={stopRecording}>⏹ Henti Rakaman</button>
                            </div>
                        ) : (
                            <button className="btn btn-primary" onClick={startRecording}>🎙️ Mula Rakam</button>
                        )}
                    </div>

                    {/* File Upload */}
                    <div className="card" style={{ marginBottom: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1rem" }}>📁 Muat Naik Fail Audio</h3>
                        <div
                            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => handleDrop(e, "audio")}
                            onClick={() => document.getElementById("audio-input").click()}
                        >
                            <div className="upload-icon">📂</div>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>Klik atau seret fail audio ke sini</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Sokongan: .mp3, .wav, .m4a, .webm, .ogg</p>
                            <input id="audio-input" type="file" accept="audio/*" hidden onChange={(e) => setAudioFile(e.target.files[0])} />
                        </div>
                    </div>

                    {selectedFile && (
                        <div className="card" style={{ marginBottom: "1.5rem", background: "rgba(108,99,255,0.08)", borderColor: "var(--primary)" }}>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>✅ Fail dipilih: {selectedFile.name}</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Saiz: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    )}

                    <button id="transcribe-btn" className="btn btn-primary" onClick={handleSubmitAudio}
                        disabled={loading || !audioFile} style={{ width: "100%", justifyContent: "center", padding: "1rem" }}>
                        {loading ? "⏳ Sedang memproses..." : "🚀 Jana Transkripsi Audio"}
                    </button>
                </>
            )}

            {/* ══════════════════════════════════════
          PDF / SLIDE TAB
      ══════════════════════════════════════ */}
            {activeTab === "pdf" && (
                <>
                    <div className="card" style={{ marginBottom: "1.5rem" }}>
                        <h3 style={{ marginBottom: "0.5rem" }}>📄 Muat Naik Nota / Slaid PDF</h3>
                        <p style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                            Sistem akan mengekstrak teks daripada PDF anda, lalu menjana ringkasan dan kuiz secara automatik.
                        </p>

                        <div
                            className={`upload-zone ${dragOver ? "drag-over" : ""}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => handleDrop(e, "pdf")}
                            onClick={() => document.getElementById("pdf-input").click()}
                        >
                            <div className="upload-icon">📑</div>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>Klik atau seret fail PDF ke sini</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Format: .pdf (nota kuliah, slaid PowerPoint yang disimpan sebagai PDF)</p>
                            <input id="pdf-input" type="file" accept=".pdf" hidden onChange={(e) => setPdfFile(e.target.files[0])} />
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="card" style={{ marginBottom: "1.5rem", background: "rgba(67,232,216,0.05)", borderColor: "rgba(67,232,216,0.2)" }}>
                        <h3 style={{ marginBottom: "0.75rem", color: "var(--accent)" }}>💡 Tips</h3>
                        <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.9rem", color: "var(--text-sub)" }}>
                            <li>PDF mesti mengandungi teks sebenar (bukan imbasan/imej)</li>
                            <li>Slaid PowerPoint → simpan sebagai PDF sebelum muat naik</li>
                            <li>Semakin banyak teks dalam PDF, semakin baik nota yang dijana</li>
                        </ul>
                    </div>

                    {pdfFile && (
                        <div className="card" style={{ marginBottom: "1.5rem", background: "rgba(108,99,255,0.08)", borderColor: "var(--primary)" }}>
                            <p style={{ color: "var(--text)", fontWeight: 600 }}>✅ Fail dipilih: {pdfFile.name}</p>
                            <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>Saiz: {(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    )}

                    <button id="extract-pdf-btn" className="btn btn-primary" onClick={handleSubmitPdf}
                        disabled={loading || !pdfFile} style={{ width: "100%", justifyContent: "center", padding: "1rem" }}>
                        {loading ? "⏳ Sedang mengekstrak teks..." : "📄 Ekstrak & Jana Nota"}
                    </button>
                </>
            )}

            {/* Loading overlay */}
            {loading && (
                <div className="card processing-card" style={{ marginTop: "1.5rem" }}>
                    <div className="spinner" />
                    <h3>{activeTab === "pdf" ? "AI sedang membaca PDF anda..." : "AI sedang memproses audio anda..."}</h3>
                    <p>{activeTab === "pdf" ? "Mengekstrak teks dan menyediakan untuk ringkasan..." : "Ini mungkin mengambil masa beberapa minit bergantung kepada panjang audio."}</p>
                </div>
            )}
        </div>
    );
}
