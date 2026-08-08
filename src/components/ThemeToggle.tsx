"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "mbf-theme";

type Theme = "light" | "dark";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Explicit light/dark toggle on top of the design system's default
 * (system-preference-driven) theme — see globals.css's `[data-theme]`
 * overrides. Persists the choice in localStorage; a blocking inline
 * script in the root layout applies it before first paint so there's no
 * flash of the wrong theme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    setTheme(stored ?? (systemPrefersDark() ? "dark" : "light"));
  }, []);

  function toggle() {
    const next: Theme = (theme ?? "light") === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-sidebar-text-dim hover:bg-sidebar-active/60 hover:text-sidebar-text"
    >
      {isDark ? (
        <Sun className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.25} />
      ) : (
        <Moon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.25} />
      )}
      {isDark ? "Light theme" : "Dark theme"}
    </button>
  );
}
