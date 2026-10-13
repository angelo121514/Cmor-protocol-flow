import React, { useCallback, useState } from "react";
import { PanelLangContext, PANEL_I18N, STORAGE_KEY, type PanelLang } from "./panel-language";

export const PanelLangProvider: React.FC<{ children: React.ReactNode; defaultLang?: PanelLang }> = ({
  children,
  defaultLang = "es",
}) => {
  const [lang, setLangState] = useState<PanelLang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "es" || stored === "pt") return stored;
    } catch {
      /* storage no disponible */
    }
    return defaultLang;
  });

  const setLang = useCallback((l: PanelLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage lleno — la sesión igual funciona */
    }
  }, []);

  const t = useCallback(
    (text: string) => (lang === "pt" ? PANEL_I18N[text] ?? text : text),
    [lang]
  );

  return (
    <PanelLangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </PanelLangContext.Provider>
  );
};
