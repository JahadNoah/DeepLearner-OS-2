import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useLanguage } from "../../context/useLanguage";
import { useTheme } from "../../context/useTheme";
import { t } from "../../i18n/translations";
import { ChevronDown, User, Languages, Moon, Sun, LogOut } from "lucide-react";

export function UserProfileDropdown({ user }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { lang, toggleLang } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const displayName = user?.displayName || user?.email?.split("@")[0] || t(lang, "dashboard.defaultName");
    const email = user?.email || "";
    const initial = displayName.charAt(0).toUpperCase();

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/login");
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Profile Button */}
            <button
                className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2 shadow-2xl transition-all hover:shadow-[0_12px_48px_rgba(0,0,0,0.2)]"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="User menu"
            >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                    {initial}
                </div>
                <div className="hidden sm:flex flex-col items-start min-w-0">
                    <div className="text-sm font-semibold text-white/90 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
                        {displayName}
                    </div>
                    <div className="text-xs text-white/60 whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px]">
                        {email}
                    </div>
                </div>
                <ChevronDown
                    size={16}
                    className={`hidden sm:block text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 min-w-[260px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* User Info Section */}
                    <div className="py-1">
                        <div className="flex items-center gap-3 px-2 py-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 text-white flex items-center justify-center font-semibold text-base flex-shrink-0">
                                {initial}
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white/90 mb-0.5">{displayName}</div>
                                <div className="text-xs text-white/60">{email}</div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-white/10 my-1"></div>

                    {/* Actions */}
                    <div className="py-1">
                        {/* Language Toggle */}
                        <button
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-none bg-transparent text-white/90 text-sm font-medium cursor-pointer rounded-lg transition-all hover:bg-white/10"
                            onClick={() => { toggleLang(); setIsOpen(false); }}
                        >
                            <Languages size={16} className="opacity-70" />
                            <span>{lang === "ms" ? "English" : "Bahasa Melayu"}</span>
                        </button>

                        {/* Theme Toggle */}
                        <button
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-none bg-transparent text-white/90 text-sm font-medium cursor-pointer rounded-lg transition-all hover:bg-white/10"
                            onClick={() => { toggleTheme(); setIsOpen(false); }}
                        >
                            {theme === "dark" ? <Sun size={16} className="opacity-70" /> : <Moon size={16} className="opacity-70" />}
                            <span>{theme === "dark" ? (lang === "ms" ? "Mod Terang" : "Light Mode") : (lang === "ms" ? "Mod Gelap" : "Dark Mode")}</span>
                        </button>
                    </div>

                    <div className="h-px bg-white/10 my-1"></div>

                    {/* Logout */}
                    <div className="py-1">
                        <button
                            className="flex items-center gap-3 w-full px-3 py-2.5 border-none bg-transparent text-red-400 text-sm font-medium cursor-pointer rounded-lg transition-all hover:bg-red-500/10"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} className="opacity-70" />
                            <span>{t(lang, "nav.logout")}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
