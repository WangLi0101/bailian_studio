import type {
  AccentId,
  CustomModel,
  LibraryItem,
  MediaKind,
  Settings,
  TaskMeta,
  ThemeMode,
} from "../types";
import {
  IMAGE_MODELS,
  VIDEO_MODELS,
  buildImageModels,
  buildVideoModels,
} from "./models";

export const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com";

const SETTINGS_KEY = "bailian-studio.settings.v1";
const LIBRARY_KEY = "bailian-studio.library.v1";
const MAX_LIBRARY_ITEMS = 80;
const MAX_CUSTOM_MODELS = 30;

export const defaultSettings: Settings = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: "",
  imageModel: "wan2.2-t2i-flash",
  videoModel: "wan3.0-video",
  customModels: [],
  promptExtend: true,
  watermark: false,
  themeMode: "system",
  accent: "violet",
};

const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];
const ACCENT_IDS: AccentId[] = ["violet", "ocean", "forest", "amber"];

/** 旧版本中部分模型 ID 与官方命名不一致，读取时自动迁移。 */
const MODEL_ALIASES: Record<string, string> = {
  "wan2.1-t2i-turbo": "wanx2.1-t2i-turbo",
  "wan2.1-t2i-plus": "wanx2.1-t2i-plus",
  "wan2.1-t2v-turbo": "wanx2.1-t2v-turbo",
  "wan2.1-i2v-turbo": "wanx2.1-i2v-turbo",
};

function normalizeModelId(
  value: string,
  fallback: string,
  available: Array<{ id: string }>,
): string {
  const migrated = MODEL_ALIASES[value] ?? value;
  const candidate = migrated.trim();
  return available.some((model) => model.id === candidate) ? candidate : fallback;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asStringList(value: unknown, limit = 16): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
  return list.length ? list : undefined;
}

function asDurationList(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((item): item is number => typeof item === "number")
    .filter((item) => Number.isFinite(item) && item > 0 && item <= 60)
    .slice(0, 8);
  return list.length ? list : undefined;
}

/** 读取并校验用户自定义模型，丢弃重复或结构不合法的条目。 */
function parseCustomModels(value: unknown): CustomModel[] {
  if (!Array.isArray(value)) return [];
  const builtInIds = new Set(
    [...IMAGE_MODELS, ...VIDEO_MODELS].map((model) => model.id),
  );
  const seen = new Set<string>();
  const result: CustomModel[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    if (!id || builtInIds.has(id) || seen.has(id)) continue;

    const category =
      record.category === "image" || record.category === "video"
        ? record.category
        : null;
    if (!category) continue;

    const label =
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim()
        : id;
    const maxPrompt =
      typeof record.maxPrompt === "number" && Number.isFinite(record.maxPrompt)
        ? Math.min(10000, Math.max(100, Math.round(record.maxPrompt)))
        : undefined;

    result.push({
      id,
      label,
      category,
      ...(category === "video"
        ? { kind: record.kind === "i2v" ? ("i2v" as const) : ("t2v" as const) }
        : {}),
      ...(category === "video" && record.protocol === "v2"
        ? { protocol: "v2" as const }
        : {}),
      ...(typeof record.desc === "string" && record.desc.trim()
        ? { desc: record.desc.trim() }
        : {}),
      ...(asStringList(record.sizes) ? { sizes: asStringList(record.sizes) } : {}),
      ...(asStringList(record.resolutions)
        ? { resolutions: asStringList(record.resolutions) }
        : {}),
      ...(asDurationList(record.durations)
        ? { durations: asDurationList(record.durations) }
        : {}),
      ...(maxPrompt ? { maxPrompt } : {}),
    });
    seen.add(id);
    if (result.length >= MAX_CUSTOM_MODELS) break;
  }

  return result;
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...defaultSettings };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const themeMode = THEME_MODES.includes(parsed.themeMode as ThemeMode)
      ? (parsed.themeMode as ThemeMode)
      : defaultSettings.themeMode;
    const accent = ACCENT_IDS.includes(parsed.accent as AccentId)
      ? (parsed.accent as AccentId)
      : defaultSettings.accent;
    const customModels = parseCustomModels(parsed.customModels);
    const imageModels = buildImageModels(customModels);
    const videoModels = buildVideoModels(customModels);
    return {
      baseUrl: asString(parsed.baseUrl, defaultSettings.baseUrl),
      apiKey: typeof parsed.apiKey === "string" ? parsed.apiKey : "",
      imageModel: normalizeModelId(
        asString(parsed.imageModel, defaultSettings.imageModel),
        defaultSettings.imageModel,
        imageModels,
      ),
      videoModel: normalizeModelId(
        asString(parsed.videoModel, defaultSettings.videoModel),
        defaultSettings.videoModel,
        videoModels,
      ),
      customModels,
      promptExtend:
        typeof parsed.promptExtend === "boolean" ? parsed.promptExtend : defaultSettings.promptExtend,
      watermark: typeof parsed.watermark === "boolean" ? parsed.watermark : defaultSettings.watermark,
      themeMode,
      accent,
    };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable; the app still works for the current session.
  }
}

