import type { SizeOption } from "../types";
import { cn } from "../lib/cn";

export function SizeGrid({
  options,
  value,
  onChange,
}: {
  options: SizeOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const columns = options.length <= 5 ? Math.min(options.length, 5) : 3;

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        const previewStyle =
          option.ratio >= 1
            ? { width: 30, height: Math.max(12, 30 / option.ratio) }
            : { height: 30, width: Math.max(9, 30 * option.ratio) };
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            aria-label={`${option.label} ${option.value}`}
            onClick={() => onChange(option.value)}
            className={cn(
              "group flex flex-col items-center gap-1 rounded-2xl border p-2 pt-2.5 transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              active
                ? "border-primary/60 bg-primary/8 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
                : "border-line bg-surface-1/40 hover:border-line-strong hover:bg-surface-1/80",
            )}
          >
            <span className="grid h-8 w-full place-items-center">
              <span
                style={previewStyle}
                className={cn(
                  "rounded-[4px] border-2 transition-colors duration-200",
                  active
                    ? "border-primary bg-primary/20"
                    : "border-line-strong bg-card group-hover:border-ink-3",
                )}
              />
            </span>
            <span
              className={cn(
                "text-[11px] font-semibold",
                active ? "text-primary" : "text-ink",
              )}
            >
              {option.label}
            </span>
            {option.hint && (
              <span className="-mt-0.5 text-[9.5px] text-ink-3">{option.hint}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface PillOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

export function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
  className,
}: {
  options: PillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-[72px] flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              active
                ? "border-primary/55 bg-primary/10"
                : "border-line bg-surface-1/40 hover:border-line-strong hover:bg-surface-1/80",
            )}
          >
            <span
              className={cn(
                "text-[12px] font-semibold",
                active ? "text-primary" : "text-ink",
              )}
            >
              {option.label}
            </span>
            {option.hint && <span className="text-[10px] text-ink-3">{option.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}