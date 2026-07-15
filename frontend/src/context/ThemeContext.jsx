import { createContext, useContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("deeplearner-theme") || "light";
    });

    const [videoMode, setVideoMode] = useState(() => {
        return localStorage.getItem("deeplearner-video-mode") || "static";
    });

    useEffect(() => {
        localStorage.setItem("deeplearner-theme", theme);
        const root = document.documentElement;
        if (theme === "light") {
            root.classList.add("theme-light");
        } else {
            root.classList.remove("theme-light");
        }
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("deeplearner-video-mode", videoMode);
    }, [videoMode]);

    const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
    const toggleVideoMode = () => setVideoMode((v) => (v === "static" ? "video" : "static"));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, videoMode, toggleVideoMode }}>
            {children}
        </ThemeContext.Provider>
    );
}
