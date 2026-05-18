"use client";

import {
  animate, type MotionValue, motion, type PanInfo,
  useMotionValue, useTransform,
} from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface DateWheelPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: Date;
  onChange: (date: Date) => void;
  minYear?: number;
  maxYear?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  locale?: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PERSPECTIVE_ORIGIN = ITEM_HEIGHT * 2;

function getMonthNames(locale?: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { month: "long" });
  return Array.from({ length: 12 }, (_, i) =>
    formatter.format(new Date(2000, i, 1))
  );
}

const sizeConfig = {
  sm: { height: ITEM_HEIGHT * VISIBLE_ITEMS * 0.8, itemHeight: ITEM_HEIGHT * 0.8, fontSize: "text-sm", gap: "gap-2" },
  md: { height: ITEM_HEIGHT * VISIBLE_ITEMS, itemHeight: ITEM_HEIGHT, fontSize: "text-base", gap: "gap-4" },
  lg: { height: ITEM_HEIGHT * VISIBLE_ITEMS * 1.2, itemHeight: ITEM_HEIGHT * 1.2, fontSize: "text-lg", gap: "gap-6" },
};

interface WheelItemProps {
  item: string | number; index: number; y: MotionValue<number>;
  itemHeight: number; visibleItems: number; centerOffset: number;
  isSelected: boolean; disabled?: boolean; onClick: () => void;
}

function WheelItem({ item, index, y, itemHeight, visibleItems, centerOffset, isSelected, disabled, onClick }: WheelItemProps) {
  const itemY = useTransform(y, (latest) => index * itemHeight + latest + centerOffset);
  const rotateX = useTransform(itemY, [0, centerOffset, itemHeight * visibleItems], [45, 0, -45]);
  const scale   = useTransform(itemY, [0, centerOffset, itemHeight * visibleItems], [0.8, 1, 0.8]);
  const opacity = useTransform(itemY, [0, centerOffset * 0.5, centerOffset, centerOffset * 1.5, itemHeight * visibleItems], [0.3, 0.6, 1, 0.6, 0.3]);

  return (
    <motion.div
      className="flex select-none items-center justify-center"
      style={{ height: itemHeight, rotateX, scale, opacity, transformStyle: "preserve-3d", transformOrigin: `center center -${PERSPECTIVE_ORIGIN}px` }}
      onClick={() => !disabled && onClick()}
    >
      <span className={cn("font-medium transition-colors", isSelected ? "text-foreground" : "text-muted-foreground")}>
        {item}
      </span>
    </motion.div>
  );
}

interface WheelColumnProps {
  items: (string | number)[]; value: number; onChange: (index: number) => void;
  itemHeight: number; visibleItems: number; disabled?: boolean;
  className?: string; ariaLabel: string;
}

function WheelColumn({ items, value, onChange, itemHeight, visibleItems, disabled, className, ariaLabel }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const y = useMotionValue(-value * itemHeight);
  const centerOffset = Math.floor(visibleItems / 2) * itemHeight;
  const valueRef = React.useRef(value);
  const onChangeRef = React.useRef(onChange);
  const itemsLengthRef = React.useRef(items.length);

  React.useEffect(() => { valueRef.current = value; onChangeRef.current = onChange; itemsLengthRef.current = items.length; });
  React.useEffect(() => { animate(y, -value * itemHeight, { type: "spring", stiffness: 300, damping: 30 }); }, [value, itemHeight, y]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;
    const projected = y.get() + info.velocity.y * 0.2;
    let idx = Math.round(-projected / itemHeight);
    idx = Math.max(0, Math.min(items.length - 1, idx));
    onChange(idx);
  };

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || disabled) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault(); e.stopPropagation();
      const dir = e.deltaY > 0 ? 1 : -1;
      const next = Math.max(0, Math.min(itemsLengthRef.current - 1, valueRef.current + dir));
      if (next !== valueRef.current) onChangeRef.current(next);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [disabled]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const max = items.length - 1;
    const map: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, Home: -value, End: max - value, PageUp: -5, PageDown: 5 };
    const delta = map[e.key];
    if (delta !== undefined) { e.preventDefault(); onChange(Math.max(0, Math.min(max, value + delta))); }
  };

  const dragConstraints = React.useMemo(() => ({ top: -(items.length - 1) * itemHeight, bottom: 0 }), [items.length, itemHeight]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", disabled && "pointer-events-none opacity-50", className)}
      style={{ height: itemHeight * visibleItems }}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={handleKeyDown}
      role="spinbutton" aria-label={ariaLabel}
      aria-valuenow={value} aria-valuemin={0} aria-valuemax={items.length - 1}
      aria-valuetext={String(items[value])} aria-disabled={disabled}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: centerOffset, background: "linear-gradient(to bottom, hsl(var(--background)) 0%, transparent 100%)" }} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: centerOffset, background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)" }} />
      <div className="pointer-events-none absolute inset-x-0 z-5 border-border border-y bg-muted/30"
        style={{ top: centerOffset, height: itemHeight }} />
      <motion.div
        className="cursor-grab active:cursor-grabbing"
        style={{ y, paddingTop: centerOffset, paddingBottom: centerOffset }}
        drag="y" dragConstraints={dragConstraints} dragElastic={0.1} onDragEnd={handleDragEnd}
      >
        {items.map((item, index) => (
          <WheelItem key={`${item}-${index}`} item={item} index={index} y={y}
            itemHeight={itemHeight} visibleItems={visibleItems} centerOffset={centerOffset}
            isSelected={index === value} disabled={disabled} onClick={() => onChange(index)} />
        ))}
      </motion.div>
    </div>
  );
}

