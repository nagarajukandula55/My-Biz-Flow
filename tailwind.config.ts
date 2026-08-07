import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Arial", "sans-serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-raised": "var(--bg-raised)",
        "bg-sunken": "var(--bg-sunken)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-contrast": "var(--accent-contrast)",
        "accent-soft": "var(--accent-soft)",
        teal: "var(--teal)",
        "teal-soft": "var(--teal-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        "sidebar-bg": "var(--sidebar-bg)",
        "sidebar-text": "var(--sidebar-text)",
        "sidebar-text-dim": "var(--sidebar-text-dim)",
        "sidebar-active": "var(--sidebar-active)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
