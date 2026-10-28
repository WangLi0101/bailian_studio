import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Clock,
  Download,
  ExternalLink,
  Image as ImageIcon,
  PenLine,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Video,
  Wand2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { buildLibraryItem, useGeneration } from "../hooks/useGeneration";
import { useMediaActions } from "../hooks/useMediaActions";
import { createImageTask } from "../lib/api";
import { IMAGE_PROMPT_IDEAS, clampImageSize } from "../lib/models";
import type { LibraryItem } from "../types";
import { SectionCard } from "../components/SectionCard";
import { SetupBanner } from "../components/SetupBanner";
import { ModelSelect } from "../components/ModelSelect";
import { SizeGrid } from "../components/OptionGrid";
import { PromptIdeas } from "../components/PromptIdeas";
import { StatusBadge } from "../components/StatusBadge";
import { TaskProgress } from "../components/TaskProgress";
import { SmartImage } from "../components/SmartImage";
import { RecentStrip } from "../components/RecentStrip";
import { MediaLightbox } from "../components/MediaLightbox";
import { Button, Chip, Label, Segmented, Switch, TextArea } from "../components/ui";
import { cn } from "../lib/cn";

const formatElapsed = (seconds: number) =>
  seconds < 60
    ? `${seconds} 秒`
    : `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`;

