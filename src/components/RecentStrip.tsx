import { ArrowRight, Film, Image as ImageIcon, Images, Play } from "lucide-react";
import type { LibraryItem } from "../types";
import { SectionCard } from "./SectionCard";
import { SmartImage } from "./SmartImage";

export function RecentStrip({
  items,
  kind,
  onOpen,
  onViewAll,
}: {
  items: LibraryItem[];
  kind: "image" | "video";
  onOpen: (item: LibraryItem) => void;
  onViewAll: () => void;
}) {
  const filtered = items.filter((item) => item.kind === kind).slice(0, 10);
  const isVideo = kind === "video";

  return (
    <SectionCard
      title={isVideo ? "最近视频" : "最近图片"}
      subtitle="点击缩略图查看详情"
      icon={
        isVideo ? <Film className="h-[18px] w-[18px]" /> : <Images className="h-[18px] w-[18px]" />
      }
      action={
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-1 hover:text-primary"
        >
          全部作品
          <ArrowRight className="h-3 w-3" />
        </button>
      }
      bodyClassName="p-4 sm:p-5"
    >
      {filtered.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-line px-4 py-5 text-[11px] text-ink-3">
          <ImageIcon className="h-4 w-4" />
          还没有作品，完成第一次生成后会出现在这里
        </div>
      ) : (
        <div
          className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar"
          style={{
            maskImage: "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, #000 calc(100% - 24px), transparent)",
          }}
        >
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              title={item.prompt}
              className="group relative h-[82px] w-[112px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface-1 text-left transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <SmartImage
                src={item.urls[0]}
                alt={item.prompt}
                video={isVideo}
                poster={item.inputImageUrl}
                className="h-full w-full transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />
              {isVideo && (
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                    <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
                  </span>
                </span>
              )}
              <span className="absolute bottom-1 left-1.5 right-1.5 truncate text-[9px] font-medium text-white/90">
                {item.prompt}
              </span>
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}