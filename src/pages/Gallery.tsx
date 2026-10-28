import { useMemo, useState } from "react";
import {
  Download,
  Film,
  Image as ImageIcon,
  Images,
  Loader2,
  Play,
  Search,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useMediaActions } from "../hooks/useMediaActions";
import type { LibraryItem, MediaKind } from "../types";
import { formatRelativeTime } from "../lib/cn";
import { SmartImage } from "../components/SmartImage";
import { MediaLightbox } from "../components/MediaLightbox";
import { Button, Chip, Segmented, TextInput } from "../components/ui";

type Filter = "all" | MediaKind;

export function Gallery({
  onCreateImage,
  onCreateVideo,
  onUseAsFrame,
}: {
  onCreateImage: () => void;
  onCreateVideo: () => void;
  onUseAsFrame: (item: LibraryItem) => void;
}) {
  const {
    library,
    removeLibraryItem,
    clearLibrary,
    notify,
    getImageModel,
    getVideoModel,
  } = useApp();
  const { download, downloadingUrl } = useMediaActions();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [lightboxItem, setLightboxItem] = useState<LibraryItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const counts = useMemo(
    () => ({
      all: library.length,
      image: library.filter((item) => item.kind === "image").length,
      video: library.filter((item) => item.kind === "video").length,
    }),
    [library],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return library.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (query && !item.prompt.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [library, filter, search]);

  const modelLabel = (item: LibraryItem) =>
    item.kind === "image" ? getImageModel(item.model).label : getVideoModel(item.model).label;

  const handleDelete = (item: LibraryItem) => {
    if (confirmId !== item.id) {
      setConfirmId(item.id);
      window.setTimeout(
        () => setConfirmId((current) => (current === item.id ? null : current)),
        3200,
      );
      return;
    }
    removeLibraryItem(item.id);
    setConfirmId(null);
    if (lightboxItem?.id === item.id) setLightboxItem(null);
    notify("已从作品库移除", { severity: "info", duration: 2400 });
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      window.setTimeout(() => setConfirmClear(false), 3200);
      return;
    }
    clearLibrary();
    setConfirmClear(false);
    notify("作品库已清空", { severity: "info", duration: 2400 });
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-[26px] border border-line bg-card p-3.5 shadow-card sm:flex-row sm:items-center sm:p-4">
        <Segmented<Filter>
          ariaLabel="作品类型筛选"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `全部 ${counts.all}` },
            { value: "image", label: `图片 ${counts.image}` },
            { value: "video", label: `视频 ${counts.video}` },
          ]}
        />
        <div className="flex flex-1 items-center gap-2">
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leading={<Search className="h-4 w-4" />}
            placeholder="搜索提示词…"
            aria-label="搜索作品"
            containerClassName="w-full sm:max-w-[240px] sm:ml-auto"
            className="h-9 text-[12px]"
          />
          <Button
            variant={confirmClear ? "danger" : "ghost"}
            size="sm"
            disabled={library.length === 0}
            onClick={handleClear}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            className={confirmClear ? "bg-danger/10" : ""}
          >
            {confirmClear ? "确认清空？" : "清空"}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden rounded-[30px] border border-line bg-card px-6 py-14 text-center shadow-card">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />
          <div className="relative">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-brand-gradient text-on-primary shadow-glow">
              <Images className="h-8 w-8" strokeWidth={1.7} />
              <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-xl border border-line bg-card text-secondary shadow-md">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            </div>
            <h3 className="mt-6 text-[18px] font-bold tracking-tight text-ink">
              {library.length === 0 ? "作品库还是空的" : "没有匹配的作品"}
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-[11.5px] leading-relaxed text-ink-2">
              {library.length === 0
                ? "完成的图片和视频会自动收藏在这里。现在就开始第一次创作吧。"
                : "换一个关键词，或者切换作品类型再试试。"}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {library.length === 0 ? (
                <>
                  <Button size="sm" onClick={onCreateImage} icon={<ImageIcon className="h-3.5 w-3.5" />}>
                    创作图片
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateVideo}
                    icon={<Video className="h-3.5 w-3.5" />}
                  >
                    创作视频
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  清除筛选
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((item) => {
              const isVideo = item.kind === "video";
              const downloading = downloadingUrl === item.urls[0];
              const deleting = confirmId === item.id;
              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-[24px] border border-line bg-card shadow-card transition-all duration-300 hover:border-primary/25 hover:shadow-float"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-[23px] bg-surface-1">
                    <SmartImage
                      src={item.urls[0]}
                      alt={item.prompt}
                      video={isVideo}
                      poster={item.inputImageUrl}
                      className="h-full w-full transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10 opacity-70" />
                    {isVideo && (
                      <span className="pointer-events-none absolute inset-0 grid place-items-center">
                        <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-white/15 text-white backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
                          <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
                        </span>
                      </span>
                    )}

                    <div className="pointer-events-none absolute left-2.5 top-2.5 z-20 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[9.5px] font-semibold text-white/90 backdrop-blur-md">
                        {isVideo ? (
                          <Film className="h-2.5 w-2.5" />
                        ) : (
                          <ImageIcon className="h-2.5 w-2.5" />
                        )}
                        {isVideo ? "视频" : "图片"}
                      </span>
                      {item.urls.length > 1 && (
                        <span className="rounded-full bg-black/45 px-2 py-1 text-[9.5px] font-semibold text-white/90 backdrop-blur-md">
                          {item.urls.length} 张
                        </span>
                      )}
                    </div>

                    <div className="absolute right-2.5 top-2.5 z-30 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                      <button
                        type="button"
                        aria-label="下载"
                        title="下载到本地"
                        onClick={() => {
                          void download(item.urls[0], item.kind);
                        }}
                        className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                      >
                        {downloading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={deleting ? "确认删除" : "删除"}
                        title={deleting ? "再次点击确认删除" : "从作品库移除"}
                        onClick={() => handleDelete(item)}
                        className={
                          deleting
                            ? "grid h-8 w-8 cursor-pointer place-items-center rounded-lg bg-danger text-white shadow-md"
                            : "grid h-8 w-8 cursor-pointer place-items-center rounded-lg border border-white/20 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-danger/80"
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {isVideo && item.duration && (
                      <span className="pointer-events-none absolute bottom-2.5 right-2.5 z-20 rounded-md bg-black/55 px-1.5 py-0.5 text-[9.5px] font-semibold text-white/90">
                        {item.duration < 0 ? "智能时长" : `${item.duration}s`}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      aria-label={`查看作品：${item.prompt.slice(0, 30)}`}
                      className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/70"
                    />
                  </div>

                  <div className="pointer-events-none relative z-20 p-3.5">
                    <p className="line-clamp-2 min-h-[34px] text-[11.5px] font-medium leading-relaxed text-ink">
                      {item.prompt}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[9.5px] text-ink-3">
                      <span className="truncate">{modelLabel(item)}</span>
                      <span className="shrink-0">{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <Chip tone="neutral" className="px-1.5 py-0.5 text-[9px]">
                {filtered.length}
              </Chip>
              件作品
            </span>
            <span>生成链接通常 24 小时后失效，建议及时下载保存。</span>
          </div>
        </>
      )}

      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onUseAsFrame={onUseAsFrame}
      />
    </>
  );
}