export function loadLibrary(): LibraryItem[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is LibraryItem =>
        item &&
        typeof item.id === "string" &&
        (item.kind === "image" || item.kind === "video") &&
        Array.isArray(item.urls) &&
        item.urls.length > 0 &&
        typeof item.prompt === "string",
    );
  } catch {
    return [];
  }
}

export function saveLibrary(items: LibraryItem[]): void {
  let limit = Math.min(items.length, MAX_LIBRARY_ITEMS);
  while (limit >= 0) {
    try {
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(items.slice(0, limit)));
      return;
    } catch {
      limit -= 10;
    }
  }
}

export function clearPersistedLibrary(): void {
  try {
    localStorage.removeItem(LIBRARY_KEY);
  } catch {
    // ignore
  }
}

const PENDING_TASKS_KEY = "bailian-studio.pending-tasks.v1";

/**
 * 刷新前仍在云端渲染的任务（图片 / 视频各一条通道）。恢复跟踪后继续轮询，
 * 完成时直接把结果写入作品库。
 */
export interface PendingTaskRecord {
  taskId: string;
  kind: MediaKind;
  startedAt: number;
  meta: TaskMeta;
}

function parsePendingTask(value: unknown): PendingTaskRecord | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Record<string, unknown>;
  const taskId = typeof parsed.taskId === "string" ? parsed.taskId.trim() : "";
  const kind =
    parsed.kind === "image" || parsed.kind === "video" ? parsed.kind : null;
  const startedAt =
    typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt)
      ? parsed.startedAt
      : null;
  const metaSource =
    parsed.meta && typeof parsed.meta === "object"
      ? (parsed.meta as Record<string, unknown>)
      : null;
  const prompt = typeof metaSource?.prompt === "string" ? metaSource.prompt : "";
  const model = typeof metaSource?.model === "string" ? metaSource.model : "";
  if (!taskId || !kind || startedAt === null || !prompt || !model) return null;

  const asOptionalString = (key: string): string | undefined => {
    const value = metaSource?.[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  const duration = metaSource?.duration;
  const negativePrompt = asOptionalString("negativePrompt");

  return {
    taskId,
    kind,
    startedAt,
    meta: {
      prompt,
      model,
      ...(negativePrompt ? { negativePrompt } : {}),
      ...(asOptionalString("size") ? { size: asOptionalString("size") } : {}),
      ...(typeof duration === "number" && Number.isFinite(duration) && duration > 0
        ? { duration }
        : {}),
      ...(asOptionalString("inputImageUrl")
        ? { inputImageUrl: asOptionalString("inputImageUrl") }
        : {}),
    },
  };
}

export function loadPendingTasks(): Partial<Record<MediaKind, PendingTaskRecord>> {
  try {
    const raw = localStorage.getItem(PENDING_TASKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<Record<MediaKind, PendingTaskRecord>> = {};
    for (const kind of ["image", "video"] as const) {
      const record = parsePendingTask(parsed[kind]);
      if (record && record.kind === kind) result[kind] = record;
    }
    return result;
  } catch {
    return {};
  }
}

export function savePendingTask(record: PendingTaskRecord): void {
  try {
    const current = loadPendingTasks();
    localStorage.setItem(
      PENDING_TASKS_KEY,
      JSON.stringify({ ...current, [record.kind]: record }),
    );
  } catch {
    // Storage may be unavailable; polling continues for the current session.
  }
}

export function clearPendingTask(kind: MediaKind): void {
  try {
    const current = loadPendingTasks();
    delete current[kind];
    localStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}