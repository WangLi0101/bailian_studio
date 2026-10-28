import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { downloadToDisk, friendlyError, guessFileName } from "../lib/api";
import { openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";

export function useMediaActions() {
  const { notify } = useApp();
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);

  const download = async (url: string, kind: "image" | "video") => {
    if (downloadingUrl) return;
    setDownloadingUrl(url);
    try {
      const path = await downloadToDisk(url, guessFileName(url, kind));
      notify(path ? `已保存到\n${path}` : "已开始下载", {
        severity: "success",
        duration: 6500,
        action: path
          ? {
              label: "在文件夹中显示",
              onClick: () => {
                void revealItemInDir(path).catch(() => undefined);
              },
            }
          : undefined,
      });
    } catch (error) {
      notify(friendlyError(error), { severity: "error", duration: 6000 });
    } finally {
      setDownloadingUrl(null);
    }
  };

  const openOriginal = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return { download, openOriginal, downloadingUrl };
}

/** Small hook that closes a floating panel when clicking outside it. */
export function useDismissable<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  return ref;
}

export function useCopyPrompt() {
  const { notify } = useApp();
  return async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("提示词已复制到剪贴板", { severity: "info", duration: 2200 });
    } catch {
      notify("复制失败，请手动选择文本复制", { severity: "warning" });
    }
  };
}

export function useOpenExternal() {
  const { notify } = useApp();
  return async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        notify("无法打开链接，请手动访问", { severity: "warning" });
      }
    }
  };
}

export type MediaActionIcon = ReactNode;

export function useDelayedFlag(active: boolean, delay = 220): boolean {
  const [flag, setFlag] = useState(false);
  useEffect(() => {
    if (!active) {
      setFlag(false);
      return;
    }
    const timer = window.setTimeout(() => setFlag(true), delay);
    return () => window.clearTimeout(timer);
  }, [active, delay]);
  return flag;
}