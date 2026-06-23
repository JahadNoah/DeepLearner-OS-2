import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, Plus, Clock, LogOut, Sun, Moon, Globe } from "lucide-react";
import { useTheme } from "../../context/useTheme";
import { useLanguage } from "../../context/useLanguage";
import { auth } from "../../firebase";
import { signOut } from "firebase/auth";

export function Sidebar({ user, activeItem = "dashboard" }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { id: "dashboard", label: { ms: "Utama", en: "Dashboard" }, icon: Home, path: "/app" },
    { id: "history", label: { ms: "Sejarah", en: "History" }, icon: Clock, path: "/history" },
  ];

  const getUserInitial = () => {
    if (user?.displayName) return user.displayName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  };

  return (
    <aside className="proto-sidebar">
      {/* Logo Section */}
      <div className="proto-sidebar-logo">
        <div className="brand">DeepLearner OS</div>
        <div className="sub">Academic Curator</div>

        {/* User Section */}
        <div
          className="proto-sidebar-user"
          onClick={() => setShowProfileMenu(!showProfileMenu)}
        >
          <div className="avatar">{getUserInitial()}</div>
          <div style={{ flex: 1 }}>
            <div className="name">
              {user?.displayName || user?.email?.split("@")[0] || "User"}
            </div>
            <div className="role">{lang === "ms" ? "Pengguna" : "User"}</div>
          </div>
        </div>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px",
              background: "var(--proto-surface2)",
              borderRadius: "8px",
              fontSize: "12px"
            }}
          >
            {/* Theme Toggle */}
            <div
              onClick={toggleTheme}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--proto-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? (lang === "ms" ? "Mod Cerah" : "Light Mode") : (lang === "ms" ? "Mod Gelap" : "Dark Mode")}</span>
            </div>

            {/* Language Toggle */}
            <div
              onClick={toggleLang}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--proto-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Globe size={14} />
              <span>{lang === "ms" ? "English" : "Bahasa Melayu"}</span>
            </div>

            {/* Logout */}
            <div
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                cursor: "pointer",
                borderRadius: "6px",
                transition: "background 0.2s",
                color: "#f44336",
                marginTop: "4px",
                borderTop: "1px solid var(--proto-border)",
                paddingTop: "12px"
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--proto-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <LogOut size={14} />
              <span>{lang === "ms" ? "Log Keluar" : "Logout"}</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="proto-nav-section">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`proto-nav-item ${activeItem === item.id ? "active" : ""}`}
            >
              <Icon className="icon" size={18} />
              <span>{item.label[lang]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom CTA */}
      <button
        className="proto-sidebar-cta"
        onClick={() => navigate("/input")}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
      >
        <Plus size={16} /> {lang === "ms" ? "Sesi Baharu" : "New Session"}
      </button>
    </aside>
  );
}
