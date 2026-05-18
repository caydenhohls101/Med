"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { LiquidCard, CardContent, CardHeader } from "@/components/ui/liquid-glass-card";

// ── Utilities ──────────────────────────────────────────────────────
function circumference(r: number) { return 2 * Math.PI * r; }

function getStrengthColor(value: number, max: number) {
  const pct = value / max;
  if (pct >= 0.8) return ["hsl(142,71%,80%)", "hsl(142,71%,50%)", "hsl(142,71%,35%)"];
  if (pct >= 0.4) return ["hsl(38,92%,80%)", "hsl(38,92%,55%)", "hsl(38,92%,40%)"];
  return ["hsl(0,84%,80%)", "hsl(0,84%,60%)", "hsl(0,84%,40%)"];
}

// ── Staggered mount context ────────────────────────────────────────
const CounterCtx = createContext<{ getIndex: () => number } | null>(null);
function StaggerProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef(0);
  const getIndex = useCallback(() => ref.current++, []);
  return <CounterCtx.Provider value={{ getIndex }}>{children}</CounterCtx.Provider>;
}

// ── Half-circle gauge ──────────────────────────────────────────────
function HalfCircle({ value, max }: { value: number; max: number }) {
  const strokeRef = useRef<SVGCircleElement>(null);
  const gradId = useRef(`grad-${Math.random().toString(36).slice(2, 6)}`).current;
  const r = 45;
  const dist = circumference(r);
  const half = dist / 2;
  const target = Math.min(value / max, 1) * -half;
  const colors = getStrengthColor(value, max);

  useEffect(() => {
    strokeRef.current?.animate(
      [
        { strokeDashoffset: "0", offset: 0 },
        { strokeDashoffset: "0", offset: 400 / 1400 },
        { strokeDashoffset: target.toString() },
      ],
      { duration: 1400, easing: "cubic-bezier(0.65,0,0.35,1)", fill: "forwards" }
    );
  }, [target]);

  return (
    <svg className="block mx-auto w-auto max-w-full h-32" viewBox="0 0 100 50" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          {colors.map((c, i) => (
            <stop key={i} offset={`${(100 / (colors.length - 1)) * i}%`} stopColor={c} />
          ))}
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="10" transform="translate(50,50.5)">
        <circle className="stroke-muted/30" r={r} strokeDasharray={`${half} ${half}`} />
        <circle
          ref={strokeRef}
          stroke={`url(#${gradId})`}
          strokeDasharray={`${half} ${half}`}
          r={r}
        />
      </g>
    </svg>
  );
}

// ── Animated digit display ────────────────────────────────────────
function AnimatedValue({ value, suffix = "" }: { value: number; suffix?: string }) {
  const digits = String(Math.floor(value)).split("");
  return (
    <div className="absolute bottom-0 w-full text-center">
      <div className="text-4xl font-bold h-12 overflow-hidden relative">
        <div className="absolute inset-0 flex justify-center">
          {digits.map((d, i) => (
            <span
              key={i}
              className="inline-block animate-in slide-in-from-bottom-full fill-mode-both"
              style={{ animationDelay: `${400 + i * 100}ms`, animationDuration: `${800 + i * 200}ms` }}
            >
              {d}
            </span>
          ))}
          {suffix && <span className="text-2xl self-end mb-1 ml-0.5 opacity-70">{suffix}</span>}
        </div>
      </div>
      <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">out of {value >= 1000 ? "1,000" : "100"}</div>
    </div>
  );
}

// ── Single stat card ──────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number;
  max: number;
  description: string;
  suffix?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

function StatCard({ title, value, max, description, suffix, action }: StatCardProps) {
  const ctx = useContext(CounterCtx);
  const indexRef = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);

  if (indexRef.current === null && ctx) indexRef.current = ctx.getIndex();

  useEffect(() => {
    const delay = 300 + (indexRef.current ?? 0) * 180;
    const t = setTimeout(() => setMounted(true), delay);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <LiquidCard className="w-full max-w-xs animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
      <CardContent className="p-6">
        <CardHeader className="px-0 pb-8">
          <h3 className="text-base font-semibold">{title}</h3>
        </CardHeader>
        <div className="relative mb-8">
          <HalfCircle value={value} max={max} />
          <AnimatedValue value={value} suffix={suffix} />
        </div>
        <p className="text-sm text-muted-foreground text-center mb-6 min-h-10">{description}</p>
        {action && (
          <a
            href={action.href ?? "#"}
            onClick={action.onClick}
            className="block w-full text-center bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
          >
            {action.label}
          </a>
        )}
      </CardContent>
    </LiquidCard>
  );
}

// ── Public export ─────────────────────────────────────────────────
export interface StatScore { title: string; value: number; max: number; description: string; suffix?: string; action?: StatCardProps["action"] }

export function StatScoreCards({ stats }: { stats: StatScore[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      <StaggerProvider>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </StaggerProvider>
    </div>
  );
}
