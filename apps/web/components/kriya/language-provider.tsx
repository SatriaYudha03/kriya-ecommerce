"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { type Locale, type MessageKey, t } from "@/lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (lang: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = (lang: Locale) => {
    document.cookie = `kriya-locale=${lang}; path=/; max-age=31536000`;
    setLocaleState(lang);
    router.refresh();
  };

  const translate = (key: MessageKey, params?: Record<string, string | number>) => {
    return t(locale, key, params);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
