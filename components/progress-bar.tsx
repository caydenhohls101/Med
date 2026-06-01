"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Prominent loading bar + spinner at the top during navigation.
 * The bar is 3px tall with a glow so it's visible in both light and dark mode.
 */
export function ProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth]   = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() { timers.current.forEach(clearTimeout); timers.current = []; }

  useEffect(() => {
    clear();
    setActive(true);
    setWidth(20);

    const t1 = setTimeout(() => setWidth(50),  200);
    const t2 = setTimeout(() => setWidth(70),  700);
    const t3 = setTimeout(() => setWidth(85), 1400);
    const t4 = setTimeout(() => {
      setWidth(100);
      const t5 = setTimeout(() => { setActive(false); setWidth(0); }, 300);
      timers.current.push(t5);
    }, 2200);

    timers.current.push(t1, t2, t3, t4);
    return clear;
  }, [pathname]);

  if (!active) return null;

  return (
    <>
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 z-[99999] h-[3px] bg-primary/20 pointer-events-none">
        <div
          className="h-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.8),0_0_20px_hsl(var(--primary)/0.4)]"
          style={{ width: `${width}%`, transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </div>
      {/* Spinner in top-right corner */}
      <div className="fixed top-3 right-4 z-[99999] pointer-events-none">
        <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    </>
  );
}
