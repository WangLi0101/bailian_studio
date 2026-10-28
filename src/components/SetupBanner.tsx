import { ChevronRight, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "./ui";

export function SetupBanner({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[26px] border border-primary/20 bg-gradient-to-br from-primary/12 via-card to-secondary/10 p-4 shadow-card sm:p-5">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-10 h-32 w-32 rounded-full bg-secondary/15 blur-3xl" />
      <div className="relative flex flex-col items-start gap-3.5 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-on-primary shadow-glow">
          <KeyRound className="h-[19px] w-[19px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink">先连接你的百炼账号</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-2">
            填入 DashScope API Key 与 Base URL，即可开始生成。密钥只保存在本机，不会上传。
          </p>
        </div>
        <Button
          size="sm"
          className="shrink-0"
          onClick={onOpenSettings}
          trailing={<ChevronRight className="h-3.5 w-3.5" />}
        >
          去设置
        </Button>
      </div>
      <div className="relative mt-3 flex items-center gap-1.5 border-t border-primary/10 pt-3 text-[10px] text-ink-3">
        <ShieldCheck className="h-3.5 w-3.5 text-success" />
        本地存储 · 直连阿里云百炼 · 无需中转服务器
      </div>
    </div>
  );
}