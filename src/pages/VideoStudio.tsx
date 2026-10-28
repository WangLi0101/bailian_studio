import { useEffect, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Clock,
  Download,
  ExternalLink,
  Film,
  ImagePlus,
  Link2,
  PenLine,
  Play,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Timer,
  Video,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useGeneration } from "../hooks/useGeneration";
import { useMediaActions } from "../hooks/useMediaActions";
import { createVideoTask } from "../lib/api";
import {
  VIDEO_PROMPT_IDEAS,
  clampVideoResolution,
  clampVideoSize,
  type VideoResolution,
} from "../lib/models";
import type { LibraryItem, VideoHandoff } from "../types";
import { SectionCard } from "../components/SectionCard";
import { SetupBanner } from "../components/SetupBanner";
import { ModelSelect } from "../components/ModelSelect";
import { PromptIdeas } from "../components/PromptIdeas";
import { StatusBadge } from "../components/StatusBadge";
import { TaskProgress } from "../components/TaskProgress";
import { SmartImage } from "../components/SmartImage";
import { RecentStrip } from "../components/RecentStrip";
import { MediaLightbox } from "../components/MediaLightbox";
import {
  Button,
  Chip,
  Hint,
  Label,
  Segmented,
  Switch,
  TextArea,
  TextInput,
} from "../components/ui";
import { cn } from "../lib/cn";

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());

