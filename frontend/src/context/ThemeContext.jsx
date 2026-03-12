import { createContext, useContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem("deeplearner-theme") || "dark";
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

    const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
