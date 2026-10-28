import type { ReactNode } from "react";
import { cn } from "../lib/cn";

interface SectionCardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** 更紧凑的标题间距，适合信息密度较高的创作页。 */
  dense?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  icon,
  action,
  children,
  className,
  bodyClassName,
  dense = false,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "rounded-[26px] border border-line bg-card shadow-card",
        className,
      )}
    >
      <div className={cn("p-5 sm:p-6", bodyClassName)}>
        {(title || action) && (
          <div className={cn("flex items-start justify-between gap-3", dense ? "mb-4" : "mb-5")}>
            <div className="flex min-w-0 items-center gap-3">
              {icon && (
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  {icon}
                </span>
              )}
              <div className="min-w-0">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-ink">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-2">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}