export function VideoStudio({
  onOpenSettings,
  onNavigateGallery,
  handoff,
  onClearHandoff,
}: {
  onOpenSettings: () => void;
  onNavigateGallery: () => void;
  handoff: VideoHandoff | null;
  onClearHandoff: () => void;
}) {
  const {
    settings,
    updateSettings,
    addLibraryItem,
    notify,
    library,
    videoModels,
    getVideoModel,
  } = useApp();
  const generation = useGeneration(settings);
  const { download, openOriginal, downloadingUrl } = useMediaActions();

  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [size, setSize] = useState(
    () => getVideoModel(settings.videoModel).sizes[0]?.value ?? "",
  );
  const [resolution, setResolution] = useState<VideoResolution>(
    () =>
      (getVideoModel(settings.videoModel).resolutions?.[0] ??
        "1080P") as VideoResolution,
  );
  const [duration, setDuration] = useState(5);
  const [imageUrl, setImageUrl] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [lastItem, setLastItem] = useState<LibraryItem | null>(null);
  const [lightboxItem, setLightboxItem] = useState<LibraryItem | null>(null);

  const hasKey = Boolean(settings.apiKey.trim());
  const model = getVideoModel(settings.videoModel);
  const needsImage = model.kind === "i2v";
  const isV2 = model.protocol === "v2";
  // All-in-One 模型（wan3.0）：首帧图片可选，留空则纯文生视频。
  const acceptsImage = needsImage || model.allInOne === true;
  const usesImage = acceptsImage && Boolean(imageUrl.trim());
  const isBusy = generation.isBusy;
  const frameValid = needsImage
    ? isHttpUrl(imageUrl)
    : !acceptsImage || !imageUrl.trim() || isHttpUrl(imageUrl);
  const activeUrl = lastItem?.urls[0] ?? "";
  const activeModel = getVideoModel(lastItem?.model ?? settings.videoModel);
  const maxPrompt = model.maxPrompt ?? 1500;
  const promptExtendDisabled = model.supportsPromptExtend === false;
  const formatDuration = (value: number) =>
    value < 0 ? "智能时长" : `${value} 秒`;

  // 文生视频按「清晰度 + 比例」两级选择，避免铺开一整张尺寸表。
  const sizeTiers = [
    ...new Set(model.sizes.map((option) => option.hint).filter(Boolean) as string[]),
  ];
  const activeSize =
    model.sizes.find((option) => option.value === size) ?? model.sizes[0];
  const activeTier = activeSize?.hint ?? sizeTiers[0] ?? "480P";
  const tierSizes = model.sizes.filter((option) => option.hint === activeTier);

  const sizeLabel = needsImage
    ? resolution
    : isV2
      ? `${activeTier} ${activeSize?.label ?? ""}`.trim()
      : size;
  const currentSizeLabel = (lastItem?.size ?? sizeLabel).replace("*", " × ");
  const selectionLabel = sizeLabel.replace("*", " × ");

  const handleTierChange = (nextTier: string) => {
    const sameRatio = model.sizes.find(
      (option) => option.hint === nextTier && option.label === activeSize?.label,
    );
    const target = sameRatio ?? model.sizes.find((option) => option.hint === nextTier);
    if (target) setSize(target.value);
  };

  // 时长选项：-1 表示智能时长（模型自动推荐合适长度）。
  const durationOptions = (model.durations ?? [5]).map((value) => ({
    value: String(value),
    label: value < 0 ? "智能" : `${value} 秒`,
  }));
  const durationField = (
    <div>
      <Label>时长</Label>
      <Segmented<string>
        className="w-full [&>button]:flex-1"
        ariaLabel="时长"
        value={String(duration)}
        onChange={(value) => setDuration(Number(value))}
        options={durationOptions}
      />
    </div>
  );
  // wan2.5 及之后的模型默认生成有声视频。
  const audioByDefault =
    model.id.startsWith("wan2.5") ||
    model.id.startsWith("wan2.7") ||
    model.id.startsWith("wan3.0") ||
    model.id.startsWith("happyhorse");

  useEffect(() => {
    if (!handoff) return;
    setImageUrl(handoff.imageUrl);
    const current = getVideoModel(settings.videoModel);
    // wan3.0 等 All-in-One 模型无需切换，同一模型即可图生视频。
    const targetId =
      current.kind === "i2v" || current.allInOne
        ? settings.videoModel
        : current.id.startsWith("wan2.7")
          ? "wan2.7-i2v"
          : current.id.startsWith("happyhorse")
            ? "happyhorse-1.1-i2v"
            : current.id.startsWith("wan2.5")
              ? "wan2.5-i2v-preview"
              : current.id.startsWith("wanx2.1")
                ? "wanx2.1-i2v-turbo"
                : "wan2.2-i2v-plus";
    const target = getVideoModel(targetId);
    if (targetId !== settings.videoModel) {
      updateSettings({ videoModel: targetId });
    }
    setResolution(
      (target.resolutions?.[0] ?? "1080P") as VideoResolution,
    );
    setDuration(target.durations?.[0] ?? 5);
    setSize(clampVideoSize(target, size));
    setPrompt((previous) => (previous.trim() ? previous : (handoff.prompt ?? previous)));
    onClearHandoff();
    // The handoff is one-shot; clearing it above prevents a second run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoff]);

  const handleModelChange = (value: string) => {
    const next = getVideoModel(value);
    updateSettings({ videoModel: value });
    setSize(clampVideoSize(next, size));
    setResolution(clampVideoResolution(next, resolution));
    if (!next.durations?.includes(duration)) {
      setDuration(next.durations?.[0] ?? 5);
    }
  };

  // 在「设置」页切换默认模型或增删自定义模型后，保持尺寸、时长合法。
  useEffect(() => {
    const current = getVideoModel(settings.videoModel);
    setSize((previous) => clampVideoSize(current, previous));
    setResolution((previous) => clampVideoResolution(current, previous));
    const durations = current.durations ?? [5];
    setDuration((previous) =>
      durations.includes(previous) ? previous : durations[0],
    );
  }, [settings.videoModel, getVideoModel]);

  const handleGenerate = async () => {
    if (!hasKey) {
      onOpenSettings();
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed || isBusy) return;
    if (needsImage && !frameValid) return;

    const usedModel = settings.videoModel;
    setLastItem(null);

    const created = await generation.submit(() =>
      createVideoTask(settings, {
        prompt: trimmed,
        negativePrompt: negative.trim() || undefined,
        model: usedModel,
        protocol: model.protocol,
        size: !needsImage && !isV2 ? size : undefined,
        resolution: needsImage
          ? resolution
          : isV2
            ? activeTier
            : undefined,
        ratio: isV2 && !usesImage ? activeSize?.token : undefined,
        duration,
        imageUrl: usesImage ? imageUrl.trim() : undefined,
        promptExtend: settings.promptExtend,
        watermark: settings.watermark,
        supportsPromptExtend: model.supportsPromptExtend !== false,
        supportsNegativePrompt: model.supportsNegativePrompt !== false,
      }),
    );

    if (!created) return;

    const urls = created.videoUrl
      ? [created.videoUrl, ...created.urls.filter((url) => url !== created.videoUrl)]
      : created.urls;

    const item: LibraryItem = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      kind: "video",
      urls,
      prompt: trimmed,
      negativePrompt: negative.trim() || undefined,
      model: usedModel,
      size: needsImage
        ? resolution
        : isV2
          ? `${activeTier} ${activeSize?.label ?? ""}`.trim()
          : size,
      duration,
      createdAt: Date.now(),
      taskId: created.taskId,
      inputImageUrl: usesImage ? imageUrl.trim() : undefined,
    };
    setLastItem(item);
    addLibraryItem(item);
    notify("视频已生成，并存入作品库", { severity: "success" });
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(360px,430px)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-4">
          {!hasKey && <SetupBanner onOpenSettings={onOpenSettings} />}

          <SectionCard
            title="镜头描述"
            subtitle="描述主体、动作与运镜方式"
            icon={<PenLine className="h-[18px] w-[18px]" />}
            bodyClassName="p-5"
            dense
          >
            <TextArea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              maxLength={maxPrompt}
              className="min-h-[76px]"
              placeholder="例如：航拍视角掠过雪山之巅，云海翻涌，金色晨光洒落，镜头缓慢推进，电影级质感…"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void handleGenerate();
                }
              }}
            />
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-3">
              <span>⌘ + Enter 快速生成</span>
              <span className={prompt.length > maxPrompt * 0.93 ? "text-warning" : ""}>
                {prompt.length} / {maxPrompt}
              </span>
            </div>

            <div className="mt-2">
              <PromptIdeas ideas={VIDEO_PROMPT_IDEAS} onPick={setPrompt} />
            </div>

            {acceptsImage && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <ImagePlus className="h-3.5 w-3.5" />
                    首帧图片
                    {model.allInOne && (
                      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium text-ink-3">
                        可选
                      </span>
                    )}
                  </span>
                  {imageUrl && (
                    <span
                      className={cn(
                        "text-[9.5px] font-medium",
                        frameValid ? "text-success" : "text-danger",
                      )}
                    >
                      {frameValid ? "格式有效" : "请输入 http(s) 图片地址"}
                    </span>
                  )}
                </div>
                <div className="flex items-stretch gap-2">
                  <TextInput
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    leading={<Link2 className="h-4 w-4" />}
                    placeholder="https://your-oss-bucket/frame.jpg"
                    containerClassName="flex-1"
                    aria-label="首帧图片地址"
                  />
                  {imageUrl && frameValid && (
                    <div className="h-11 w-[72px] shrink-0 overflow-hidden rounded-xl border border-line bg-surface-1">
                      <SmartImage
                        src={imageUrl}
                        alt="首帧预览"
                        className="h-full w-full"
                      />
                    </div>
                  )}
                </div>
                <Hint className="mt-1.5">
                  {model.allInOne
                    ? "留空则按纯文生视频生成；提供首帧后会以图生视频模式运行。"
                    : "需要可公网访问的图片地址。也可以从图片创作结果点击「用作视频首帧」自动带入。"}
                </Hint>
              </div>
            )}

            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="mt-3 flex w-full cursor-pointer items-center justify-between rounded-xl border border-line bg-surface-1/40 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-1/70"
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
                  placeholder="不希望出现的内容，例如：画面抖动、变形、低质量…"
                />
                {model.supportsNegativePrompt === false && (
                  <Hint className="mt-1.5">
                    当前模型暂不支持负向提示词，填写的内容不会提交。
                  </Hint>
                )}
              </div>
            )}

            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                loading={isBusy}
                disabled={hasKey ? !prompt.trim() || !frameValid : false}
                onClick={() => {
                  void handleGenerate();
                }}
                icon={<Play className="h-[18px] w-[18px]" fill="currentColor" />}
              >
                {!hasKey
                  ? "配置 API Key 后开始"
                  : isBusy
                    ? "正在生成…"
                    : needsImage && !imageUrl.trim()
                      ? "填写首帧后开始"
                      : "生成视频"}
              </Button>
              <p className="mt-2 text-center text-[10px] text-ink-3">
                {model.label} · {selectionLabel} · {formatDuration(duration)} · 约 2–10 分钟
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="视频设置"
            icon={<SlidersHorizontal className="h-[18px] w-[18px]" />}
            bodyClassName="p-5"
            dense
          >
            <Label>模型</Label>
            <ModelSelect
              models={videoModels}
              value={settings.videoModel}
              onChange={handleModelChange}
              icon={<Film className="h-[17px] w-[17px]" />}
              label="视频生成模型"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <Label
                  trailing={
                    model.kind === "i2v" ? (
                      <Chip tone="primary" className="px-1.5 py-0.5 text-[9px]">
                        图生视频
                      </Chip>
                    ) : model.allInOne ? (
                      <Chip tone="primary" className="px-1.5 py-0.5 text-[9px]">
                        文/图生视频
                      </Chip>
                    ) : (
                      <Chip className="px-1.5 py-0.5 text-[9px]">文生视频</Chip>
                    )
                  }
                >
                  清晰度
                </Label>
                {model.kind === "i2v" ? (
                  <Segmented<VideoResolution>
                    className="w-full [&>button]:flex-1"
                    ariaLabel="清晰度"
                    value={resolution}
                    onChange={setResolution}
                    options={(model.resolutions ?? ["720P"]).map((value) => ({
                      value: value as VideoResolution,
                      label: value,
                    }))}
                  />
                ) : (
                  <Segmented<string>
                    className="w-full [&>button]:flex-1"
                    ariaLabel="清晰度"
                    value={activeTier}
                    onChange={handleTierChange}
                    options={sizeTiers.map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                )}
              </div>
              {durationOptions.length <= 4 && durationField}
            </div>
            {durationOptions.length > 4 && (
              <div className="mt-3">{durationField}</div>
            )}

            {model.kind === "i2v" ? (
              <Hint className="mt-3">
                画面比例跟随首帧图片，模型会自动匹配最接近的分辨率。
              </Hint>
            ) : (
              <>
                <div className="mt-2">
                  <Label>画面比例</Label>
                  <Segmented<string>
                    className="w-full [&>button]:flex-1"
                    ariaLabel="画面比例"
                    value={size}
                    onChange={setSize}
                    options={tierSizes.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                  />
                </div>
                {model.allInOne && usesImage && (
                  <Hint className="mt-2">
                    已提供首帧图片：画面比例将自动匹配首帧，比例选项不会提交。
                  </Hint>
                )}
              </>
            )}

            {audioByDefault && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-[10.5px] leading-relaxed text-ink-2">
                  该模型默认生成有声视频，会根据画面自动配音台词与音效，也可能产生额外费用。
                </p>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-1/40 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                提示词智能优化
                {promptExtendDisabled && (
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium text-ink-3">
                    当前模型不支持
                  </span>
                )}
              </div>
              <Switch
                checked={settings.promptExtend}
                onChange={(checked) => updateSettings({ promptExtend: checked })}
                label="提示词智能优化"
                disabled={promptExtendDisabled}
              />
            </div>

          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="结果预览"
            subtitle={
              lastItem
                ? `${activeModel.label} · ${currentSizeLabel} · ${formatDuration(lastItem.duration ?? duration)}`
                : "生成的视频会显示在这里"
            }
            icon={<Video className="h-[18px] w-[18px]" />}
            action={<StatusBadge phase={generation.phase} />}
            bodyClassName="p-4 sm:p-5"
          >
            {generation.phase === "idle" && (
              <div className="relative flex min-h-[440px] flex-col items-center justify-center overflow-hidden rounded-[22px] border border-line bg-stage stage-dots px-6 py-12 text-center sm:min-h-[520px]">
                <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 animate-float rounded-full bg-primary/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-28 -right-12 h-72 w-72 animate-float-delayed rounded-full bg-secondary/12 blur-3xl" />
                <div className="relative flex flex-col items-center">
                  <div className="relative">
                    <span className="absolute -inset-4 rounded-[34px] border border-primary/15" />
                    <div className="grid h-20 w-20 place-items-center rounded-[26px] bg-brand-gradient text-on-primary shadow-glow">
                      <Film className="h-8 w-8" strokeWidth={1.8} />
                    </div>
                    <span className="absolute -bottom-2 -right-3 grid h-8 w-8 place-items-center rounded-xl border border-line bg-card text-primary shadow-md">
                      <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
                    </span>
                  </div>
                  <h3 className="mt-6 text-[19px] font-bold tracking-tight text-ink">
                    让画面动起来
                  </h3>
                  <p className="mt-1.5 max-w-[330px] text-[11.5px] leading-relaxed text-ink-2">
                    用一句话描述镜头，或提供一张首帧图片，Wan 会把静态的想象变成流动的短片。
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                    <Chip tone="primary" icon={<Sparkles className="h-3 w-3" />}>
                      Wan 视频生成
                    </Chip>
                    <Chip>{needsImage ? "图生视频" : "文生视频"}</Chip>
                    <Chip>{formatDuration(duration)}</Chip>
                    <Chip>约 2–10 分钟</Chip>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrompt(VIDEO_PROMPT_IDEAS[0])}
                    className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card/70 px-3.5 py-2 text-[11px] font-semibold text-ink-2 transition-all hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
                  >
                    试试一个镜头
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
                  kind="video"
                  onCancel={generation.cancel}
                />
              </div>
            )}

            {generation.phase === "failed" && (
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[22px] border border-danger/20 bg-danger/4 px-6 py-12 text-center sm:min-h-[520px]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
                  <CircleAlert className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-ink">视频生成失败</h3>
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
                  视频任务可能仍在云端渲染，稍后可在百炼控制台查看，或重新发起一次。
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

            {generation.phase === "succeeded" && lastItem && activeUrl && (
              <div className="space-y-3">
                <div className="relative flex min-h-[300px] items-center justify-center overflow-hidden rounded-[22px] border border-line bg-[#08080c] p-2 sm:min-h-[380px]">
                  <video
                    key={activeUrl}
                    src={activeUrl}
                    controls
                    playsInline
                    className="max-h-[520px] w-full rounded-[16px] bg-black object-contain"
                  />
                  <span className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-semibold text-white/85 backdrop-blur-md">
                    <Film className="h-3 w-3" />
                    {formatDuration(lastItem.duration ?? duration)} · {currentSizeLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="tonal"
                      loading={downloadingUrl === activeUrl}
                      onClick={() => {
                        void download(activeUrl, "video");
                      }}
                      icon={<Download className="h-3.5 w-3.5" />}
                    >
                      下载视频
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void openOriginal(activeUrl);
                      }}
                      icon={<ExternalLink className="h-3.5 w-3.5" />}
                    >
                      打开链接
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setLightboxItem(lastItem)}
                      icon={<Timer className="h-3.5 w-3.5" />}
                    >
                      查看详情
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
                    再生成一版
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-ink-3">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {activeModel.label}
                  </span>
                  <span>·</span>
                  <span>{currentSizeLabel}</span>
                  <span>·</span>
                  <span>{formatDuration(lastItem.duration ?? duration)}</span>
                  <span>·</span>
                  <span>耗时 {generation.elapsed} 秒</span>
                  <span>·</span>
                  <span>链接 24 小时内有效，请及时保存</span>
                </div>
              </div>
            )}
          </SectionCard>

          <RecentStrip
            items={library}
            kind="video"
            onOpen={setLightboxItem}
            onViewAll={onNavigateGallery}
          />
        </div>
      </div>

      <MediaLightbox
        item={lightboxItem}
        onClose={() => setLightboxItem(null)}
      />
    </>
  );
}