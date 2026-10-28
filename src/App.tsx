import { useCallback, useEffect, useRef, useState } from "react";
import type { LibraryItem, PageKey, VideoHandoff } from "./types";
import { useApp } from "./context/AppContext";
import { NavRail } from "./components/NavRail";
import { TopBar } from "./components/TopBar";
import { ImageStudio } from "./pages/ImageStudio";
import { VideoStudio } from "./pages/VideoStudio";
import { Gallery } from "./pages/Gallery";
import { Settings } from "./pages/Settings";
import { cn } from "./lib/cn";

const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  image: {
    title: "图片创作",
    subtitle: "用文字描述，让 Wan 为你绘制画面",
  },
  video: {
    title: "视频创作",
    subtitle: "从一句话或一张图开始，生成流动的镜头",
  },
  gallery: {
    title: "作品库",
    subtitle: "收藏每一次生成，随时回看与下载",
  },
  settings: {
    title: "设置",
    subtitle: "配置连接、默认模型与界面外观",
  },
};

export default function App() {
  const { library } = useApp();
  const [page, setPage] = useState<PageKey>("image");
  const [handoff, setHandoff] = useState<VideoHandoff | null>(null);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const navigate = useCallback((next: PageKey) => {
    setPage(next);
  }, []);

  const useAsFrame = useCallback((item: LibraryItem) => {
    setHandoff({ imageUrl: item.urls[0], prompt: item.prompt });
    setPage("video");
  }, []);

  const clearHandoff = useCallback(() => {
    setHandoff(null);
  }, []);

  const meta = PAGE_META[page];

  return (
    <div className="flex h-full w-full overflow-hidden bg-surface text-ink">
      <NavRail page={page} onNavigate={navigate} libraryCount={library.length} />

      <div className="bg-hero relative flex min-w-0 flex-1 flex-col">
        <TopBar
          title={meta.title}
          subtitle={meta.subtitle}
          onOpenSettings={() => navigate("settings")}
        />

        <main
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto w-full max-w-[1520px] px-4 py-4 sm:px-6 sm:py-5">
            <section
              className={cn(page === "image" ? "animate-fade-up" : "hidden")}
              aria-hidden={page !== "image"}
            >
              <ImageStudio
                onOpenSettings={() => navigate("settings")}
                onNavigateGallery={() => navigate("gallery")}
                onUseAsFrame={useAsFrame}
              />
            </section>

            <section
              className={cn(page === "video" ? "animate-fade-up" : "hidden")}
              aria-hidden={page !== "video"}
            >
              <VideoStudio
                onOpenSettings={() => navigate("settings")}
                onNavigateGallery={() => navigate("gallery")}
                handoff={handoff}
                onClearHandoff={clearHandoff}
              />
            </section>

            <section
              className={cn(page === "gallery" ? "animate-fade-up" : "hidden")}
              aria-hidden={page !== "gallery"}
            >
              <Gallery
                onCreateImage={() => navigate("image")}
                onCreateVideo={() => navigate("video")}
                onUseAsFrame={useAsFrame}
              />
            </section>

            <section
              className={cn(page === "settings" ? "animate-fade-up" : "hidden")}
              aria-hidden={page !== "settings"}
            >
              <Settings onOpenGallery={() => navigate("gallery")} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}