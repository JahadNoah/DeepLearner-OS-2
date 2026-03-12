import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function Transcript() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [transcript] = useState(location.state?.transcript || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSummarize = async () => {
        setLoading(true);
        setError("");
        const noMatrik = auth.currentUser?.email?.split("@")[0] || "unknown";
        try {
            const res = await axios.post(`${API_URL}/summarize`, {
                IDtranskripsi: id,
                noMatrik
            });
            navigate(`/summary/${res.data.idRingkasan}`, {
                state: { summary: res.data, transcript }
            });
        } catch (err) {
            setError("Gagal menjana ringkasan. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const copyText = () => {
        navigator.clipboard.writeText(transcript?.teksPenuh || "");
    };

    if (!transcript) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p>Transkripsi tidak dijumpai. Sila muat naik audio semula.</p>
                    <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/input")}>
                        ← Kembali ke Input Audio
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="step-badge">Langkah 1 ✓ → Langkah 2 daripada 3</div>
            <h1>📝 Transkripsi Audio</h1>
            <p style={{ marginBottom: "2rem" }}>
                Bahasa dikesan: <strong style={{ color: "var(--primary)" }}>{transcript.bahasa === "ms" ? "🇲🇾 Bahasa Melayu" : "🇬🇧 English"}</strong>
            </p>

            {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Teks Penuh Transkripsi</h3>
                <div className="text-block">{transcript.teksPenuh}</div>
            </div>

            <div className="action-bar">
                <button className="btn btn-outline" onClick={copyText}>📋 Salin Teks</button>
                <button
                    id="summarize-btn"
                    className="btn btn-primary"
                    onClick={handleSummarize}
                    disabled={loading}
                >
                    {loading ? "⏳ Menjana Ringkasan..." : "✨ Jana Ringkasan →"}
                </button>
            </div>

            {loading && (
                <div className="card processing-card" style={{ marginTop: "1.5rem" }}>
                    <div className="spinner" />
                    <h3>AI sedang meringkaskan teks...</h3>
                    <p>Model BART/T5 sedang menganalisis kandungan anda.</p>
                </div>
            )}
        </div>
    );
}
