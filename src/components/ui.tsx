import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/cn";

type ButtonVariant = "primary" | "tonal" | "outline" | "ghost" | "danger" | "soft";
type ButtonSize = "sm" | "md" | "lg";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-on-primary shadow-glow hover:brightness-[1.06] disabled:shadow-none",
  tonal:
    "bg-primary/10 text-primary hover:bg-primary/15 dark:hover:bg-primary/20",
  outline:
    "border border-line-strong bg-card/50 text-ink hover:border-ink-3/40 hover:bg-surface-1",
  ghost: "text-ink-2 hover:bg-surface-1 hover:text-ink",
  danger: "text-danger hover:bg-danger/10",
  soft: "bg-surface-1 text-ink hover:bg-surface-2",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-[12px]",
  md: "h-11 gap-2 rounded-2xl px-4 text-[13px]",
  lg: "h-[52px] gap-2 rounded-[18px] px-5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  trailing,
  fullWidth,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-flex select-none items-center justify-center font-semibold transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45",
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {trailing && <span className="shrink-0">{trailing}</span>}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: "sm" | "md";
}

export function IconButton({
  label,
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid cursor-pointer place-items-center rounded-xl text-ink-2 transition-all duration-200",
        "hover:bg-surface-1 hover:text-ink active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        size === "md" ? "h-10 w-10" : "h-8 w-8",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type ChipTone = "neutral" | "primary" | "secondary" | "success" | "warning" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  primary: "bg-primary/12 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
};

export function Chip({
  children,
  tone = "neutral",
  className,
  icon,
}: {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-semibold leading-none tracking-wide",
        CHIP_TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        "disabled:cursor-not-allowed disabled:opacity-45",
        checked
          ? "border-transparent bg-primary"
          : "border-line-strong bg-surface-2",
      )}
    >
      <span
        className={cn(
          "pointer-events-none grid place-items-center rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "h-[20px] w-[20px] translate-x-[22px]" : "h-[18px] w-[18px] translate-x-[4px]",
        )}
      />
    </button>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-2xl border border-line bg-surface-1/70 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-[11.5px] font-semibold transition-all duration-200",
              active
                ? "bg-card text-ink shadow-sm ring-1 ring-line"
                : "text-ink-2 hover:bg-card/50 hover:text-ink",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Label({
  children,
  trailing,
  className,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
      <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-2">
        {children}
      </span>
      {trailing}
    </div>
  );
}

const INPUT_BASE =
  "w-full rounded-2xl border border-line bg-surface-1/60 px-3.5 text-[13px] text-ink outline-none transition-all duration-200 placeholder:text-ink-3 hover:border-line-strong focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  leading?: ReactNode;
  trailing?: ReactNode;
  containerClassName?: string;
}

export function TextInput({
  leading,
  trailing,
  className,
  containerClassName,
  ...props
}: TextInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      {leading && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">
          {leading}
        </span>
      )}
      <input
        className={cn(
          INPUT_BASE,
          "h-11",
          leading && "pl-10",
          trailing && "pr-12",
          className,
        )}
        {...props}
      />
      {trailing && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </div>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  containerClassName?: string;
}

export function TextArea({
  className,
  containerClassName,
  ...props
}: TextAreaProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <textarea
        className={cn(
          INPUT_BASE,
          "min-h-[112px] resize-none py-3 leading-relaxed",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function Hint({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[11px] leading-relaxed text-ink-3", className)}>
      {children}
    </p>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}