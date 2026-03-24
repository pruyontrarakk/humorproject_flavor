"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", dark);
    return;
  }
  root.classList.toggle("dark", mode === "dark");
}

export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
    setMode(stored);
    applyTheme(stored);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const current = (localStorage.getItem("theme") as ThemeMode | null) ?? "system";
      if (current === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function change(next: ThemeMode) {
    setMode(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5" role="group" aria-label="Theme">
      {(["light", "dark", "system"] as const).map(t => (
        <button
          key={t}
          type="button"
          onClick={() => change(t)}
          className={[
            "rounded-lg px-2.5 py-1 text-xs font-semibold transition",
            mode === t
              ? "bg-brand-100 text-brand-800 dark:bg-brand-900/80 dark:text-brand-100"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          ].join(" ")}
        >
          {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
        </button>
      ))}
    </div>
  );
}
