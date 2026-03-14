import { createContext, useContext, useState } from "react";

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem("deeplearner-lang") || "ms";
    });

    const toggleLang = () => {
        setLang(l => {
            const next = l === "ms" ? "en" : "ms";
            localStorage.setItem("deeplearner-lang", next);
            return next;
        });
    };

    return (
        <LanguageContext.Provider value={{ lang, toggleLang }}>
            {children}
        </LanguageContext.Provider>
    );
}
