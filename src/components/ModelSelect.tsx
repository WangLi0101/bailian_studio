import { useCallback, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ModelOption } from "../types";
import { cn } from "../lib/cn";
import { Chip } from "./ui";
import { useDismissable } from "../hooks/useMediaActions";

function tagTone(tag?: string): "primary" | "secondary" | "neutral" {
  if (tag === "推荐") return "primary";
  if (tag === "新" || tag === "自定义") return "secondary";
  return "neutral";
}

export function ModelSelect({
  models,
  value,
  onChange,
  icon,
  label,
}: {
  models: ModelOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: ReactNode;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismissable<HTMLDivElement>(open, close);
  const selected = models.find((model) => model.id === value) ?? models[0];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((previous) => !previous)}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border bg-surface-1/50 px-3 py-2.5 text-left transition-all duration-200",
          "hover:border-line-strong hover:bg-surface-1/80",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          open ? "border-primary/35 bg-card ring-4 ring-primary/10" : "border-line",
        )}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-ink">
              {selected.label}
            </span>
            {selected.tag && (
              <Chip
                tone={tagTone(selected.tag)}
                className="px-1.5 py-0.5 text-[9px]"
              >
                {selected.tag}
              </Chip>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-2">
            {selected.desc}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-3 transition-transform duration-200",
            open && "rotate-180 text-primary",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 origin-top animate-scale-in rounded-2xl border border-line bg-card p-1.5 shadow-float"
        >
          <div className="max-h-[320px] overflow-y-auto overscroll-contain pr-0.5">
            {models.map((model) => {
              const active = model.id === value;
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150",
                    active ? "bg-primary/10" : "hover:bg-surface-1",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
                      active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-line-strong text-transparent",
                    )}
                  >
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "truncate text-[12.5px] font-semibold",
                          active ? "text-primary" : "text-ink",
                        )}
                      >
                        {model.label}
                      </span>
                      {model.tag && (
                        <Chip
                          tone={tagTone(model.tag)}
                          className="px-1.5 py-0.5 text-[9px]"
                        >
                          {model.tag}
                        </Chip>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-2">
                      {model.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}