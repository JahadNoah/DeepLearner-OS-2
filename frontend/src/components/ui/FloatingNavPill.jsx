import { NavLink } from "react-router-dom";
import { LayoutDashboard, Plus, History, Layers } from "lucide-react";
import { useLanguage } from "../../context/useLanguage";
import { t } from "../../i18n/translations";
import { GradientButton } from "./GradientButton";

export function FloatingNavPill() {
    const { lang } = useLanguage();

    const navItems = [
        { to: "/app", end: true, label: t(lang, "nav.home"), icon: <LayoutDashboard size={16} /> },
        { to: "/input", label: t(lang, "dashboard.newSession").replace("🎙️ ", ""), icon: <Plus size={16} /> },
        { to: "/history", label: t(lang, "nav.history"), icon: <History size={16} /> },
    ];

    return (
        <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-8 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
            {/* Logo */}
            <div className="flex items-center gap-2 font-bold text-sm text-white/90 tracking-tight">
                <Layers size={18} className="text-purple-400" />
                <span className="whitespace-nowrap hidden sm:inline">DeepLearner OS</span>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                                isActive
                                    ? "bg-white/10 text-white"
                                    : "text-white/70 hover:text-white hover:bg-white/5"
                            }`
                        }
                    >
                        <span className="sm:hidden">{item.icon}</span>
                        <span className="hidden sm:flex items-center gap-2">
                            {item.icon}
                            {item.label}
                        </span>
                    </NavLink>
                ))}
            </div>

            {/* CTA Button */}
            <GradientButton asChild size="sm" className="border border-white/20">
                <NavLink to="/input">
                    <Plus size={14} />
                    <span className="hidden sm:inline">
                        {lang === "ms" ? "Sesi Baharu" : "New Session"}
                    </span>
                </NavLink>
            </GradientButton>
        </nav>
    );
}
