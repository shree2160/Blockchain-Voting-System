import React, { createContext, useContext, useState, useCallback } from "react";
import strings from "../localization.json";

// ─── Context ──────────────────────────────────────────────────────────────
const LocalizationContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────
export function LocalizationProvider({ children }) {
  const [lang, setLang] = useState("en");

  /** t("key") → localized string, falls back to English */
  const t = useCallback(
    (key) => strings[lang]?.[key] ?? strings["en"]?.[key] ?? key,
    [lang]
  );

  const toggleLang = () => setLang((l) => (l === "en" ? "mr" : "en"));

  return (
    <LocalizationContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LocalizationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────
export function useLocalization() {
  const ctx = useContext(LocalizationContext);
  if (!ctx) throw new Error("useLocalization must be used within LocalizationProvider");
  return ctx;
}
