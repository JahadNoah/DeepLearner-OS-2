import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link } from "react-router-dom";

const IconLayers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
);
const IconMail = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
    </svg>
);
const IconLock = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);
const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);

const FEATURES = [
    { icon: "🎙️", text: "Transkripsi audio kuliah secara automatik" },
    { icon: "✨", text: "Ringkasan AI dalam masa beberapa saat" },
    { icon: "❓", text: "Jana kuiz MCQ daripada kandungan kuliah" },
];

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err) {
            setError("E-mel atau kata laluan tidak sah. Sila cuba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

    return (
        <div className="split-auth split-auth--glass">
            {/* ── Video background ── */}
            <video className="split-auth-glass-video" src={VIDEO_URL} autoPlay muted loop playsInline />
            <div className="split-auth-glass-overlay" />

            {/* ── Left branding panel ── */}
            <div className="split-auth-left">
                <div className="split-auth-left-orb split-auth-orb-1" />
                <div className="split-auth-left-orb split-auth-orb-2" />
                <div className="split-auth-left-orb split-auth-orb-3" />

                <div className="split-auth-left-content">
                    {/* Logo */}
                    <Link to="/" className="split-auth-logo">
                        <div className="split-auth-logo-icon"><IconLayers /></div>
                        <span>DeepLearner</span>
                    </Link>

                    {/* Headline */}
                    <div className="split-auth-headline-wrap">
                        <div className="split-auth-badge">✦ Berkuasa Gemini AI</div>
                        <h1 className="split-auth-headline">
                            Belajar Lebih Pintar,<br />
                            <span className="split-auth-gradient">Bukan Lebih Keras</span>
                        </h1>
                        <p className="split-auth-caption">
                            Platform AI yang mentranskrip kuliah, meringkaskan nota, dan menjana kuiz untuk anda secara automatik.
                        </p>
                    </div>

                    {/* Feature list */}
                    <ul className="split-auth-features">
                        {FEATURES.map((f, i) => (
                            <li key={i} className="split-auth-feature">
                                <span className="split-auth-feature-icon">{f.icon}</span>
                                <span>{f.text}</span>
                            </li>
                        ))}
                    </ul>

                    {/* Decorative grid dots */}
                    <div className="split-auth-dots" aria-hidden="true">
                        {Array.from({ length: 35 }).map((_, i) => <span key={i} />)}
                    </div>
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="split-auth-right">
                <div className="split-auth-form-wrap">
                    {/* Back link */}
                    <Link to="/" className="split-auth-back">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        Kembali ke laman utama
                    </Link>

                    {/* Heading */}
                    <div className="split-auth-form-header">
                        <h2>Selamat kembali 👋</h2>
                        <p>Log masuk ke akaun DeepLearner anda.</p>
                    </div>

                    <form className="split-auth-form" onSubmit={handleLogin}>
                        {error && (
                            <div className="split-auth-error">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </div>
                        )}

                        <div className="split-input-group">
                            <label className="split-input-label">E-mel</label>
                            <div className="split-input-wrap">
                                <span className="split-input-icon"><IconMail /></span>
                                <input
                                    id="email"
                                    className="split-input split-input--with-icon"
                                    type="email"
                                    placeholder="pelajar@ukm.edu.my"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="split-input-group">
                            <label className="split-input-label">Kata Laluan</label>
                            <div className="split-input-wrap">
                                <span className="split-input-icon"><IconLock /></span>
                                <input
                                    id="password"
                                    className="split-input split-input--with-icon"
                                    type={showPw ? "text" : "password"}
                                    placeholder="Masukkan kata laluan"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="split-pw-toggle"
                                    onClick={() => setShowPw(v => !v)}
                                    tabIndex={-1}
                                >
                                    {showPw ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-btn"
                            className="split-auth-btn"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="split-btn-spinner" />
                            ) : (
                                <>
                                    Log Masuk
                                    <IconArrow />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="split-auth-divider">
                        <span>atau</span>
                    </div>

                    <p className="split-auth-switch">
                        Belum ada akaun?{" "}
                        <Link to="/register">Daftar percuma</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
