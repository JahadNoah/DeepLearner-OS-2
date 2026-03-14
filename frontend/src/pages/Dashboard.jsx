import { Link } from "react-router-dom";
import { auth } from "../firebase";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";

export default function Dashboard() {
    const user = auth.currentUser;
    const { lang } = useLanguage();
    const name = user?.displayName?.split(" ")[0] || t(lang, "dashboard.defaultName");

    const features = [
        { icon: "🎙️", titleKey: "dashboard.f1Title", descKey: "dashboard.f1Desc", path: "/input", color: "#6C63FF" },
        { icon: "📝", titleKey: "dashboard.f2Title", descKey: "dashboard.f2Desc", path: "/input", color: "#43E8D8" },
        { icon: "✨", titleKey: "dashboard.f3Title", descKey: "dashboard.f3Desc", path: "/input", color: "#FF6584" },
        { icon: "❓", titleKey: "dashboard.f4Title", descKey: "dashboard.f4Desc", path: "/input", color: "#FFB74D" },
        { icon: "📚", titleKey: "dashboard.f5Title", descKey: "dashboard.f5Desc", path: "/history", color: "#4CAF75" },
    ];

    return (
        <div className="page">
            <div className="page-header">
                <div>
                    <div className="step-badge">{t(lang, "dashboard.badge")}</div>
                    <h1 style={{ marginTop: "0.5rem", marginBottom: "0.375rem" }}>
                        {t(lang, "dashboard.welcome", { name })}
                    </h1>
                    <p>{t(lang, "dashboard.subtitle")}</p>
                </div>
                <div className="page-header-actions">
                    <Link to="/input" className="btn btn-primary">{t(lang, "dashboard.newSession")}</Link>
                    <Link to="/history" className="btn btn-outline">{t(lang, "dashboard.historyBtn")}</Link>
                </div>
            </div>

            <div className="stat-chips">
                <div className="stat-chip">
                    <span className="stat-chip-icon">🎙️</span>
                    <div>
                        <div className="stat-chip-label">{t(lang, "dashboard.chip1Label")}</div>
                        <div className="stat-chip-sub">{t(lang, "dashboard.chip1Sub")}</div>
                    </div>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-icon">✨</span>
                    <div>
                        <div className="stat-chip-label">{t(lang, "dashboard.chip2Label")}</div>
                        <div className="stat-chip-sub">{t(lang, "dashboard.chip2Sub")}</div>
                    </div>
                </div>
                <div className="stat-chip">
                    <span className="stat-chip-icon">❓</span>
                    <div>
                        <div className="stat-chip-label">{t(lang, "dashboard.chip3Label")}</div>
                        <div className="stat-chip-sub">{t(lang, "dashboard.chip3Sub")}</div>
                    </div>
                </div>
            </div>

            <h2 style={{ marginBottom: "1.125rem", marginTop: "0.5rem" }}>{t(lang, "dashboard.featuresHeading")}</h2>
            <div className="feature-grid">
                {features.map((f) => (
                    <Link key={f.titleKey} to={f.path} className="feature-card" style={{ textDecoration: "none" }}>
                        <div className="feature-icon" style={{ background: `${f.color}18`, borderColor: `${f.color}30` }}>
                            {f.icon}
                        </div>
                        <div className="feature-title">{t(lang, f.titleKey)}</div>
                        <p className="feature-desc">{t(lang, f.descKey)}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
