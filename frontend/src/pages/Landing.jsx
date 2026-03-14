import { Link } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../context/useTheme";

/* ─── SVG Icons ─────────────────────────────────────────────── */
const IconLayers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
);
const IconArrow = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);
const IconPlay = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
);
const IconCheck = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const IconMic = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);
const IconSparkles = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
);
const IconBrain = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3Z" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3Z" />
    </svg>
);
const IconDoc = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);
const IconQuiz = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

/* ─── Data ──────────────────────────────────────────────────── */
const FEATURES = [
    {
        icon: <IconMic />,
        color: "#6C63FF",
        title: "Transkripsi Audio Pintar",
        desc: "Rakam kuliah atau muat naik fail audio — AI menukar ucapan kepada teks yang tepat dalam BM & Inggeris secara automatik."
    },
    {
        icon: <IconSparkles />,
        color: "#FF6584",
        title: "Ringkasan Berkuasa AI",
        desc: "Nota panjang diringkaskan kepada poin penting dalam masa beberapa saat. Fokus pada apa yang benar-benar penting."
    },
    {
        icon: <IconBrain />,
        color: "#43E8D8",
        title: "Penjana Kuiz Adaptif",
        desc: "Jana soalan MCQ berkaitan kuliah anda secara automatik. Uji pemahaman dan perkukuh ingatan dengan kuiz interaktif."
    },
    {
        icon: <IconDoc />,
        color: "#FFB74D",
        title: "Sokongan PDF & Slaid",
        desc: "Muat naik nota kuliah PDF atau slaid pembentangan untuk ditukar kepada ringkasan dan kuiz dengan serta-merta."
    },
    {
        icon: <IconQuiz />,
        color: "#4CAF75",
        title: "Sejarah Pembelajaran",
        desc: "Semua sesi disimpan dalam pustaka nota peribadi anda. Cari, imbas semula, dan teruskan pembelajaran bila-bila masa."
    },
    {
        icon: <IconLayers />,
        color: "#EC4899",
        title: "Multi-Bahasa",
        desc: "Sokong Bahasa Melayu dan Inggeris sepenuhnya. Model Gemini AI dioptimumkan khusus untuk konteks akademik tempatan."
    }
];

const STEPS = [
    {
        num: "01",
        title: "Rakam atau Muat Naik",
        desc: "Rakam kuliah secara langsung melalui mikrofon atau muat naik fail audio/PDF yang sedia ada.",
        color: "#6C63FF"
    },
    {
        num: "02",
        title: "AI Memproses Kandungan",
        desc: "Gemini AI akan mentranskrip, meringkas, dan menjana kuiz daripada kandungan anda dalam beberapa saat.",
        color: "#FF6584"
    },
    {
        num: "03",
        title: "Belajar dengan Lebih Berkesan",
        desc: "Semak nota ringkas dan jawab kuiz interaktif untuk menguatkan pemahaman dan meningkatkan prestasi.",
        color: "#43E8D8"
    }
];

const PERKS = [
    "Percuma untuk pelajar",
    "Tanpa had muat naik",
    "Simpan untuk selama-lamanya",
    "Sokongan penuh BM & EN"
];

