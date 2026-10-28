import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CircleAlert,
  CircleCheck,
  Eye,
  EyeOff,
  Film,
  Image as ImageIcon,
  Info,
  KeyRound,
  Link2,
  Monitor,
  Moon,
  Palette,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { useOpenExternal } from "../hooks/useMediaActions";
import { normalizeBaseUrl, testConnection } from "../lib/api";
import { ACCENTS } from "../lib/accents";
import { maskKey, cn } from "../lib/cn";
import type { ThemeMode } from "../types";
import { SectionCard } from "../components/SectionCard";
import { ModelSelect } from "../components/ModelSelect";
import { CustomModelManager } from "../components/CustomModelManager";
import {
  Button,
  Chip,
  Hint,
  IconButton,
  Label,
  Segmented,
  Switch,
  TextInput,
} from "../components/ui";

const REGIONS = [
  { label: "北京站", url: "https://dashscope.aliyuncs.com" },
  { label: "新加坡站", url: "https://dashscope-intl.aliyuncs.com" },
];

const CONSOLE_URL = "https://bailian.console.aliyun.com/?tab=model#/api-key";
const DOCS_URL = "https://help.aliyun.com/zh/model-studio/";

type TestState = {
  status: "idle" | "testing" | "success" | "error";
  message: string;
};

