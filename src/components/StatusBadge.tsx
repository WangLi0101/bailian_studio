import { cn } from "../lib/cn";
import type { GenerationPhase } from "../hooks/useGeneration";

const STATUS_MAP: Record<
  GenerationPhase,
  { label: string; className: string; dot: string; pulse?: boolean }
> = {
  idle: {
    label: "等待创作",
    className: "bg-surface-2 text-ink-2",
    dot: "bg-ink-3",
  },
  submitting: {
    label: "提交任务",
    className: "bg-primary/10 text-primary",
    dot: "bg-primary",
    pulse: true,
  },
  queued: {
    label: "排队中",
    className: "bg-primary/10 text-primary",
    dot: "bg-primary",
    pulse: true,
  },
  running: {
    label: "生成中",
    className: "bg-primary/10 text-primary",
    dot: "bg-primary",
    pulse: true,
  },
  succeeded: {
    label: "已完成",
    className: "bg-success/12 text-success",
    dot: "bg-success",
  },
  failed: {
    label: "生成失败",
    className: "bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  canceled: {
    label: "已停止等待",
    className: "bg-warning/12 text-warning",
    dot: "bg-warning",
  },
};

export function StatusBadge({
  phase,
  className,
}: {
  phase: GenerationPhase;
  className?: string;
}) {
  const status = STATUS_MAP[phase];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[10.5px] font-semibold leading-none",
        status.className,
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status.dot,
          status.pulse && "animate-pulse-dot",
        )}
      />
      {status.label}
    </span>
  );
}