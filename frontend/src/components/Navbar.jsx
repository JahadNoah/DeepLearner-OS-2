import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useLanguage } from "../context/useLanguage";
import { t } from "../i18n/translations";
import {
    LayoutDashboard, Mic, History, LogOut,
    Layers, X, Languages,
} from "lucide-react";

export default function Sidebar({ user, isOpen, onClose }) {
    const [desktopOpen, setDesktopOpen] = useState(false);
    const navigate = useNavigate();
    const { lang, toggleLang } = useLanguage();

    const displayName = user?.displayName || user?.email?.split("@")[0] || t(lang, "dashboard.defaultName");
    const email = user?.email || "";
    const initial = displayName.charAt(0).toUpperCase();

    const NAV_ITEMS = [
        { to: "/app",     end: true,  labelKey: "nav.home",       icon: <LayoutDashboard size={18} /> },
        { to: "/input",               labelKey: "nav.audioInput", icon: <Mic size={18} /> },
        { to: "/history",             labelKey: "nav.history",    icon: <History size={18} /> },
    ];

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    // ── Shared nav items ─────────────────────────────────────
    const NavItems = ({ showLabels, onItemClick }) => (
        <nav className="sidebar-v2-nav">
            {NAV_ITEMS.map(item => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sidebar-v2-link${isActive ? " active" : ""}`}
                    onClick={onItemClick}
                >
                    <span className="sidebar-v2-link-icon">{item.icon}</span>
                    {showLabels && (
                        <span className="sidebar-v2-link-label">{t(lang, item.labelKey)}</span>
                    )}
                </NavLink>
            ))}
        </nav>
    );

    // ── Bottom actions ────────────────────────────────────────
    const BottomActions = ({ showLabels, onItemClick }) => (
        <div className="sidebar-v2-bottom">
            <button className="sidebar-v2-link" onClick={toggleLang} title={t(lang, "nav.langTitle")}>
                <span className="sidebar-v2-link-icon"><Languages size={17} /></span>
                {showLabels && (
                    <span className="sidebar-v2-link-label">
                        {lang === "ms" ? "English" : "Bahasa Melayu"}
                    </span>
                )}
            </button>
            <button className="sidebar-v2-link sidebar-v2-logout" onClick={handleLogout} title={t(lang, "nav.logout")}>
                <span className="sidebar-v2-link-icon"><LogOut size={17} /></span>
                {showLabels && (
                    <span className="sidebar-v2-link-label">{t(lang, "nav.logout")}</span>
                )}
            </button>

            <div className="sidebar-v2-user">
                <div className="sidebar-v2-avatar">{initial}</div>
                {showLabels && (
                    <div className="sidebar-v2-user-info">
                        <div className="sidebar-v2-user-name">{displayName}</div>
                        <div className="sidebar-v2-user-email">{email}</div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* ══════════════════════════════════════
                DESKTOP — hover-to-expand sidebar
            ══════════════════════════════════════ */}
            <motion.aside
                className="sidebar-v2"
                initial={false}
                animate={{ width: desktopOpen ? 228 : 64 }}
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                onMouseEnter={() => setDesktopOpen(true)}
                onMouseLeave={() => setDesktopOpen(false)}
            >
                {/* Logo */}
                <div className="sidebar-v2-logo">
                    <img src="/DeepLearnerLogo1.png" alt="DeepLearner" className="w-[24px] h-[24px] object-contain flex-shrink-0" />
                    <motion.span
                        className="sidebar-v2-logo-label"
                        style={{ marginLeft: '4px' }}
                        animate={{ opacity: desktopOpen ? 1 : 0 }}
                        transition={{ duration: desktopOpen ? 0.18 : 0.08 }}
                    >
                        DeepLearner
                    </motion.span>
                </div>

                {/* Nav (icons always visible; labels fade when open) */}
                <nav className="sidebar-v2-nav">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `sidebar-v2-link${isActive ? " active" : ""}`}
                        >
                            <span className="sidebar-v2-link-icon">{item.icon}</span>
                            <motion.span
                                className="sidebar-v2-link-label"
                                animate={{ opacity: desktopOpen ? 1 : 0 }}
                                transition={{ duration: desktopOpen ? 0.18 : 0.08 }}
                            >
                                {t(lang, item.labelKey)}
                            </motion.span>
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="sidebar-v2-bottom">
                    <button
                        className="sidebar-v2-link"
                        onClick={toggleLang}
                        title={t(lang, "nav.langTitle")}
                    >
                        <span className="sidebar-v2-link-icon"><Languages size={17} /></span>
                        <motion.span
                            className="sidebar-v2-link-label"
                            animate={{ opacity: desktopOpen ? 1 : 0 }}
                            transition={{ duration: desktopOpen ? 0.18 : 0.08 }}
                        >
                            {lang === "ms" ? "English" : "Bahasa Melayu"}
                        </motion.span>
                    </button>

                    <button
                        className="sidebar-v2-link sidebar-v2-logout"
                        onClick={handleLogout}
                        title={t(lang, "nav.logout")}
                    >
                        <span className="sidebar-v2-link-icon"><LogOut size={17} /></span>
                        <motion.span
                            className="sidebar-v2-link-label"
                            animate={{ opacity: desktopOpen ? 1 : 0 }}
                            transition={{ duration: desktopOpen ? 0.18 : 0.08 }}
                        >
                            {t(lang, "nav.logout")}
                        </motion.span>
                    </button>

                    <div className="sidebar-v2-user">
                        <div className="sidebar-v2-avatar">{initial}</div>
                        <motion.div
                            className="sidebar-v2-user-info"
                            animate={{ opacity: desktopOpen ? 1 : 0 }}
                            transition={{ duration: desktopOpen ? 0.18 : 0.08 }}
                        >
                            <div className="sidebar-v2-user-name">{displayName}</div>
                            <div className="sidebar-v2-user-email">{email}</div>
                        </motion.div>
                    </div>
                </div>
            </motion.aside>

            {/* ══════════════════════════════════════
                MOBILE — full-panel overlay
            ══════════════════════════════════════ */}
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        className="sidebar-v2-mobile"
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "-100%" }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {/* Header */}
                        <div className="sidebar-v2-mobile-header">
                            <div className="sidebar-v2-logo" style={{ border: "none", padding: 0 }}>
                                <img src="/DeepLearnerLogo1.png" alt="DeepLearner" className="w-[24px] h-[24px] object-contain flex-shrink-0" />
                                <span className="sidebar-v2-logo-label" style={{ marginLeft: '4px' }}>DeepLearner</span>
                            </div>
                            <button className="sidebar-v2-close" onClick={onClose} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Nav */}
                        <nav className="sidebar-v2-nav" style={{ padding: "1rem 0.75rem" }}>
                            {NAV_ITEMS.map(item => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={({ isActive }) => `sidebar-v2-link${isActive ? " active" : ""}`}
                                    onClick={onClose}
                                >
                                    <span className="sidebar-v2-link-icon">{item.icon}</span>
                                    <span className="sidebar-v2-link-label">{t(lang, item.labelKey)}</span>
                                </NavLink>
                            ))}
                        </nav>

                        {/* Bottom */}
                        <div className="sidebar-v2-bottom">
                            <button className="sidebar-v2-link" onClick={() => { toggleLang(); onClose(); }}>
                                <span className="sidebar-v2-link-icon"><Languages size={17} /></span>
                                <span className="sidebar-v2-link-label">
                                    {lang === "ms" ? "English" : "Bahasa Melayu"}
                                </span>
                            </button>
                            <button className="sidebar-v2-link sidebar-v2-logout" onClick={handleLogout}>
                                <span className="sidebar-v2-link-icon"><LogOut size={17} /></span>
                                <span className="sidebar-v2-link-label">{t(lang, "nav.logout")}</span>
                            </button>
                            <div className="sidebar-v2-user">
                                <div className="sidebar-v2-avatar">{initial}</div>
                                <div className="sidebar-v2-user-info">
                                    <div className="sidebar-v2-user-name">{displayName}</div>
                                    <div className="sidebar-v2-user-email">{email}</div>
                                </div>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