/* ─── Component ─────────────────────────────────────────────── */
export default function Landing() {
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="landing">
            {/* Gradient orbs */}
            <div className="landing-orb landing-orb-1" />
            <div className="landing-orb landing-orb-2" />
            <div className="landing-orb landing-orb-3" />

            {/* ── Nav ── */}
            <header className="landing-nav">
                <div className="landing-nav-inner">
                    <Link to="/" className="landing-nav-logo">
                        <div className="landing-nav-logo-icon"><IconLayers /></div>
                        <span>DeepLearner</span>
                    </Link>

                    <nav className="landing-nav-links">
                        <a href="#features" className="landing-nav-link">Ciri-ciri</a>
                        <a href="#steps" className="landing-nav-link">Cara Guna</a>
                    </nav>

                    <div className="landing-nav-cta">
                        <button
                            onClick={toggleTheme}
                            className="landing-theme-btn"
                            title="Tukar tema"
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <Link to="/login" className="btn btn-outline landing-nav-cta-hide-sm" style={{ fontSize: "0.85rem", padding: "0.45rem 1.1rem" }}>
                            Log Masuk
                        </Link>
                        <Link to="/register" className="btn btn-primary landing-nav-cta-hide-sm" style={{ fontSize: "0.85rem", padding: "0.45rem 1.1rem" }}>
                            Mulakan Percuma
                        </Link>
                        <button
                            className="landing-nav-hamburger"
                            onClick={() => setMobileMenuOpen(o => !o)}
                            aria-label="Toggle menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            {mobileMenuOpen ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div className="landing-mobile-menu">
                        <a href="#features" className="landing-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Ciri-ciri</a>
                        <a href="#steps" className="landing-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Cara Guna</a>
                        <div className="landing-mobile-menu-divider" />
                        <Link to="/login" className="landing-mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>Log Masuk</Link>
                        <Link to="/register" className="landing-mobile-menu-cta" onClick={() => setMobileMenuOpen(false)}>Mulakan Percuma</Link>
                    </div>
                )}
            </header>

            {/* ── Hero ── */}
            <section className="landing-hero">
                <div className="landing-hero-inner">
                    <div className="landing-badge">
                        <span className="landing-badge-dot" />
                        Dikuasakan Gemini AI · Untuk Pelajar Malaysia
                    </div>

                    <h1 className="landing-headline">
                        Tukar Kuliah Menjadi<br />
                        <span className="landing-gradient-text">Nota Pintar Sekelip Mata</span>
                    </h1>

                    <p className="landing-subtext">
                        Platform pembelajaran aktif yang mentranskrip audio kuliah, meringkaskan nota,
                        dan menjana kuiz MCQ secara automatik menggunakan kecerdasan buatan.
                    </p>

                    <div className="landing-hero-btns">
                        <Link to="/register" className="btn btn-primary landing-btn-lg">
                            Mulakan Percuma <IconArrow />
                        </Link>
                        <a href="#steps" className="btn btn-ghost landing-btn-lg">
                            <span className="landing-play-icon"><IconPlay /></span>
                            Lihat Cara Guna
                        </a>
                    </div>

                    <div className="landing-perks">
                        {PERKS.map(p => (
                            <div key={p} className="landing-perk">
                                <span className="landing-perk-check"><IconCheck /></span>
                                {p}
                            </div>
                        ))}
                    </div>

                    {/* Hero mock UI */}
                    <div className="landing-hero-card">
                        <div className="landing-hero-card-bar">
                            <div className="lhc-dot" style={{ background: "#FF5F57" }} />
                            <div className="lhc-dot" style={{ background: "#FFBD2E" }} />
                            <div className="lhc-dot" style={{ background: "#27C93F" }} />
                            <div className="lhc-title">DeepLearner — Ringkasan AI</div>
                        </div>
                        <div className="landing-hero-card-body">
                            <div className="lhc-step-row">
                                <div className="lhc-step done">✓ Transkripsi</div>
                                <div className="lhc-step active">● Ringkasan</div>
                                <div className="lhc-step">○ Kuiz</div>
                            </div>
                            <div className="lhc-section-label">Ringkasan Kandungan</div>
                            <div className="lhc-lines">
                                <div className="lhc-line lhc-line-full" />
                                <div className="lhc-line lhc-line-full" />
                                <div className="lhc-line" style={{ width: "72%" }} />
                            </div>
                            <div className="lhc-point-row">
                                {["Konsep Utama", "Aplikasi", "Rumusan"].map(t => (
                                    <div key={t} className="lhc-point">
                                        <span className="lhc-point-dot" />
                                        <div>
                                            <div className="lhc-point-label">{t}</div>
                                            <div className="lhc-point-bar" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="lhc-quiz-preview">
                                <div className="lhc-quiz-label">✦ Jana Kuiz daripada ringkasan ini</div>
                                <button className="lhc-quiz-btn">Jana Kuiz →</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="landing-section" id="features">
                <div className="landing-section-inner">
                    <div className="landing-section-badge">Semua Dalam Satu Platform</div>
                    <h2 className="landing-section-title">
                        Segala yang anda perlukan<br />untuk belajar lebih berkesan
                    </h2>
                    <p className="landing-section-sub">
                        Dari audio kuliah hingga kuiz interaktif — DeepLearner menguruskan semuanya supaya anda boleh fokus kepada memahami, bukan mencatat.
                    </p>

                    <div className="landing-feature-grid">
                        {FEATURES.map((f, i) => (
                            <div key={i} className="landing-feature-card" style={{ animationDelay: `${i * 0.07}s` }}>
                                <div className="landing-feature-icon" style={{ background: `${f.color}18`, borderColor: `${f.color}30`, color: f.color }}>
                                    {f.icon}
                                </div>
                                <div className="landing-feature-title">{f.title}</div>
                                <p className="landing-feature-desc">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ── */}
            <section className="landing-section landing-steps-section" id="steps">
                <div className="landing-orb landing-orb-4" />
                <div className="landing-section-inner">
                    <div className="landing-section-badge">Mudah &amp; Pantas</div>
                    <h2 className="landing-section-title">Cara Guna DeepLearner</h2>
                    <p className="landing-section-sub">
                        Tiga langkah mudah untuk mengubah cara anda belajar.
                    </p>

                    <div className="landing-steps-grid">
                        {STEPS.map((s, i) => (
                            <div key={i} className="landing-step-card" style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="landing-step-num" style={{ color: s.color, borderColor: `${s.color}30`, background: `${s.color}10` }}>
                                    {s.num}
                                </div>
                                {i < STEPS.length - 1 && <div className="landing-step-connector" />}
                                <div className="landing-step-title">{s.title}</div>
                                <p className="landing-step-desc">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA Banner ── */}
            <section className="landing-cta-section">
                <div className="landing-cta-orb" />
                <div className="landing-section-inner">
                    <div className="landing-cta-card">
                        <div className="landing-badge" style={{ marginBottom: "1.25rem" }}>
                            <span className="landing-badge-dot" />
                            Sertai 500+ Pelajar Malaysia
                        </div>
                        <h2 className="landing-cta-title">
                            Bersedia untuk belajar<br />
                            <span className="landing-gradient-text">dengan cara lebih pintar?</span>
                        </h2>
                        <p className="landing-cta-sub">
                            Daftar percuma hari ini. Tiada kad kredit diperlukan.
                        </p>
                        <div className="landing-cta-btns">
                            <Link to="/register" className="btn btn-primary landing-btn-lg">
                                Daftar Percuma Sekarang <IconArrow />
                            </Link>
                            <Link to="/login" className="btn btn-glass landing-btn-lg">
                                Log Masuk
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="landing-footer">
                <div className="landing-section-inner">
                    <div className="landing-footer-inner">
                        <div className="landing-nav-logo" style={{ pointerEvents: "none" }}>
                            <div className="landing-nav-logo-icon"><IconLayers /></div>
                            <span>DeepLearner</span>
                        </div>
                        <p className="landing-footer-copy">
                            © 2026 DeepLearner. Dibina untuk pelajar Malaysia.
                        </p>
                        <div className="landing-footer-links">
                            <Link to="/login" className="landing-footer-link">Log Masuk</Link>
                            <Link to="/register" className="landing-footer-link">Daftar</Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
