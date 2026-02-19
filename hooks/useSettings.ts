"use client";

import { useState, useEffect } from "react";
import { AppSettings } from "@/lib/types";
import { getSettings, saveSettings } from "@/lib/storage";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    openaiApiKey: "",
    pexelsApiKey: "",
    defaultVoice: "nova",
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSettings(getSettings());
    setLoaded(true);
  }, []);

  const updateSettings = (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    saveSettings(updated);
    setSettings(updated);
  };

  const hasRequiredKeys = Boolean(settings.openaiApiKey && settings.pexelsApiKey);

  return { settings, updateSettings, hasRequiredKeys, loaded };
}
