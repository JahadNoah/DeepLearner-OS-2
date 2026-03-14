import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { auth } from "../firebase";
import axios from "axios";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export default function Transcript() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { lang } = useLanguage();
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
            setError(t(lang, "transcript.errSummarize"));
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
                    <p>{t(lang, "transcript.notFound")}</p>
                    <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => navigate("/input")}>
                        {t(lang, "transcript.backBtn")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="step-badge">{t(lang, "transcript.stepBadge")}</div>
            <h1>{t(lang, "transcript.heading")}</h1>
            <p style={{ marginBottom: "2rem" }}>
                {t(lang, "transcript.langDetected")} <strong style={{ color: "var(--primary)" }}>{transcript.bahasa === "ms" ? t(lang, "transcript.langMs") : t(lang, "transcript.langEn")}</strong>
            </p>

            {error && <div className="error-msg" style={{ marginBottom: "1rem" }}>{error}</div>}

            <div className="card" style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ marginBottom: "1rem" }}>{t(lang, "transcript.fullText")}</h3>
                <div className="text-block">{transcript.teksPenuh}</div>
            </div>

            <div className="action-bar">
                <button className="btn btn-outline" onClick={copyText}>{t(lang, "transcript.copyBtn")}</button>
                <button
                    id="summarize-btn"
                    className="btn btn-primary"
                    onClick={handleSummarize}
                    disabled={loading}
                >
                    {loading ? t(lang, "transcript.summarizeLoading") : t(lang, "transcript.summarizeBtn")}
                </button>
            </div>

            {loading && (
                <div className="card processing-card" style={{ marginTop: "1.5rem" }}>
                    <div className="spinner" />
                    <h3>{t(lang, "transcript.loadingHeading")}</h3>
                    <p>{t(lang, "transcript.loadingBody")}</p>
                </div>
            )}
        </div>
    );
}