function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }

const DateWheelPicker = React.forwardRef<HTMLDivElement, DateWheelPickerProps>(
  ({ value, onChange, minYear = 1920, maxYear = new Date().getFullYear(), size = "md", disabled = false, locale, className, ...props }, ref) => {
    const config = sizeConfig[size];
    const months = React.useMemo(() => getMonthNames(locale), [locale]);
    const years  = React.useMemo(() => { const a: number[] = []; for (let y = maxYear; y >= minYear; y--) a.push(y); return a; }, [minYear, maxYear]);

    const [state, setState] = React.useState(() => {
      const d = value || new Date();
      return { day: d.getDate(), month: d.getMonth(), year: d.getFullYear() };
    });
    const isInternal = React.useRef(false);
    const days = React.useMemo(() => Array.from({ length: getDaysInMonth(state.year, state.month) }, (_, i) => i + 1), [state.month, state.year]);

    const handleDay   = React.useCallback((i: number) => { isInternal.current = true; setState((p) => ({ ...p, day: i + 1 })); }, []);
    const handleMonth = React.useCallback((i: number) => { isInternal.current = true; setState((p) => { const max = getDaysInMonth(p.year, i); return { ...p, month: i, day: Math.min(p.day, max) }; }); }, []);
    const handleYear  = React.useCallback((i: number) => { isInternal.current = true; setState((p) => { const y = years[i] ?? p.year; const max = getDaysInMonth(y, p.month); return { ...p, year: y, day: Math.min(p.day, max) }; }); }, [years]);

    React.useEffect(() => {
      if (isInternal.current) { onChange(new Date(state.year, state.month, state.day)); isInternal.current = false; }
    }, [state, onChange]);

    React.useEffect(() => {
      if (value && !isInternal.current) {
        const d = value.getDate(), m = value.getMonth(), y = value.getFullYear();
        if (d !== state.day || m !== state.month || y !== state.year) setState({ day: d, month: m, year: y });
      }
    }, [value, state.day, state.month, state.year]);

    return (
      <div ref={ref}
        className={cn("flex items-center justify-center", config.gap, config.fontSize, disabled && "pointer-events-none opacity-50", className)}
        style={{ perspective: "1000px" }} role="group" aria-label="Date picker" {...props}
      >
        <WheelColumn items={days}   value={state.day - 1}              onChange={handleDay}   itemHeight={config.itemHeight} visibleItems={VISIBLE_ITEMS} disabled={disabled} className="w-14" ariaLabel="Day" />
        <WheelColumn items={months} value={state.month}                onChange={handleMonth} itemHeight={config.itemHeight} visibleItems={VISIBLE_ITEMS} disabled={disabled} className="w-28" ariaLabel="Month" />
        <WheelColumn items={years}  value={Math.max(0, years.indexOf(state.year))} onChange={handleYear} itemHeight={config.itemHeight} visibleItems={VISIBLE_ITEMS} disabled={disabled} className="w-18" ariaLabel="Year" />
      </div>
    );
  }
);
DateWheelPicker.displayName = "DateWheelPicker";
export { DateWheelPicker };
