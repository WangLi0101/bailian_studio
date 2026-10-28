import { useId } from "react";
import { Film, Sparkles, Square } from "lucide-react";
import { Button } from "./ui";
import type { GenerationPhase } from "../hooks/useGeneration";
import { cn } from "../lib/cn";

const IMAGE_TIPS = [
  "加入光线与镜头语言，例如「逆光」「35mm 胶片」，画面会更有质感。",
  "画面比例会明显影响构图，竖屏更适合人物特写与海报。",
  "一次生成多张，更容易挑到最接近想象的那一张。",
];

const VIDEO_TIPS = [
  "先描述主体与动作，再补充镜头运动与光线，效果更稳定。",
  "视频任务通常需要 2–5 分钟，请保持网络连接稳定。",
  "图生视频时，首帧图片的构图会决定镜头的起点。",
];

export function TaskProgress({
  phase,
  elapsed,
  taskId,
  kind,
  rawStatus,
  onCancel,
}: {
  phase: GenerationPhase;
  elapsed: number;
  taskId: string | null;
  kind: "image" | "video";
  /** 服务端返回的原始状态（PENDING / RUNNING 等）。 */
  rawStatus?: string;
  onCancel: () => void;
}) {
  const rawId = useId();
  const gradientId = `progress-${rawId.replace(/:/g, "")}`;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;

  // 渐近曲线估算进度：早期快速增长、后期放缓，永远不会自己走到 100%，
  // 只有真正轮询到 SUCCEEDED 才算完成（成功时由页面渲染结果）。
  const speed = kind === "image" ? 11 : 95;
  const progress =
    phase === "submitting"
      ? 4
      : phase === "queued"
        ? 10
        : Math.min(94, Math.round(94 * (1 - Math.exp(-elapsed / speed))));

  const label =
    phase === "submitting"
      ? "正在创建生成任务"
      : phase === "queued"
        ? "任务已提交，正在排队等待调度"
        : kind === "image"
          ? "正在绘制你的画面"
          : "正在渲染视频画面";

  const formatElapsed = (seconds: number) =>
    seconds < 60
      ? `${seconds} 秒`
      : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;

  const tips = kind === "image" ? IMAGE_TIPS : VIDEO_TIPS;
  const tip = tips[Math.floor(elapsed / 8) % tips.length];
  const Icon = kind === "image" ? Sparkles : Film;

  return (
    <div className="flex w-full flex-col items-center py-6 text-center sm:py-10">
      <div className="relative h-[136px] w-[136px]">
        <svg
          viewBox="0 0 136 136"
          className="h-full w-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="68"
            cy="68"
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="5"
          />
          <circle
            cx="68"
            cy="68"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress / 100)}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="100%" stopColor="var(--secondary)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative grid h-[74px] w-[74px] place-items-center rounded-[26px] bg-brand-gradient text-on-primary shadow-glow">
            <Icon className="h-7 w-7" strokeWidth={1.9} />
            <span className="absolute -inset-1.5 -z-10 rounded-[30px] bg-primary/15 blur-md" />
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-baseline gap-2">
        <p className="text-[14px] font-bold text-ink">{label}</p>
        <span className="font-mono text-[11px] font-semibold text-primary">
          {progress}%
        </span>
      </div>
      <p className="mt-1 text-[11px] text-ink-2">
        已等待 {formatElapsed(elapsed)}
        {kind === "video" ? " · 视频任务通常需要 2–5 分钟" : " · 通常需要 10–40 秒"}
      </p>

      <p className="mt-4 max-w-[380px] text-[11px] leading-relaxed text-ink-3">
        {tip}
      </p>

      <div className="mt-5 flex items-center gap-3">
        {taskId && (
          <span className="rounded-lg bg-surface-1 px-2 py-1 font-mono text-[10px] tracking-wide text-ink-3">
            {taskId.length > 18 ? `${taskId.slice(0, 16)}…` : taskId}
          </span>
        )}
        {rawStatus && (
          <span className="rounded-lg bg-surface-1 px-2 py-1 font-mono text-[10px] tracking-wide text-ink-3">
            {rawStatus}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          icon={<Square className="h-3 w-3" fill="currentColor" />}
          className={cn("text-ink-2")}
        >
          停止等待
        </Button>
      </div>
      <p className="mt-2 text-[10px] text-ink-3">
        停止等待仅结束本地跟踪，云端任务会继续完成
      </p>
    </div>
  );
}