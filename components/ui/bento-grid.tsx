"use client";

import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
  href?: string;
  onClick?: () => void;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
  cols?: 2 | 3 | 4;
}

function BentoGrid({ items, className, cols = 3 }: BentoGridProps) {
  const colClass = { 2: "md:grid-cols-2", 3: "md:grid-cols-3", 4: "md:grid-cols-4" }[cols];

  return (
    <div className={cn("grid grid-cols-1 gap-3", colClass, className)}>
      {items.map((item, index) => {
        const Tag = item.href ? "a" : item.onClick ? "button" : "div";
        return (
          <Tag
            key={index}
            href={item.href}
            onClick={item.onClick}
            className={cn(
              "group relative p-5 rounded-2xl overflow-hidden transition-all duration-300",
              "border border-border bg-background",
              "hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]",
              "hover:-translate-y-0.5 will-change-transform",
              item.colSpan === 2 ? "md:col-span-2" : "",
              item.href || item.onClick ? "cursor-pointer" : "",
              {
                "shadow-[0_4px_20px_rgba(0,0,0,0.06)] -translate-y-0.5": item.hasPersistentHover,
              }
            )}
          >
            {/* Dot pattern on hover */}
            <div className={cn(
              "absolute inset-0 transition-opacity duration-300",
              item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.04)_1px,transparent_1px)] bg-[length:16px_16px]" />
            </div>

            {/* Gradient border glow */}
            <div className={cn(
              "absolute inset-0 -z-10 rounded-2xl p-px bg-gradient-to-br from-transparent via-primary/10 to-transparent transition-opacity duration-300",
              item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )} />

            <div className="relative flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/8 group-hover:bg-primary/12 transition-colors duration-300">
                  {item.icon}
                </div>
                {item.status && (
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-lg",
                    "bg-muted text-muted-foreground",
                    "transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {item.status}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="font-semibold text-foreground tracking-tight text-[15px]">
                  {item.title}
                  {item.meta && (
                    <span className="ml-2 text-xs text-muted-foreground font-normal">{item.meta}</span>
                  )}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {item.tags?.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors duration-200">
                      #{tag}
                    </span>
                  ))}
                </div>
                {(item.cta || item.href || item.onClick) && (
                  <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    {item.cta ?? "Explore →"}
                  </span>
                )}
              </div>
            </div>
          </Tag>
        );
      })}
    </div>
  );
}

export { BentoGrid };
