"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { translations, languages } from "@/lib/i18n";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get saved language from localStorage
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    } else {
      // Check browser language
      const browserLang = navigator.language.split("-")[0];
      if (translations[browserLang]) {
        setLanguage(browserLang);
      }
    }
    setIsLoading(false);
  }, []);

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setLanguage(langCode);
      localStorage.setItem("language", langCode);
      
      // Update document direction for RTL languages
      const lang = languages.find(l => l.code === langCode);
      if (lang) {
        document.documentElement.dir = lang.dir;
        document.documentElement.lang = langCode;
      }
    }
  };

  const t = (key) => {
    const keys = key.split(".");
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations["en"];
        for (const k2 of keys) {
          if (value && value[k2]) {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }
    
    return typeof value === "string" ? value : key;
  };

  const getCurrentLanguage = () => {
    return languages.find(l => l.code === language) || languages[0];
  };

  const isRTL = () => {
    return getCurrentLanguage().dir === "rtl";
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      changeLanguage, 
      t, 
      languages,
      getCurrentLanguage,
      isRTL,
      isLoading
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export default LanguageContext;
