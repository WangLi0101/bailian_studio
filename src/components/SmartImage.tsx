import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "../lib/cn";

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  fit?: "cover" | "contain";
  onClick?: () => void;
  eager?: boolean;
  /** 视频地址：用 video 元素取首帧作为缩略图。 */
  video?: boolean;
  /** 视频首帧封面（例如图生视频的输入图）。 */
  poster?: string;
}

export function SmartImage({
  src,
  alt,
  className,
  imageClassName,
  fit = "cover",
  onClick,
  eager,
  video = false,
  poster,
}: SmartImageProps) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setState("loading");
  }, [src, poster]);

  const useVideo = video && !poster;
  const displaySrc = video && poster ? poster : src;
  const mediaClass = cn(
    "h-full w-full transition-opacity duration-500",
    fit === "cover" ? "object-cover" : "object-contain",
    state === "loaded" ? "opacity-100" : "opacity-0",
    imageClassName,
  );

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-1",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      {state === "loading" && (
        <div className="absolute inset-0 animate-shimmer bg-surface-1" />
      )}
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center text-ink-3">
          <ImageOff className="h-5 w-5" />
          <span className="text-[10px]">{video ? "视频预览不可用" : "图片加载失败"}</span>
        </div>
      ) : useVideo ? (
        <video
          src={`${src}${src.includes("#") ? "" : "#t=0.1"}`}
          aria-label={alt}
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setState("loaded")}
          onLoadedMetadata={(event) => {
            const player = event.currentTarget;
            // WebKit 在仅加载元数据时未必会绘制首帧，主动 seek 一下。
            if (player.currentTime === 0) {
              player.currentTime = Math.min(0.1, player.duration || 0.1);
            }
          }}
          onSeeked={() => setState("loaded")}
          onError={() => setState("error")}
          className={mediaClass}
        />
      ) : (
        <img
          src={displaySrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          draggable={false}
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={mediaClass}
        />
      )}
    </div>
  );
}