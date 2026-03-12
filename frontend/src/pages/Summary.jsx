import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import axios from "axios";
import jsPDF from "jspdf";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function Summary() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(location.state?.summary || null);
    const [transcript] = useState(location.state?.transcript || null);
    const [loading, setLoading] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(!location.state?.summary);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(false);

    // When navigating from History (no location.state), fetch summary from API
    useEffect(() => {
        if (!summary && id) {
            setLoadingSummary(true);
            axios.get(`${API_URL}/ringkasan/${id}`)
                .then(res => setSummary(res.data))
                .catch(() => setError("Gagal memuatkan ringkasan."))
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
                num_questions: 5
            });
            navigate(`/quiz/${id}`, {
                state: { quiz: res.data, summary, transcript }
            });
        } catch (err) {
            setError("Gagal menjana kuiz. Sila cuba lagi.");
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
                tarikhSimpan: serverTimestamp()
            });
            setSaved(true);
        } catch (err) {
            setError("Gagal menyimpan nota.");
        } finally {
            setSaving(false);
        }
    };

    const handleExportPDF = () => {
        const pdf = new jsPDF();
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("DeepLearner OS - Ringkasan", 20, 20);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        pdf.text(`Tarikh: ${new Date().toLocaleDateString("ms-MY")}`, 20, 32);

        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text("Ringkasan:", 20, 48);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        const summaryLines = pdf.splitTextToSize(summary?.teksRingkasan || "", 170);
        pdf.text(summaryLines, 20, 58);

        pdf.save(`DeepLearner_Ringkasan_${Date.now()}.pdf`);
    };

    if (loadingSummary) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                    <p style={{ marginTop: "1rem" }}>Memuatkan ringkasan...</p>
                </div>
            </div>
        );
    }

    if (!summary) {
        return (
            <div className="page">
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <p>{error || "Ringkasan tidak dijumpai."}</p>
                    <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/input")}>
                        ← Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="step-badge">Langkah 1 ✓ → Langkah 2 ✓ → Langkah 3 daripada 3</div>
            <h1>✨ Ringkasan Automatik</h1>
            <p style={{ marginBottom: "2rem" }}>AI telah meringkaskan transkripsi anda. Semak dan teruskan untuk menjana kuiz.</p>

            {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}
            {saved && (
                <div className="error-msg" style={{ marginBottom: "1rem", background: "rgba(76,175,117,0.1)", borderColor: "rgba(76,175,117,0.3)", color: "var(--success)" }}>
                    ✅ Nota berjaya disimpan ke sejarah anda!
                </div>
            )}

            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>Teks Ringkasan</h3>
                <div className="text-block">{summary.teksRingkasan}</div>
            </div>

            <div className="action-bar">
                <button className="btn btn-outline" onClick={handleExportPDF}>📄 Eksport PDF</button>
                <button className="btn btn-outline" onClick={handleSave} disabled={saving || saved}>
                    {saved ? "✅ Disimpan" : saving ? "Menyimpan..." : "💾 Simpan Nota"}
                </button>
                <button
                    id="quiz-btn"
                    className="btn btn-primary"
                    onClick={handleGenerateQuiz}
                    disabled={loading}
                >
                    {loading ? "⏳ Menjana Kuiz..." : "❓ Jana Kuiz MCQ →"}
                </button>
            </div>

            {loading && (
                <div className="card processing-card" style={{ marginTop: "1.5rem" }}>
                    <div className="spinner" />
                    <h3>AI sedang menjana soalan kuiz...</h3>
                    <p>Ini mengambil masa beberapa saat sahaja.</p>
                </div>
            )}
        </div>
    );
}
