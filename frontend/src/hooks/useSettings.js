import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gp-agenda-settings";

const DEFAULTS = {
  horaInicial: "08:00",
  horaFinal: "18:00",
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Preferências simples da agenda (horário inicial/final exibido), persistidas localmente. */
export function useSettings() {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, update };
}

export default useSettings;