export function ImageStudio({
  onOpenSettings,
  onNavigateGallery,
  onUseAsFrame,
}: {
  onOpenSettings: () => void;
  onNavigateGallery: () => void;
  onUseAsFrame: (item: LibraryItem) => void;
}) {
  const {
    settings,
    updateSettings,
    addLibraryItem,
    notify,
    library,
    imageModels,
    getImageModel,
  } = useApp();
  const generation = useGeneration("image");
  const { download, openOriginal, downloadingUrl } = useMediaActions();

  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [size, setSize] = useState(
    () => getImageModel(settings.imageModel).sizes[0].value,
  );
  const [count, setCount] = useState(1);
  const [advanced, setAdvanced] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lastItem, setLastItem] = useState<LibraryItem | null>(null);
  const [lightboxItem, setLightboxItem] = useState<LibraryItem | null>(null);

  const hasKey = Boolean(settings.apiKey.trim());
  const model = getImageModel(settings.imageModel);
  const isBusy = generation.isBusy;
  const snapshot = generation.snapshot;
  const urls = snapshot?.urls ?? [];
  const activeUrl = urls[selectedIndex] ?? urls[0] ?? "";
  // 刷新后恢复展示：优先复用已入库的条目（保证 id 一致，删除/撤销才能命中库内记录），
  // 未入库时再用任务元信息 + 快照重建。
  const restoredItem =
    snapshot && generation.meta
      ? (library.find(
          (item) => item.kind === "image" && item.taskId === snapshot.taskId,
        ) ?? buildLibraryItem("image", generation.meta, snapshot))
      : null;
  const resultItem = lastItem ?? restoredItem;
  const activeModel = getImageModel(resultItem?.model ?? settings.imageModel);
  const sizeLabel = size.replace("*", " × ");
  const resultSizeLabel = (resultItem?.size ?? size).replace("*", " × ");
  const maxPrompt = model.maxPrompt ?? 1500;

  const handleModelChange = (value: string) => {
    updateSettings({ imageModel: value });
    setSize(clampImageSize(getImageModel(value), size));
  };

  // 在「设置」页切换默认模型或增删自定义模型后，保持当前尺寸合法。
  useEffect(() => {
    setSize((previous) =>
      clampImageSize(getImageModel(settings.imageModel), previous),
    );
  }, [settings.imageModel, getImageModel]);

  const handleGenerate = async () => {
    if (!hasKey) {
      onOpenSettings();
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;

    const usedModel = settings.imageModel;
    setLastItem(null);
    setSelectedIndex(0);

    const created = await generation.submit(
      { prompt: trimmed, negativePrompt: negative.trim() || undefined, model: usedModel, size },
      () =>
        createImageTask(settings, {
          prompt: trimmed,
          negativePrompt: negative.trim() || undefined,
          size,
          count,
          model: usedModel,
          promptExtend: settings.promptExtend,
          watermark: settings.watermark,
        }),
    );

    if (!created) return;

    const item: LibraryItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      kind: "image",
      urls: created.urls,
      prompt: trimmed,
      negativePrompt: negative.trim() || undefined,
      model: usedModel,
      size,
      createdAt: Date.now(),
      taskId: created.taskId,
    };
    setLastItem(item);
    addLibraryItem(item);
    notify(
      created.urls.length > 1
        ? `已生成 ${created.urls.length} 张图片，并存入作品库`
        : "图片已生成，并存入作品库",
      { severity: "success" },
    );
  };

  const openResult = () => {
    if (!resultItem || !activeUrl) return;
    setLightboxItem({ ...resultItem, urls: [activeUrl] });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          {!hasKey && <SetupBanner onOpenSettings={onOpenSettings} />}

          <SectionCard
            title="创作描述"
            subtitle="描述越具体，画面越接近想象"
            icon={<PenLine className="h-[18px] w-[18px]" />}
            bodyClassName="p-5"
            dense
          >
            <TextArea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              maxLength={maxPrompt}
              placeholder="例如：晨雾中的江南水乡，白墙黛瓦，一叶乌篷船缓缓划过，柔和晨光，电影感构图…"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleGenerate();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between text-[10px] text-ink-3">
              <span>⌘ + Enter 快速生成</span>
              <span className={prompt.length > maxPrompt * 0.93 ? "text-warning" : ""}>
                {prompt.length} / {maxPrompt}
              </span>
            </div>

            <div className="mt-3">
              <PromptIdeas ideas={IMAGE_PROMPT_IDEAS} onPick={setPrompt} />
            </div>

            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="mt-4 flex w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-surface-1/40 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-1/70"
            >
              <span className="flex items-center gap-2 text-[11.5px] font-semibold text-ink-2">
                高级 · 负向提示词
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium text-ink-3">
                  可选
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-ink-3 transition-transform duration-200",
                  advanced && "rotate-180",
                )}
              />
            </button>
            {advanced && (
              <div className="mt-2 animate-fade-up">
                <TextArea
                  value={negative}
                  onChange={(event) => setNegative(event.target.value)}
                  rows={3}
                  maxLength={500}
                  style={{ minHeight: 82 }}
                  placeholder="不希望出现的内容，例如：模糊、低质量、文字、多余手指…"
                />
              </div>
            )}

            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                loading={isBusy}
                disabled={hasKey ? !prompt.trim() : false}
                onClick={() => {
                  void handleGenerate();
                }}
                icon={<Wand2 className="h-[18px] w-[18px]" />}
              >
                {!hasKey ? "配置 API Key 后开始" : isBusy ? "正在生成…" : "生成图片"}
              </Button>
              <p className="mt-2 text-center text-[10px] text-ink-3">
                {model.label} · {sizeLabel} · {count} 张 · 自动收藏
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="生成设置"
            subtitle="选择模型与画面参数"
            icon={<SlidersHorizontal className="h-[18px] w-[18px]" />}
            bodyClassName="p-5"
            dense
          >
            <Label>模型</Label>
            <ModelSelect
              models={imageModels}
              value={settings.imageModel}
              onChange={handleModelChange}
              icon={<Sparkles className="h-[17px] w-[17px]" />}
              label="图片生成模型"
            />

            <div className="mt-4">
              <Label>画面比例</Label>
              <SizeGrid options={model.sizes} value={size} onChange={setSize} />
            </div>

            <div className="mt-4">
              <Label>生成数量</Label>
              <Segmented
                ariaLabel="生成数量"
                value={String(count)}
                onChange={(value) => setCount(Number(value))}
                options={[1, 2, 3, 4].map((value) => ({
                  value: String(value),
                  label: `${value} 张`,
                }))}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1/40 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                提示词智能优化
              </div>
              <Switch
                checked={settings.promptExtend}
                onChange={(checked) => updateSettings({ promptExtend: checked })}
                label="提示词智能优化"
              />
            </div>


          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="结果预览"
            subtitle={
              snapshot && resultItem
                ? `${activeModel.label} · ${resultSizeLabel}`
                : "生成结果会显示在这里"
            }
            icon={<ImageIcon className="h-[18px] w-[18px]" />}
            action={<StatusBadge phase={generation.phase} />}
            bodyClassName="p-4 sm:p-5"
          >
            {(generation.phase === "idle" ||
              (generation.phase === "succeeded" && !resultItem)) && (
              <div className="relative flex min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-line bg-stage stage-dots px-6 py-12 text-center sm:min-h-[520px]">
                <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 animate-float rounded-full bg-primary/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-12 h-72 w-72 animate-float-delayed rounded-full bg-secondary/12 blur-3xl" />
                <div className="relative flex flex-col items-center">
                  <div className="relative">
                    <span className="absolute -inset-4 rounded-[34px] border border-primary/15" />
                    <div className="grid h-20 w-20 place-items-center rounded-[26px] bg-brand-gradient text-on-primary shadow-glow">
                      <Wand2 className="h-8 w-8" strokeWidth={1.8} />
                    </div>
                    <Sparkles className="absolute -right-3 -top-2 h-5 w-5 text-secondary" />
                  </div>
                  <h3 className="mt-6 text-[19px] font-bold tracking-tight text-ink">
                    让想象成为画面
                  </h3>
                  <p className="mt-1.5 max-w-[320px] text-[11.5px] leading-relaxed text-ink-2">
                    在左侧写下你的灵感，选择比例与数量，Wan 模型会为你绘制一张独一无二的作品。
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    <Chip tone="primary" icon={<Sparkles className="h-3 w-3" />}>
                      Wan 文生图
                    </Chip>
                    <Chip>{sizeLabel}</Chip>
                    <Chip>{count} 张</Chip>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrompt(IMAGE_PROMPT_IDEAS[0])}
                    className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card/70 px-3.5 py-2 text-[11px] font-semibold text-ink-2 transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
                  >
                    试试一个灵感
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {(generation.phase === "submitting" ||
              generation.phase === "queued" ||
              generation.phase === "running") && (
              <div className="flex min-h-[440px] items-center justify-center rounded-[22px] border border-line bg-stage stage-dots sm:min-h-[520px]">
                <TaskProgress
                  phase={generation.phase}
                  elapsed={generation.elapsed}
                  taskId={generation.taskId}
                  kind={generation.kind ?? "image"}
                  rawStatus={generation.rawStatus}
                  onCancel={generation.cancel}
                />
              </div>
            )}

            {generation.phase === "failed" && (
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[22px] border border-danger/20 bg-danger/4 px-6 py-12 text-center sm:min-h-[520px]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
                  <CircleAlert className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">这次没有生成成功</h3>
                <p className="mt-1.5 max-w-md text-[11.5px] leading-relaxed text-ink-2">
                  {generation.error}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleGenerate();
                    }}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    重试
                  </Button>
                  <Button size="sm" variant="outline" onClick={generation.reset}>
                    返回
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onOpenSettings}>
                    检查设置
                  </Button>
                </div>
              </div>
            )}

            {generation.phase === "canceled" && (
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[22px] border border-warning/20 bg-warning/4 px-6 py-12 text-center sm:min-h-[520px]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-warning/10 text-warning">
                  <Clock className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">已停止等待</h3>
                <p className="mt-1.5 max-w-md text-[11.5px] leading-relaxed text-ink-2">
                  任务可能仍在百炼云端继续生成，稍后可在控制台查看，或直接重新生成一张。
                </p>
                <div className="mt-5 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleGenerate();
                    }}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    重新生成
                  </Button>
                  <Button size="sm" variant="outline" onClick={generation.reset}>
                    关闭
                  </Button>
                </div>
              </div>
            )}

            {generation.phase === "succeeded" && snapshot && resultItem && activeUrl && (
              <div className="space-y-3">
                <div className="group relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-[22px] border border-line bg-stage p-2 sm:min-h-[520px]">
                  <SmartImage
                    src={activeUrl}
                    alt={resultItem.prompt}
                    fit="contain"
                    eager
                    onClick={openResult}
                    className="h-[400px] w-full rounded-[18px] sm:h-[500px]"
                  />
                  <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <IconGlassButton
                      label="下载图片"
                      onClick={() => {
                        void download(activeUrl, "image");
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </IconGlassButton>
                    <IconGlassButton
                      label="打开原图"
                      onClick={() => {
                        void openOriginal(activeUrl);
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </IconGlassButton>
                  </div>
                </div>

                {urls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {urls.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setSelectedIndex(index)}
                        aria-label={`查看第 ${index + 1} 张图片`}
                        className={cn(
                          "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                          index === selectedIndex
                            ? "border-primary opacity-100"
                            : "border-transparent opacity-60 hover:opacity-100",
                        )}
                      >
                        <SmartImage
                          src={url}
                          alt={`第 ${index + 1} 张`}
                          className="h-full w-full"
                        />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="tonal"
                      loading={downloadingUrl === activeUrl}
                      onClick={() => {
                        void download(activeUrl, "image");
                      }}
                      icon={<Download className="h-3.5 w-3.5" />}
                    >
                      下载
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void openOriginal(activeUrl);
                      }}
                      icon={<ExternalLink className="h-3.5 w-3.5" />}
                    >
                      打开原图
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUseAsFrame({ ...resultItem, urls: [activeUrl] })}
                      icon={<Video className="h-3.5 w-3.5" />}
                    >
                      用作视频首帧
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      void handleGenerate();
                    }}
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    再来一张
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-3">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {activeModel.label}
                  </span>
                  <span>·</span>
                  <span>{resultSizeLabel}</span>
                  <span>·</span>
                  <span>耗时 {formatElapsed(generation.elapsed)}</span>
                  <span>·</span>
                  <span>链接 24 小时内有效，请及时保存</span>
                </div>
              </div>
            )}
          </SectionCard>

          <RecentStrip
            items={library}
            kind="image"
            onOpen={setLightboxItem}
            onViewAll={onNavigateGallery}
          />
        </div>
      </div>

      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
        onUseAsFrame={onUseAsFrame}
      />
    </>
  );
}

function IconGlassButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-white/20 bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
    >
      {children}
    </button>
  );
}