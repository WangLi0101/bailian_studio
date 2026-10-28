import { BookOpen, ChevronRight, KeyRound, Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";
import { IconButton } from "./ui";
import { maskKey } from "../lib/cn";
import { useOpenExternal } from "../hooks/useMediaActions";

const DOCS_URL = "https://help.aliyun.com/zh/model-studio/";

export function TopBar({
  title,
  subtitle,
  onOpenSettings,
}: {
  title: string;
  subtitle: string;
  onOpenSettings: () => void;
}) {
  const { settings, updateSettings, mode } = useApp();
  const openExternal = useOpenExternal();
  const hasKey = Boolean(settings.apiKey.trim());

  return (
    <header className="glass relative z-10 flex h-[76px] shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-bold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-0.5 truncate text-[11.5px] text-ink-2">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        title={hasKey ? "查看连接设置" : "前往设置 API Key"}
        className={
          hasKey
            ? "group flex items-center gap-2 rounded-full border border-success/20 bg-success/8 px-3 py-1.5 text-[10.5px] font-semibold text-success transition-colors hover:bg-success/12"
            : "group flex items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3 py-1.5 text-[10.5px] font-semibold text-warning transition-colors hover:bg-warning/15"
        }
      >
        {hasKey ? (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            <span className="hidden sm:inline">已连接百炼</span>
            <span className="font-mono text-[10px] opacity-70">
              {maskKey(settings.apiKey)}
            </span>
          </>
        ) : (
          <>
            <KeyRound className="h-3.5 w-3.5" />
            未连接百炼
          </>
        )}
        <ChevronRight className="h-3 w-3 opacity-50 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className="mx-0.5 hidden h-6 w-px bg-line sm:block" />

      <IconButton
        label={mode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
        onClick={() =>
          updateSettings({ themeMode: mode === "dark" ? "light" : "dark" })
        }
      >
        {mode === "dark" ? (
          <Sun className="h-[18px] w-[18px]" />
        ) : (
          <Moon className="h-[18px] w-[18px]" />
        )}
      </IconButton>

      <IconButton
        label="阿里云百炼文档"
        onClick={() => {
          void openExternal(DOCS_URL);
        }}
      >
        <BookOpen className="h-[18px] w-[18px]" />
      </IconButton>
    </header>
  );
}