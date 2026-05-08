import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { Link } from "react-router-dom";

const IconLayers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
);
const IconArrow = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
);

const STEPS = [
    { num: "01", label: "Daftar akaun percuma" },
    { num: "02", label: "Muat naik audio atau PDF kuliah" },
    { num: "03", label: "Dapatkan nota, ringkasan & kuiz" },
];

export default function Register() {
    const [form, setForm] = useState({ nama: "", noMatrik: "", emel: "", kataLaluan: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPw, setShowPw] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const cred = await createUserWithEmailAndPassword(auth, form.emel, form.kataLaluan);
            await updateProfile(cred.user, { displayName: form.nama });
            await setDoc(doc(db, "pelajar", form.noMatrik), {
                noMatrik: form.noMatrik,
                nama: form.nama,
                emel: form.emel,
                uid: cred.user.uid,
                tarikhDaftar: serverTimestamp()
            });
        } catch (err) {
            if (err.code === "auth/email-already-in-use") {
                setError("E-mel ini telah didaftarkan. Sila log masuk.");
            } else if (err.code === "auth/weak-password") {
                setError("Kata laluan mesti sekurang-kurangnya 6 aksara.");
            } else {
                setError("Gagal mendaftar. Sila cuba lagi.");
            }
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) =>
        `split-input${form[name] ? " split-input--filled" : ""}`;

    const VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4";

    return (
        <div className="split-auth split-auth--glass">
            {/* ── Video background ── */}
            <video className="split-auth-glass-video" src={VIDEO_URL} autoPlay muted loop playsInline />
            <div className="split-auth-glass-overlay" />

            {/* ── Left branding panel ── */}
            <div className="split-auth-left split-auth-left--accent">
                <div className="split-auth-left-orb split-auth-orb-1" />
                <div className="split-auth-left-orb split-auth-orb-2" />
                <div className="split-auth-left-orb split-auth-orb-3" />

                <div className="split-auth-left-content">
                    <Link to="/" className="split-auth-logo">
                        <div className="split-auth-logo-icon"><IconLayers /></div>
                        <span>DeepLearner</span>
                    </Link>

                    <div className="split-auth-headline-wrap">
                        <div className="split-auth-badge">✦ Mulakan Perjalanan Anda</div>
                        <h1 className="split-auth-headline">
                            Buka Potensi<br />
                            <span className="split-auth-gradient">Pembelajaran Anda</span>
                        </h1>
                        <p className="split-auth-caption">
                            Sertai pelajar Malaysia yang belajar lebih efektif dengan bantuan Gemini AI.
                        </p>
                    </div>

                    <div className="split-auth-steps">
                        {STEPS.map((s, i) => (
                            <div key={i} className="split-auth-step">
                                <div className="split-auth-step-num">{s.num}</div>
                                <div className="split-auth-step-label">{s.label}</div>
                                {i < STEPS.length - 1 && <div className="split-auth-step-line" />}
                            </div>
                        ))}
                    </div>

                    <div className="split-auth-dots" aria-hidden="true">
                        {Array.from({ length: 35 }).map((_, i) => <span key={i} />)}
                    </div>
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="split-auth-right">
                <div className="split-auth-form-wrap">
                    <Link to="/" className="split-auth-back">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
                        </svg>
                        Kembali ke laman utama
                    </Link>

                    <div className="split-auth-form-header">
                        <h2>Cipta Akaun Baharu 🚀</h2>
                        <p>Percuma selamanya. Tiada kad kredit diperlukan.</p>
                    </div>

                    <form className="split-auth-form" onSubmit={handleRegister}>
                        {error && (
                            <div className="split-auth-error">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                {error}
                            </div>
                        )}

                        <div className="split-auth-form-row">
                            <div className="split-input-group">
                                <label className="split-input-label">Nama Penuh</label>
                                <div className="split-input-wrap">
                                    <input className={inputClass("nama")} name="nama" placeholder="Muhammad Ali bin..." value={form.nama} onChange={handleChange} required autoComplete="name" />
                                </div>
                            </div>
                            <div className="split-input-group">
                                <label className="split-input-label">No. Matrik</label>
                                <div className="split-input-wrap">
                                    <input className={inputClass("noMatrik")} name="noMatrik" placeholder="A203464" value={form.noMatrik} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="split-input-group">
                            <label className="split-input-label">E-mel</label>
                            <div className="split-input-wrap">
                                <input className={inputClass("emel")} type="email" name="emel" placeholder="pelajar@ukm.edu.my" value={form.emel} onChange={handleChange} required autoComplete="email" />
                            </div>
                        </div>

                        <div className="split-input-group">
                            <label className="split-input-label">Kata Laluan</label>
                            <div className="split-input-wrap">
                                <input
                                    className={inputClass("kataLaluan")}
                                    type={showPw ? "text" : "password"}
                                    name="kataLaluan"
                                    placeholder="Min. 6 aksara"
                                    value={form.kataLaluan}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                />
                                <button type="button" className="split-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                                    {showPw ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>

                        <button id="register-btn" className="split-auth-btn" type="submit" disabled={loading}>
                            {loading ? (
                                <span className="split-btn-spinner" />
                            ) : (
                                <>Daftar Sekarang <IconArrow /></>
                            )}
                        </button>
                    </form>

                    <div className="split-auth-divider"><span>atau</span></div>

                    <p className="split-auth-switch">
                        Sudah ada akaun?{" "}
                        <Link to="/login">Log masuk di sini</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
