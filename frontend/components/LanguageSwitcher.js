"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/providers/LanguageContext";
import { Globe, ChevronDown } from "lucide-react";

export default function LanguageSwitcher() {
  const { language, changeLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        title="Change language"
      >
        <Globe size={18} />
        <span className="text-sm hidden sm:inline">{currentLang.nativeName}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between hover:bg-zinc-700 transition-colors ${
                language === lang.code ? "text-indigo-400 bg-zinc-700/50" : "text-zinc-300"
              }`}
            >
              <span>{lang.nativeName}</span>
              {language === lang.code && (
                <span className="text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
