import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "../context/useTheme";
import { useState } from "react";

const IconHome = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);
const IconMic = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);
const IconHistory = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);
const IconLogout = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);
const IconSearch = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
);
const IconLayers = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
);

const NAV_ITEMS = [
    { to: "/app", end: true, label: "Utama", icon: <IconHome /> },
    { to: "/input", label: "Input Audio", icon: <IconMic /> },
    { to: "/history", label: "Sejarah", icon: <IconHistory /> },
];

export default function Sidebar({ user, isOpen, onClose }) {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [search, setSearch] = useState("");

    const initial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "P";
    const displayName = user?.displayName || user?.email?.split("@")[0] || "Pelajar";
    const email = user?.email || "";

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    return (
        <aside className={`sidebar${isOpen ? " sidebar--open" : ""}`}>
            {/* Mobile close button */}
            <button className="sidebar-close-btn" onClick={onClose} aria-label="Tutup menu">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>

            {/* Logo */}
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon"><IconLayers /></div>
                <span>DeepLearner</span>
            </div>

            {/* Search */}
            <div className="sidebar-search">
                <IconSearch />
                <input
                    type="text"
                    placeholder="Cari..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <span className="sidebar-search-hint">⌘ K</span>
            </div>

            {/* Nav */}
            <div className="sidebar-section-label">Menu Utama</div>
            <nav className="sidebar-nav">
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) => `sidebar-nav-item ${isActive ? "active" : ""}`}
                        onClick={onClose}
                    >
                        <span className="sidebar-nav-icon">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom */}
            <div className="sidebar-bottom">
                <div className="sidebar-upgrade-card">
                    <div className="sidebar-upgrade-badge">⚡ 20 hari lagi</div>
                    <p className="sidebar-upgrade-text">Naik taraf ke Premium dan nikmati lebih banyak ciri AI tanpa had.</p>
                    <button className="sidebar-upgrade-btn">Lihat Pelan</button>
                </div>

                <div className="sidebar-user">
                    <div className="sidebar-avatar">{initial}</div>
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-name">{displayName}</div>
                        <div className="sidebar-user-email">{email}</div>
                    </div>
                    <div className="sidebar-user-actions">
                        <button
                            onClick={toggleTheme}
                            className="sidebar-icon-btn"
                            title={`Tukar ke mod ${theme === "dark" ? "terang" : "gelap"}`}
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <button onClick={handleLogout} className="sidebar-icon-btn" title="Log keluar">
                            <IconLogout />
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
