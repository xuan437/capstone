import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, LanguageCode, DropdownTranslations } from "../utils/translations";

interface LanguageContextType {
  lang: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: DropdownTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem("app_lang");
    return (saved === "en" || saved === "tl" || saved === "ceb" ? saved : "en") as LanguageCode;
  });

  const setLanguage = (newLang: LanguageCode) => {
    setLangState(newLang);
    localStorage.setItem("app_lang", newLang);
    window.dispatchEvent(new Event("languageChange"));
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      const saved = localStorage.getItem("app_lang");
      if (saved && (saved === "en" || saved === "tl" || saved === "ceb")) {
        setLangState(saved as LanguageCode);
      }
    };

    window.addEventListener("languageChange", handleLanguageChange);
    return () => window.removeEventListener("languageChange", handleLanguageChange);
  }, []);

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