export function Settings({ onOpenGallery }: { onOpenGallery?: () => void }) {
  const {
    settings,
    updateSettings,
    notify,
    imageModels,
    videoModels,
    getImageModel,
    getVideoModel,
  } = useApp();
  const openExternal = useOpenExternal();

  const [baseUrl, setBaseUrl] = useState(settings.baseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [revealKey, setRevealKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle", message: "" });

  const hasKey = Boolean(settings.apiKey.trim());
  const dirty =
    normalizeBaseUrl(baseUrl) !== normalizeBaseUrl(settings.baseUrl) ||
    apiKey.trim() !== settings.apiKey.trim();

  const handleSaveTest = async () => {
    const nextBase = normalizeBaseUrl(baseUrl);
    const nextKey = apiKey.trim();
    setBaseUrl(nextBase);
    setApiKey(nextKey);
    updateSettings({ baseUrl: nextBase, apiKey: nextKey });
    setTest({ status: "testing", message: "正在向阿里云百炼发送鉴权请求…" });

    const result = await testConnection({
      ...settings,
      baseUrl: nextBase,
      apiKey: nextKey,
    });
    setTest({
      status: result.ok ? "success" : "error",
      message: result.message,
    });
    notify(result.message, {
      severity: result.ok ? "success" : "error",
      duration: result.ok ? 3600 : 6000,
    });
  };

  const handleClearKey = () => {
    setApiKey("");
    updateSettings({ apiKey: "" });
    setTest({ status: "idle", message: "" });
    notify("已清除本机保存的 API Key", { severity: "info", duration: 2600 });
  };

  const testIcon =
    test.status === "testing" ? (
      <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
    ) : test.status === "success" ? (
      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
    ) : (
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
    );

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <div className="space-y-4">
        <SectionCard
          title="API 连接"
          subtitle="配置阿里云百炼 DashScope 服务"
          icon={<KeyRound className="h-[18px] w-[18px]" />}
          action={
            dirty ? (
              <Chip tone="warning" className="px-2 py-1">
                有未保存的修改
              </Chip>
            ) : undefined
          }
        >
          <Label>Base URL</Label>
          <TextInput
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              setTest({ status: "idle", message: "" });
            }}
            leading={<Link2 className="h-4 w-4" />}
            placeholder="https://dashscope.aliyuncs.com"
            spellCheck={false}
            autoComplete="off"
            aria-label="百炼 Base URL"
          />
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-ink-3">快捷选择</span>
            {REGIONS.map((region) => {
              const active = normalizeBaseUrl(baseUrl) === region.url;
              return (
                <button
                  key={region.url}
                  type="button"
                  onClick={() => {
                    setBaseUrl(region.url);
                    setTest({ status: "idle", message: "" });
                  }}
                  className={cn(
                    "cursor-pointer rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-line bg-surface-1/50 text-ink-2 hover:border-line-strong hover:text-ink",
                  )}
                >
                  {region.label}
                </button>
              );
            })}
            <span className="text-[10px] text-ink-3">
              · 密钥地域需与站点一致
            </span>
          </div>

          <div className="mt-5">
            <Label
              trailing={
                <button
                  type="button"
                  onClick={() => {
                    void openExternal(CONSOLE_URL);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  获取 API Key
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              }
            >
              API Key
            </Label>
            <TextInput
              type={revealKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setTest({ status: "idle", message: "" });
              }}
              leading={<KeyRound className="h-4 w-4" />}
              trailing={
                <IconButton
                  label={revealKey ? "隐藏密钥" : "显示密钥"}
                  size="sm"
                  onClick={() => setRevealKey((value) => !value)}
                >
                  {revealKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </IconButton>
              }
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
              spellCheck={false}
              autoComplete="off"
              name="dashscope-api-key"
              aria-label="百炼 API Key"
            />
            <Hint className="mt-1.5">
              密钥通常以 sk- 开头，可在百炼控制台的「API-KEY 管理」中创建。
            </Hint>
          </div>

          {test.status !== "idle" && (
            <div
              className={cn(
                "mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[11px] leading-relaxed",
                test.status === "success" &&
                  "border-success/25 bg-success/8 text-success",
                test.status === "error" && "border-danger/25 bg-danger/8 text-danger",
                test.status === "testing" &&
                  "border-primary/25 bg-primary/8 text-primary",
              )}
            >
              {testIcon}
              <span className="min-w-0 flex-1">{test.message}</span>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                void handleSaveTest();
              }}
              loading={test.status === "testing"}
              icon={<PlugZap className="h-4 w-4" />}
            >
              保存并测试连接
            </Button>
            <Button
              variant="outline"
              onClick={handleClearKey}
              disabled={!apiKey && !settings.apiKey}
              icon={<Trash2 className="h-3.5 w-3.5" />}
            >
              清除密钥
            </Button>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-surface-1/40 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p className="text-[10.5px] leading-relaxed text-ink-2">
              API Key 仅保存在本机 WebView 存储中。所有请求由内置 Rust
              后端直接发送至阿里云百炼，不经过任何第三方服务器，也不会写入日志。
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="生成偏好"
          subtitle="设置默认模型与生成选项"
          icon={<SlidersHorizontal className="h-[18px] w-[18px]" />}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>默认图片模型</Label>
              <ModelSelect
                models={imageModels}
                value={settings.imageModel}
                onChange={(value) => updateSettings({ imageModel: value })}
                icon={<ImageIcon className="h-[17px] w-[17px]" />}
                label="默认图片模型"
              />
            </div>
            <div>
              <Label>默认视频模型</Label>
              <ModelSelect
                models={videoModels}
                value={settings.videoModel}
                onChange={(value) => updateSettings({ videoModel: value })}
                icon={<Film className="h-[17px] w-[17px]" />}
                label="默认视频模型"
              />
            </div>
          </div>

          <div className="my-5 h-px w-full bg-line" />

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-ink">提示词智能优化</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-3">
                  生成时自动扩写提示词，补全光线、构图与镜头细节
                </p>
              </div>
              <Switch
                checked={settings.promptExtend}
                onChange={(checked) => updateSettings({ promptExtend: checked })}
                label="提示词智能优化"
              />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-ink">生成水印</p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-3">
                  在结果中嵌入 AI 生成标识（默认关闭）
                </p>
              </div>
              <Switch
                checked={settings.watermark}
                onChange={(checked) => updateSettings({ watermark: checked })}
                label="生成水印"
              />
            </div>
          </div>
        </SectionCard>

        <CustomModelManager />

        <SectionCard
          title="外观"
          subtitle="主题模式与强调色"
          icon={<Palette className="h-[18px] w-[18px]" />}
        >
          <Label>主题模式</Label>
          <Segmented<ThemeMode>
            ariaLabel="主题模式"
            value={settings.themeMode}
            onChange={(value) => updateSettings({ themeMode: value })}
            options={[
              {
                value: "system",
                label: "跟随系统",
                icon: <Monitor className="h-3.5 w-3.5" />,
              },
              { value: "light", label: "浅色", icon: <Sun className="h-3.5 w-3.5" /> },
              { value: "dark", label: "深色", icon: <Moon className="h-3.5 w-3.5" /> },
            ]}
          />

          <div className="mt-5">
            <Label>强调色</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACCENTS.map((accent) => {
                const active = settings.accent === accent.id;
                return (
                  <button
                    key={accent.id}
                    type="button"
                    onClick={() => updateSettings({ accent: accent.id })}
                    aria-pressed={active}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-2xl border p-2.5 text-left transition-all duration-200",
                      active
                        ? "border-primary/45 bg-primary/8 shadow-sm"
                        : "border-line bg-surface-1/40 hover:border-line-strong hover:bg-surface-1",
                    )}
                  >
                    <span
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-sm"
                      style={{ background: accent.swatch }}
                    >
                      {active && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <span
                      className={cn(
                        "text-[11.5px] font-semibold",
                        active ? "text-primary" : "text-ink-2",
                      )}
                    >
                      {accent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-4 text-[10.5px] leading-relaxed text-ink-3">
            强调色会同步应用到按钮、进度环、导航与结果卡片，所有设置即时生效并自动保存。
          </p>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <div className="rounded-[26px] border border-line bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[14px] font-bold text-ink">连接概览</h2>
            <Chip tone={hasKey ? "success" : "warning"} className="px-2 py-1">
              {hasKey ? "已配置" : "未配置"}
            </Chip>
          </div>

          <div className="mt-4 space-y-3">
            <OverviewRow
              label="服务地址"
              value={normalizeBaseUrl(settings.baseUrl).replace("https://", "")}
              mono
            />
            <OverviewRow
              label="API Key"
              value={hasKey ? maskKey(settings.apiKey) : "—"}
              mono
            />
            <OverviewRow
              label="图片模型"
              value={getImageModel(settings.imageModel).label}
            />
            <OverviewRow
              label="视频模型"
              value={getVideoModel(settings.videoModel).label}
            />
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-1 px-3 py-2.5">
            <span
              className={cn(
                "mt-1 h-2 w-2 shrink-0 rounded-full",
                hasKey ? "animate-pulse-dot bg-success" : "bg-warning",
              )}
            />
            <p className="text-[10.5px] leading-relaxed text-ink-2">
              {hasKey
                ? "请求将通过 Rust 后端直连百炼。若更换站点，请同步更新 API Key 归属地域。"
                : "填入密钥后即可开始创作。测试连接不会创建任何生成任务。"}
            </p>
          </div>

          {onOpenGallery && (
            <Button
              fullWidth
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={onOpenGallery}
              icon={<Sparkles className="h-3.5 w-3.5" />}
            >
              查看我的作品
            </Button>
          )}
        </div>

        <SectionCard
          title="快速开始"
          subtitle="三步连接百炼"
          icon={<Sparkles className="h-[18px] w-[18px]" />}
          bodyClassName="p-5"
        >
          <ol className="space-y-3.5">
            {[
              {
                title: "创建 API Key",
                desc: "登录百炼控制台，在 API-KEY 管理中创建密钥。",
              },
              {
                title: "粘贴并测试",
                desc: "选择正确地域，粘贴密钥后点击「保存并测试连接」。",
              },
              {
                title: "开始创作",
                desc: "选择模型，输入提示词即可生成图片或视频。",
              },
            ].map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/12 text-[10px] font-bold text-primary">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-3">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Button
            fullWidth
            variant="tonal"
            size="sm"
            className="mt-4"
            onClick={() => {
              void openExternal(CONSOLE_URL);
            }}
            icon={<KeyRound className="h-3.5 w-3.5" />}
            trailing={<ArrowUpRight className="h-3 w-3" />}
          >
            前往控制台获取密钥
          </Button>
        </SectionCard>

        <SectionCard
          title="关于"
          subtitle="Bailian Studio"
          icon={<Info className="h-[18px] w-[18px]" />}
          bodyClassName="p-5"
        >
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-on-primary shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">百炼创作工坊</p>
              <p className="text-[10px] text-ink-3">Bailian Studio · v0.1.0</p>
            </div>
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink-2">
            基于 Tauri 2 的桌面端 AI 创作工作台，接入阿里云百炼文生图、文生视频与图生视频模型。
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Tauri 2", "React 19", "Tailwind CSS 4", "Rust"].map((tech) => (
              <Chip key={tech} className="px-1.5 py-0.5 text-[9px]">
                {tech}
              </Chip>
            ))}
          </div>

          <div className="mt-4 space-y-1">
            {[
              { label: "百炼模型文档", url: DOCS_URL, icon: BookOpen },
              {
                label: "模型列表与计费",
                url: "https://help.aliyun.com/zh/model-studio/models",
                icon: Info,
              },
            ].map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => {
                    void openExternal(link.url);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-[11px] font-medium text-ink-2 transition-colors hover:bg-surface-1 hover:text-ink"
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-ink-3" />
                    {link.label}
                  </span>
                  <ArrowUpRight className="h-3 w-3 text-ink-3" />
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function OverviewRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-[10px] text-ink-3">{label}</span>
      <span
        className={cn(
          "truncate text-right text-[10.5px] font-medium text-ink",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}