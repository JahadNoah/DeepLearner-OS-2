import { Link } from "react-router-dom";
import { auth } from "../firebase";

const features = [
    {
        icon: "🎙️",
        title: "Input Audio",
        desc: "Rakam suara langsung atau muat naik fail audio untuk diproses AI.",
        path: "/input",
        color: "#6C63FF"
    },
    {
        icon: "📝",
        title: "Transkripsi Pintar",
        desc: "Audio ditukar kepada teks automatik dalam BM & Inggeris.",
        path: "/input",
        color: "#43E8D8"
    },
    {
        icon: "✨",
        title: "Ringkasan Automatik",
        desc: "Teks panjang diringkaskan dengan AI untuk pembelajaran efisien.",
        path: "/input",
        color: "#FF6584"
    },
    {
        icon: "❓",
        title: "Penjana Kuiz",
        desc: "Jana soalan kuiz MCQ daripada ringkasan secara automatik.",
        path: "/input",
        color: "#FFB74D"
    },
    {
        icon: "📚",
        title: "Sejarah Nota",
        desc: "Lihat semula semua sesi pembelajaran yang telah disimpan.",
        path: "/history",
        color: "#4CAF75"
    }
];

export default function Dashboard() {
    const user = auth.currentUser;
    const name = user?.displayName?.split(" ")[0] || "Pelajar";

    return (
        <div className="page">
            {/* Page header — mirrors the image's title + action row */}
            <div className="page-header">
                <div>
                    <div className="step-badge">✦ DeepLearner OS</div>
                    <h1 style={{ marginTop: "0.5rem", marginBottom: "0.375rem" }}>
                        Selamat datang, {name}! 👋
                    </h1>
                    <p>Platform pembelajaran aktif berkuasa AI untuk belajar lebih efektif.</p>
                </div>
                <div className="page-header-actions">
                    <Link to="/input" className="btn btn-primary">🎙️ Sesi Baharu</Link>
                    <Link to="/history" className="btn btn-outline">📚 Sejarah</Link>
                </div>
            </div>

            {/* Quick stat chips */}
            <div className="stat-chips">
                <div className="stat-chip">
                    <span className="stat-chip-icon">🎙️</span>
                    <div>
                        <div className="stat-chip-label">Input Audio & PDF</div>
                        <div className="stat-chip-sub">Rakam atau muat naik</div>
                    </div>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-icon">✨</span>
                    <div>
                        <div className="stat-chip-label">Ringkasan AI</div>
                        <div className="stat-chip-sub">Automatik & cepat</div>
                    </div>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-icon">❓</span>
                    <div>
                        <div className="stat-chip-label">Kuiz Interaktif</div>
                        <div className="stat-chip-sub">Jana MCQ sekelip mata</div>
                    </div>
                </div>
            </div>

            <h2 style={{ marginBottom: "1.125rem", marginTop: "0.5rem" }}>Fungsi Utama</h2>
            <div className="feature-grid">
                {features.map((f) => (
                    <Link key={f.title} to={f.path} className="feature-card" style={{ textDecoration: "none" }}>
                        <div className="feature-icon" style={{ background: `${f.color}18`, borderColor: `${f.color}30` }}>
                            {f.icon}
                        </div>
                        <div className="feature-title">{f.title}</div>
                        <p className="feature-desc">{f.desc}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
