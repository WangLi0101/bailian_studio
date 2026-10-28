import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Download,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type { LibraryItem } from "../types";
import { useApp } from "../context/AppContext";
import { useCopyPrompt, useMediaActions } from "../hooks/useMediaActions";
import { Button, Chip, IconButton } from "./ui";
import { formatFullTime } from "../lib/cn";

export function MediaLightbox({
  item,
  onClose,
  onUseAsFrame,
}: {
  item: LibraryItem | null;
  onClose: () => void;
  onUseAsFrame?: (item: LibraryItem) => void;
}) {
  const { addLibraryItem, removeLibraryItem, notify, getImageModel, getVideoModel } =
    useApp();
  const { download, openOriginal, downloadingUrl } = useMediaActions();
  const copyPrompt = useCopyPrompt();

  useEffect(() => {
    if (!item) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [item, onClose]);

  if (!item) return null;

  const url = item.urls[0];
  const isVideo = item.kind === "video";
  const downloading = downloadingUrl === url;
  const modelLabel = isVideo
    ? getVideoModel(item.model).label
    : getImageModel(item.model).label;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="作品详情"
        className="relative flex max-h-[92vh] w-full max-w-6xl animate-scale-in flex-col overflow-hidden rounded-[28px] border border-line bg-card shadow-float lg:flex-row"
      >
        <div className="relative flex min-h-[240px] flex-1 items-center justify-center overflow-hidden bg-[#08080c] p-3 sm:p-4 lg:min-h-[600px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_320px_at_50%_0%,rgba(120,110,255,0.18),transparent_70%)]" />
          {isVideo ? (
            <video
              key={url}
              src={url}
              poster={item.inputImageUrl}
              controls
              autoPlay
              playsInline
              className="relative max-h-[72vh] w-full rounded-xl bg-black object-contain"
            />
          ) : (
            <img
              src={url}
              alt={item.prompt}
              draggable={false}
              className="relative max-h-[74vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
          )}
          <div className="absolute left-3 top-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-md">
              {isVideo ? (
                <Film className="h-3 w-3" />
              ) : (
                <ImageIcon className="h-3 w-3" />
              )}
              {isVideo ? "视频" : "图片"}
            </span>
          </div>
          <div className="absolute right-3 top-3 lg:hidden">
            <IconButton
              label="关闭"
              onClick={onClose}
              className="bg-black/40 text-white hover:bg-black/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col overflow-y-auto p-5 sm:p-6 lg:w-[340px]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-ink">作品详情</h2>
              <p className="mt-0.5 text-[10.5px] text-ink-3">
                {formatFullTime(item.createdAt)}
              </p>
            </div>
            <IconButton
              label="关闭"
              onClick={onClose}
              className="hidden lg:grid"
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>

          <div className="rounded-2xl border border-line bg-surface-1/50 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3">
                PROMPT
              </span>
              <button
                type="button"
                onClick={() => {
                  void copyPrompt(item.prompt);
                }}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Copy className="h-3 w-3" />
                复制
              </button>
            </div>
            <p className="max-h-[160px] overflow-y-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-ink">
              {item.prompt}
            </p>
            {item.negativePrompt && (
              <p className="mt-2 border-t border-line pt-2 text-[10.5px] leading-relaxed text-ink-3">
                负向：{item.negativePrompt}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Meta label="模型" value={modelLabel} />
            {item.size && <Meta label="尺寸" value={item.size.replace("*", " × ")} />}
            {item.duration && (
              <Meta
                label="时长"
                value={item.duration < 0 ? "智能时长" : `${item.duration} 秒`}
              />
            )}
            <Meta
              label={isVideo ? "类型" : "数量"}
              value={isVideo ? "AI 视频" : "AI 图片"}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Chip tone={isVideo ? "secondary" : "primary"}>
              {isVideo ? "Wan Video" : "Wan Image"}
            </Chip>
            <Chip tone="neutral">百炼 DashScope</Chip>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button
              fullWidth
              onClick={() => {
                void download(url, item.kind);
              }}
              icon={
                downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )
              }
            >
              下载到本地
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => {
                void openOriginal(url);
              }}
              icon={<ExternalLink className="h-4 w-4" />}
            >
              打开{isVideo ? "视频" : "原图"}链接
            </Button>
            {!isVideo && onUseAsFrame && (
              <Button
                fullWidth
                variant="tonal"
                onClick={() => {
                  onUseAsFrame(item);
                  onClose();
                }}
                icon={<Video className="h-4 w-4" />}
              >
                用作视频首帧
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                removeLibraryItem(item.id);
                notify("已从作品库移除", {
                  severity: "info",
                  duration: 6000,
                  action: { label: "撤销", onClick: () => addLibraryItem(item) },
                });
                onClose();
              }}
              className="mt-1 flex h-9 items-center justify-center gap-1.5 rounded-xl text-[11.5px] font-semibold text-ink-3 transition-colors hover:bg-danger/8 hover:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" />
              从作品库移除
            </button>
          </div>

          <p className="mt-auto pt-5 text-[10px] leading-relaxed text-ink-3">
            生成结果链接由百炼提供，通常 24 小时后失效。建议及时下载到本地保存。
          </p>
        </aside>
      </div>
    </div>,
    document.body,
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-2.5 py-2">
      <p className="text-[9.5px] font-semibold tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 truncate font-mono text-[10.5px] text-ink" title={value}>
        {value}
      </p>
    </div>
  );
}