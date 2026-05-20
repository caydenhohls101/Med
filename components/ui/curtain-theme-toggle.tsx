"use client";

import {
  useState, useCallback, useRef, useEffect,
  type ReactNode, type CSSProperties,
} from "react";

export type Theme = "light" | "dark";

export interface ThemeToggleProps {
  variant?: "default" | "appbar" | "icon";
  defaultTheme?: Theme;
  barHeight?: number;
  buttonSize?: number;
  duration?: number;
  onThemeChange?: (theme: Theme) => void;
  children?: ReactNode;
}

// Colors that match our CSS variables
const TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    curtain: "#ffffff",
    btnBg: "hsl(210 40% 96.1%)",
    btnText: "hsl(222.2 84% 4.9%)",
    btnRing: "rgba(0,0,0,0.08)",
  },
  dark: {
    curtain: "#020817",
    btnBg: "hsl(217.2 32.6% 17.5%)",
    btnText: "hsl(210 40% 98%)",
    btnRing: "rgba(255,255,255,0.08)",
  },
};

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

type CurtainPhase = "idle" | "falling" | "rising";
const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export function ThemeToggle({
  defaultTheme = "light",
  buttonSize = 36,
  duration = 500,
  onThemeChange,
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [phase, setPhase] = useState<CurtainPhase>("idle");
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const curtainColorRef = useRef<string>("");

  // Sync with html.dark class on mount (reads from anti-flicker script)
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase !== "idle") return;
    const next: Theme = theme === "light" ? "dark" : "light";
    curtainColorRef.current = TOKENS[next].curtain;
    setPhase("falling");

    setTimeout(() => {
      setTheme(next);
      onThemeChange?.(next);
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next === "dark");
      }
      setPhase("rising");
      setTimeout(() => setPhase("idle"), duration + 60);
    }, duration);
  }, [phase, theme, duration, onThemeChange]);

  const t = TOKENS[theme];
  const btnScale = pressed ? 0.92 : hovered ? 1.1 : 1;

  const curtainStyle: CSSProperties = {
    position: "fixed", inset: 0,
    background: curtainColorRef.current,
    transformOrigin: "top",
    transform: phase === "falling" ? "scaleY(1)" : "scaleY(0)",
    transition: phase !== "idle" ? `transform ${duration}ms ${EASING}` : "none",
    zIndex: 99997, pointerEvents: "none",
  };

  const btnStyle: CSSProperties = {
    width: buttonSize, height: buttonSize,
    borderRadius: "50%", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: t.btnBg, color: t.btnText,
    boxShadow: `0 0 0 1.5px ${t.btnRing}`,
    outline: "none",
    transform: `scale(${btnScale})`,
    transition: "background 0.3s, color 0.3s, transform 0.15s, box-shadow 0.3s",
    flexShrink: 0,
  };

  return (
    <>
      <div aria-hidden="true" style={curtainStyle} />
      <button
        style={btnStyle}
        onClick={toggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
        aria-pressed={theme === "dark"}
        title={theme === "light" ? "Dark mode" : "Light mode"}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    </>
  );
}
