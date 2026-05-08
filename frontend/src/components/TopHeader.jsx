import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useLanguage } from "../context/useLanguage";
import { useTheme } from "../context/useTheme";
import { t } from "../i18n/translations";
import {
    Layers, Home, PlusCircle, History,
    Languages, Sun, Moon, LogOut, ChevronDown, Menu, X
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   TopHeader — Single unified horizontal bar (Claude-style)
───────────────────────────────────────────────────────── */
export function TopHeader({ user }) {
    const { lang, toggleLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const [dropOpen, setDropOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropRef = useRef(null);

    const displayName = user?.displayName || user?.email?.split("@")[0] || t(lang, "dashboard.defaultName");
    const email = user?.email || "";
    const initial = displayName.charAt(0).toUpperCase();

    const navItems = [
        { label: lang === "ms" ? "Utama" : "Dashboard", to: "/app", end: true },
        { label: lang === "ms" ? "Sesi Baharu" : "New Session", to: "/input", end: false },
        { label: lang === "ms" ? "Sejarah" : "History", to: "/history", end: false },
    ];

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    /* Close dropdown on outside click */
    useEffect(() => {
        const fn = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) {
                setDropOpen(false);
            }
        };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    /* Close mobile menu on route change */
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const isActive = (item) =>
        item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

    return (
        <>
            {/* ═══ Main top bar ═══ */}
            <header className="cl-topbar">
                <div className="cl-topbar-inner">

                    {/* Logo */}
                    <NavLink to="/app" className="cl-logo">
                        <img src="/DeepLearnerLogo1.png" alt="DeepLearner OS" className="w-[22px] h-[22px] object-contain" />
                        <span className="cl-logo-name">DeepLearner OS</span>
                    </NavLink>

                    {/* Centre nav — desktop */}
                    <nav className="cl-nav-links">
                        {navItems.map((item) => {
                            const active = isActive(item);
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    className={`cl-nav-link${active ? " active" : ""}`}
                                >
                                    {item.label}
                                    {active && (
                                        <motion.span
                                            className="cl-nav-link-underline"
                                            layoutId="cl-underline"
                                            transition={{ type: "spring", stiffness: 380, damping: 34 }}
                                        />
                                    )}
                                </NavLink>
                            );
                        })}
                    </nav>

                    {/* Right — profile + mobile burger */}
                    <div className="cl-topbar-right">

                        {/* Profile button */}
                        <div className="cl-profile-wrap" ref={dropRef}>
                            <button
                                className="cl-profile-btn"
                                onClick={() => setDropOpen((p) => !p)}
                                aria-label="User menu"
                                aria-expanded={dropOpen}
                            >
                                <span className="cl-avatar">{initial}</span>
                                <span className="cl-profile-name">{displayName}</span>
                                <ChevronDown
                                    size={14}
                                    className={`cl-profile-chevron${dropOpen ? " open" : ""}`}
                                />
                            </button>

                            {/* Dropdown */}
                            <AnimatePresence>
                                {dropOpen && (
                                    <motion.div
                                        className="cl-dropdown"
                                        initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                        transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                                    >
                                        {/* User info header */}
                                        <div className="cl-drop-user">
                                            <span className="cl-drop-avatar">{initial}</span>
                                            <div className="cl-drop-user-info">
                                                <div className="cl-drop-name">{displayName}</div>
                                                <div className="cl-drop-email">{email}</div>
                                            </div>
                                        </div>

                                        <div className="cl-drop-divider" />

                                        <button className="cl-drop-item" onClick={() => { toggleLang(); setDropOpen(false); }}>
                                            <Languages size={15} />
                                            {lang === "ms" ? "Switch to English" : "Tukar ke BM"}
                                        </button>

                                        <button className="cl-drop-item" onClick={() => { toggleTheme(); setDropOpen(false); }}>
                                            {theme === "dark"
                                                ? <Sun size={15} />
                                                : <Moon size={15} />}
                                            {theme === "dark"
                                                ? (lang === "ms" ? "Mod Terang" : "Light Mode")
                                                : (lang === "ms" ? "Mod Gelap" : "Dark Mode")}
                                        </button>

                                        <div className="cl-drop-divider" />

                                        <button className="cl-drop-item danger" onClick={handleLogout}>
                                            <LogOut size={15} />
                                            {t(lang, "nav.logout")}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Mobile burger */}
                        <button
                            className="cl-burger"
                            aria-label="Menu"
                            onClick={() => setMobileOpen((p) => !p)}
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* ═══ Mobile slide-down menu ═══ */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        className="cl-mobile-menu"
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    >
                        {navItems.map((item) => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive: a }) => `cl-mobile-link${a ? " active" : ""}`}
                            >
                                {item.label}
                            </NavLink>
                        ))}

                        <div className="cl-drop-divider" style={{ margin: "0.5rem 0" }} />

                        <button className="cl-mobile-link" onClick={() => { toggleLang(); setMobileOpen(false); }}>
                            <Languages size={15} />
                            {lang === "ms" ? "Switch to English" : "Tukar ke BM"}
                        </button>
                        <button className="cl-mobile-link" onClick={() => { toggleTheme(); setMobileOpen(false); }}>
                            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                            {theme === "dark"
                                ? (lang === "ms" ? "Mod Terang" : "Light Mode")
                                : (lang === "ms" ? "Mod Gelap" : "Dark Mode")}
                        </button>
                        <button className="cl-mobile-link danger" onClick={handleLogout}>
                            <LogOut size={15} />
                            {t(lang, "nav.logout")}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
