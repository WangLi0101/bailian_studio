import {
  Image as ImageIcon,
  Library,
  Settings,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { PageKey } from "../types";
import { cn } from "../lib/cn";

interface NavItem {
  key: PageKey;
  label: string;
  title: string;
  icon: LucideIcon;
}

const PRIMARY_ITEMS: NavItem[] = [
  { key: "image", label: "图片", title: "图片创作", icon: ImageIcon },
  { key: "video", label: "视频", title: "视频创作", icon: Video },
  { key: "gallery", label: "作品库", title: "作品库", icon: Library },
];

export function NavRail({
  page,
  onNavigate,
  libraryCount,
}: {
  page: PageKey;
  onNavigate: (page: PageKey) => void;
  libraryCount: number;
}) {
  return (
    <aside className="relative z-20 flex w-[88px] shrink-0 flex-col items-center border-r border-line bg-card/60 py-4 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onNavigate("image")}
        title="Bailian Studio"
        aria-label="Bailian Studio 首页"
        className="group relative mb-7 grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-on-primary shadow-glow transition-transform duration-300 hover:scale-105 active:scale-95"
      >
        <Sparkles className="h-[21px] w-[21px]" strokeWidth={2.2} />
        <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-card bg-secondary" />
      </button>

      <nav className="flex flex-col items-center gap-2">
        {PRIMARY_ITEMS.map((item) => {
          const active = page === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              title={item.title}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(item.key)}
              className={cn(
                "group flex w-[68px] flex-col items-center gap-1 rounded-2xl py-1 transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
              )}
            >
              <span
                className={cn(
                  "relative grid h-[30px] w-14 place-items-center rounded-full transition-all duration-200",
                  active
                    ? "bg-primary/14 text-primary"
                    : "text-ink-3 group-hover:bg-surface-1 group-hover:text-ink",
                )}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.2 : 1.9} />
                {item.key === "gallery" && libraryCount > 0 && (
                  <span className="absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-secondary" />
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-200",
                  active ? "font-semibold text-primary" : "text-ink-3 group-hover:text-ink-2",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        title="设置"
        aria-label="设置"
        aria-current={page === "settings" ? "page" : undefined}
        onClick={() => onNavigate("settings")}
        className={cn(
          "group flex w-[68px] flex-col items-center gap-1 rounded-2xl py-1 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
        )}
      >
        <span
          className={cn(
            "grid h-[30px] w-14 place-items-center rounded-full transition-all duration-200",
            page === "settings"
              ? "bg-primary/14 text-primary"
              : "text-ink-3 group-hover:bg-surface-1 group-hover:text-ink",
          )}
        >
          <Settings
            className="h-[19px] w-[19px]"
            strokeWidth={page === "settings" ? 2.2 : 1.9}
          />
        </span>
        <span
          className={cn(
            "text-[10px] font-medium transition-colors",
            page === "settings" ? "font-semibold text-primary" : "text-ink-3 group-hover:text-ink-2",
          )}
        >
          设置
        </span>
      </button>

      <span className="mt-3 text-[8px] font-semibold tracking-[0.18em] text-ink-3/70">
        V0.1
      </span>
    </aside>
  );
}