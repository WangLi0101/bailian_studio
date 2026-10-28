import type { CustomModel, ModelOption, SizeOption } from "../types";

/* -------------------------------------------------------------------------- */
/*                                  图片尺寸                                   */
/* -------------------------------------------------------------------------- */

/** wan2.2 及以下：单边 512–1440 像素。 */
export const IMAGE_SIZES: SizeOption[] = [
  { value: "1024*1024", label: "1:1", ratio: 1, hint: "1024" },
  { value: "1280*720", label: "16:9", ratio: 16 / 9, hint: "横屏" },
  { value: "720*1280", label: "9:16", ratio: 9 / 16, hint: "竖屏" },
  { value: "1152*864", label: "4:3", ratio: 4 / 3, hint: "经典" },
  { value: "864*1152", label: "3:4", ratio: 3 / 4, hint: "人像" },
];

/** wan2.5：总像素 1280×1280 ～ 1440×1440，宽高比 1:4 ～ 4:1。 */
export const IMAGE_SIZES_25: SizeOption[] = [
  { value: "1280*1280", label: "1:1", ratio: 1, hint: "1280" },
  { value: "1696*960", label: "16:9", ratio: 16 / 9, hint: "横屏" },
  { value: "960*1696", label: "9:16", ratio: 9 / 16, hint: "竖屏" },
  { value: "1472*1104", label: "4:3", ratio: 4 / 3, hint: "经典" },
  { value: "1104*1472", label: "3:4", ratio: 3 / 4, hint: "人像" },
];

/* -------------------------------------------------------------------------- */
/*                                  视频尺寸                                   */
/* -------------------------------------------------------------------------- */

type RatioPreset = { label: string; ratio: number; width: number; height: number };

const RATIOS_3: RatioPreset[] = [
  { label: "16:9", ratio: 16 / 9, width: 16, height: 9 },
  { label: "9:16", ratio: 9 / 16, width: 9, height: 16 },
  { label: "1:1", ratio: 1, width: 1, height: 1 },
];

/** 各档位官方支持的分辨率（宽*高）。 */
const TIERS: Record<"480P" | "720P" | "1080P", Record<string, string>> = {
  "480P": { "16:9": "832*480", "9:16": "480*832", "1:1": "624*624" },
  "720P": {
    "16:9": "1280*720",
    "9:16": "720*1280",
    "1:1": "960*960",
    "4:3": "1088*832",
    "3:4": "832*1088",
  },
  "1080P": {
    "16:9": "1920*1080",
    "9:16": "1080*1920",
    "1:1": "1440*1440",
    "4:3": "1632*1248",
    "3:4": "1248*1632",
  },
};

function videoSizes(
  tiers: Array<"480P" | "720P" | "1080P">,
  ratios: RatioPreset[] = RATIOS_3,
): SizeOption[] {
  return tiers.flatMap((tier) =>
    ratios.map((preset) => ({
      value: TIERS[tier][preset.label],
      label: preset.label,
      ratio: preset.ratio,
      hint: tier,
    })),
  );
}

export type VideoResolution = "480P" | "720P" | "1080P";

/* -------------------------------------------------------------------------- */
/*                          新版协议（wan2.7+）尺寸                            */
/* -------------------------------------------------------------------------- */

interface V2Ratio {
  /** 界面显示文案。 */
  label: string;
  /** 提交给 API 的 ratio 取值。 */
  token: string;
  ratio: number;
}

const V2_RATIOS_COMMON: V2Ratio[] = [
  { label: "16:9", token: "16:9", ratio: 16 / 9 },
  { label: "9:16", token: "9:16", ratio: 9 / 16 },
  { label: "1:1", token: "1:1", ratio: 1 },
  { label: "4:3", token: "4:3", ratio: 4 / 3 },
  { label: "3:4", token: "3:4", ratio: 3 / 4 },
];

/** wan3.0 支持 adaptive（跟随输入素材）与 21:9。 */
const V2_RATIOS_WAN3: V2Ratio[] = [
  { label: "自适应", token: "adaptive", ratio: 16 / 9 },
  ...V2_RATIOS_COMMON,
];

/** 新版协议模型的两级尺寸选项：清晰度档位 + 宽高比。 */
function v2VideoSizes(
  tiers: Array<"480P" | "720P" | "1080P">,
  ratios: V2Ratio[] = V2_RATIOS_COMMON,
): SizeOption[] {
  return tiers.flatMap((tier) =>
    ratios.map((preset) => ({
      value: `${tier}:${preset.token}`,
      label: preset.label,
      token: preset.token,
      ratio: preset.ratio,
      hint: tier,
    })),
  );
}

/* -------------------------------------------------------------------------- */
/*                              图像编辑功能                                    */
/* -------------------------------------------------------------------------- */

/** wanx2.1-imageedit 的 input.function 取值（图生图核心能力）。 */
export const IMAGE_EDIT_FUNCTIONS: Array<{ value: string; label: string }> = [
  { value: "description_edit", label: "指令编辑" },
  { value: "stylization_all", label: "全图风格化" },
  { value: "stylization_scene", label: "背景风格化" },
  { value: "stylization_subject", label: "主体风格化" },
  { value: "image_outpainting", label: "描述扩图" },
  { value: "color_edit", label: "颜色编辑" },
  { value: "remove_watermark", label: "去水印" },
  { value: "expand_figure", label: "头像裁剪" },
  { value: "face_changing", label: "人脸替换" },
  { value: "makeup_transfer", label: "妆容迁移" },
];

export const IMAGE_EDIT_PROMPT_IDEAS = [
  "把画面改成黄昏时分，暖金色光线洒在建筑上，保留原有构图",
  "将背景替换为樱花盛开的街道，虚化景深，主体保持不变",
  "整体转为日系水彩插画风格，柔和高饱和色彩",
];

/* -------------------------------------------------------------------------- */
/*                                  模型清单                                   */
/* -------------------------------------------------------------------------- */

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: "wan2.2-t2i-flash",
    label: "Wan 2.2 Flash",
    desc: "极速出图，适合日常灵感探索与批量创作",
    tag: "推荐",
    sizes: IMAGE_SIZES,
    maxPrompt: 500,
  },
  {
    id: "wan2.2-t2i-plus",
    label: "Wan 2.2 Plus",
    desc: "画质更精细，适合海报与商业视觉",
    tag: "高清",
    sizes: IMAGE_SIZES,
    maxPrompt: 500,
  },
  {
    id: "wan2.5-t2i-preview",
    label: "Wan 2.5 Preview",
    desc: "新一代旗舰，更强的语义理解与文字渲染能力",
    tag: "新",
    sizes: IMAGE_SIZES_25,
    maxPrompt: 2000,
  },
  {
    id: "wanx2.1-t2i-turbo",
    label: "Wan 2.1 Turbo",
    desc: "成熟稳定的高性价比模型",
    sizes: IMAGE_SIZES,
    maxPrompt: 500,
  },
  {
    id: "wanx2.1-t2i-plus",
    label: "Wan 2.1 Plus",
    desc: "均衡画质与速度，细节丰富",
    sizes: IMAGE_SIZES,
    maxPrompt: 500,
  },
  {
    id: "wanx2.1-imageedit",
    label: "Wan 2.1 图像编辑",
    desc: "图生图 · 上传原图 + 文字指令，改背景、换风格、扩图、调色",
    tag: "图生图",
    kind: "i2i",
    editFunctions: IMAGE_EDIT_FUNCTIONS,
    sizes: [],
    maxPrompt: 500,
  },
];

export const VIDEO_MODELS: ModelOption[] = [
  {
    id: "wan3.0-video",
    label: "Wan 3.0 Video",
    desc: "全能旗舰 · 最长 30 秒有声视频，文生/图生视频一体，支持智能时长",
    tag: "推荐",
    kind: "t2v",
    protocol: "v2",
    allInOne: true,
    supportsNegativePrompt: false,
    sizes: v2VideoSizes(["480P", "720P", "1080P"], V2_RATIOS_WAN3),
    durations: [5, 10, 15, 20, 30, -1],
    maxPrompt: 10000,
  },
  {
    id: "wan3.0-video-prime",
    label: "Wan 3.0 Video Prime",
    desc: "Wan 3.0 优速版 · 同样支持 30 秒长视频，生成速度大幅提升",
    tag: "优速",
    kind: "t2v",
    protocol: "v2",
    allInOne: true,
    supportsNegativePrompt: false,
    sizes: v2VideoSizes(["480P", "720P", "1080P"], V2_RATIOS_WAN3),
    durations: [5, 10, 15, 20, 30, -1],
    maxPrompt: 10000,
  },
  {
    id: "wan2.7-t2v",
    label: "Wan 2.7 T2V",
    desc: "文生视频 · 音频同步与多镜头叙事，最长 15 秒",
    tag: "新",
    kind: "t2v",
    protocol: "v2",
    sizes: v2VideoSizes(["720P", "1080P"]),
    durations: [5, 10, 15],
    maxPrompt: 5000,
  },
  {
    id: "wan2.7-i2v",
    label: "Wan 2.7 I2V",
    desc: "图生视频 · 首帧/首尾帧/视频续写，最长 15 秒",
    tag: "新",
    kind: "i2v",
    protocol: "v2",
    sizes: [],
    resolutions: ["720P", "1080P"],
    durations: [5, 10, 15],
    maxPrompt: 5000,
  },
  {
    id: "happyhorse-1.1-t2v",
    label: "HappyHorse 1.1 T2V",
    desc: "文生视频 · 物理真实的画面与运镜，最长 15 秒有声视频",
    kind: "t2v",
    protocol: "v2",
    supportsPromptExtend: false,
    supportsNegativePrompt: false,
    sizes: v2VideoSizes(["480P", "720P", "1080P"]),
    durations: [5, 10, 15],
    maxPrompt: 2500,
  },
  {
    id: "happyhorse-1.1-i2v",
    label: "HappyHorse 1.1 I2V",
    desc: "图生视频 · 首帧驱动动态画面，最长 15 秒有声视频",
    kind: "i2v",
    protocol: "v2",
    supportsPromptExtend: false,
    supportsNegativePrompt: false,
    sizes: [],
    resolutions: ["480P", "720P", "1080P"],
    durations: [5, 10, 15],
    maxPrompt: 2500,
  },
  {
    id: "wan2.5-t2v-preview",
    label: "Wan 2.5 T2V Preview",
    desc: "上一代旗舰 · 支持 10 秒长镜头与自动配音",
    tag: "经典",
    kind: "t2v",
    sizes: videoSizes(["480P", "720P", "1080P"]),
    durations: [5, 10],
    maxPrompt: 1500,
  },
  {
    id: "wan2.5-i2v-preview",
    label: "Wan 2.5 I2V Preview",
    desc: "上一代图生视频 · 支持 10 秒与自动配音",
    kind: "i2v",
    sizes: [],
    resolutions: ["480P", "720P", "1080P"],
    durations: [5, 10],
    maxPrompt: 1500,
  },
  {
    id: "wan2.2-t2v-plus",
    label: "Wan 2.2 T2V Plus",
    desc: "文生视频 · 电影级运镜与画面稳定性（最长 5 秒）",
    kind: "t2v",
    sizes: videoSizes(["480P", "1080P"]),
    durations: [5],
    maxPrompt: 800,
  },
  {
    id: "wan2.2-i2v-plus",
    label: "Wan 2.2 I2V Plus",
    desc: "图生视频 · 让首帧画面自然动起来（最长 5 秒）",
    tag: "图生视频",
    kind: "i2v",
    sizes: [],
    resolutions: ["480P", "1080P"],
    durations: [5],
    maxPrompt: 800,
  },
  {
    id: "wanx2.1-t2v-turbo",
    label: "Wan 2.1 T2V Turbo",
    desc: "轻量快速，适合短视频草稿与创意验证",
    kind: "t2v",
    sizes: videoSizes(["480P", "720P"]),
    durations: [5],
    maxPrompt: 800,
  },
  {
    id: "wanx2.1-i2v-turbo",
    label: "Wan 2.1 I2V Turbo",
    desc: "快速图生视频，低成本动态预演",
    kind: "i2v",
    sizes: [],
    resolutions: ["480P", "720P"],
    durations: [3, 4, 5],
    maxPrompt: 800,
  },
];

export const IMAGE_PROMPT_IDEAS = [
  "雨夜霓虹下的未来城市，湿润路面倒映灯光，电影感，35mm 胶片质感",
  "一只戴着宇航头盔的柴犬，赛博朋克风格，霓虹灯光，细节丰富",
  "极简主义海报：一轮红日悬在沙丘之上，留白构图，暖色调",
];

export const VIDEO_PROMPT_IDEAS = [
  "航拍视角掠过雪山之巅，云海翻涌，金色晨光，缓慢推镜",
  "雨滴落在咖啡馆玻璃窗上，暖色灯光，窗外行人模糊，缓慢横移",
  "水墨风格的锦鲤在虚空中游动，粒子光效，镜头缓慢环绕",
];

/* -------------------------------------------------------------------------- */
/*                                自定义模型                                   */
/* -------------------------------------------------------------------------- */

const CUSTOM_MODEL_DESC = "自定义模型，请在百炼控制台确认已开通";

const RATIO_PRESETS: Array<{ label: string; ratio: number }> = [
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:3", ratio: 4 / 3 },
  { label: "3:4", ratio: 3 / 4 },
];

function greatestCommonDivisor(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

function ratioLabel(width: number, height: number): string {
  const ratio = width / height;
  const preset = RATIO_PRESETS.find(
    (item) => Math.abs(item.ratio - ratio) < 0.01,
  );
  if (preset) return preset.label;
  const divisor = greatestCommonDivisor(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function parseDimension(
  raw: string,
): { width: number; height: number; value: string } | null {
  const normalized = raw.trim().replace(/[×xX]/g, "*").replace(/\s+/g, "");
  const match = normalized.match(/^(\d{2,5})\*(\d{2,5})$/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height, value: `${width}*${height}` };
}

/** 自定义视频尺寸按最长边归入官方清晰度档位，供视频页做两级选择。 */
function videoTier(width: number, height: number): VideoResolution {
  const longest = Math.max(width, height);
  if (longest <= 900) return "480P";
  if (longest <= 1400) return "720P";
  return "1080P";
}

function parseCustomSizeOptions(
  values: string[] | undefined,
  tiered: boolean,
): SizeOption[] {
  const seen = new Set<string>();
  const result: SizeOption[] = [];
  for (const raw of values ?? []) {
    const parsed = parseDimension(raw);
    if (!parsed || seen.has(parsed.value)) continue;
    seen.add(parsed.value);
    result.push({
      value: parsed.value,
      label: ratioLabel(parsed.width, parsed.height),
      ratio: parsed.width / parsed.height,
      hint: tiered
        ? videoTier(parsed.width, parsed.height)
        : String(parsed.width),
    });
    if (result.length >= 16) break;
  }
  return result;
}

function parseCustomResolutions(values: string[] | undefined): VideoResolution[] {
  const allowed: VideoResolution[] = ["480P", "720P", "1080P"];
  const result: VideoResolution[] = [];
  for (const raw of values ?? []) {
    const value = raw.trim().toUpperCase() as VideoResolution;
    if (allowed.includes(value) && !result.includes(value)) result.push(value);
  }
  return result;
}

function toImageOption(model: CustomModel): ModelOption {
  const isEdit = model.kind === "i2i";
  const sizes = isEdit ? [] : parseCustomSizeOptions(model.sizes, false);
  return {
    id: model.id,
    label: model.label,
    desc: model.desc?.trim() || CUSTOM_MODEL_DESC,
    tag: "自定义",
    ...(isEdit ? { kind: "i2i" as const, editFunctions: IMAGE_EDIT_FUNCTIONS } : {}),
    sizes: isEdit ? [] : sizes.length ? sizes : IMAGE_SIZES,
    maxPrompt: model.maxPrompt ?? 1500,
  };
}

function toVideoOption(model: CustomModel): ModelOption {
  const kind = model.kind === "i2v" ? "i2v" : "t2v";
  const protocol = model.protocol === "v2" ? ("v2" as const) : ("legacy" as const);
  const durations = (model.durations ?? []).filter(
    (value) => Number.isFinite(value) && value > 0,
  );
  const sizes = parseCustomSizeOptions(model.sizes, true);
  const resolutions = parseCustomResolutions(model.resolutions);

  if (protocol === "v2") {
    // 新版协议：清晰度档位 + 常用宽高比，图生视频比例跟随首帧。
    const tiers: VideoResolution[] = resolutions.length
      ? resolutions
      : ["480P", "720P", "1080P"];
    return {
      id: model.id,
      label: model.label,
      desc: model.desc?.trim() || CUSTOM_MODEL_DESC,
      tag: "自定义",
      kind,
      protocol: "v2",
      sizes: kind === "i2v" ? [] : v2VideoSizes(tiers),
      ...(kind === "i2v" ? { resolutions: tiers } : {}),
      durations: durations.length ? durations : [5],
      maxPrompt: model.maxPrompt ?? 1500,
    };
  }

  return {
    id: model.id,
    label: model.label,
    desc: model.desc?.trim() || CUSTOM_MODEL_DESC,
    tag: "自定义",
    kind,
    sizes: kind === "i2v" ? [] : sizes.length ? sizes : videoSizes(["480P", "720P", "1080P"]),
    ...(kind === "i2v"
      ? { resolutions: resolutions.length ? resolutions : ["480P", "720P", "1080P"] }
      : {}),
    durations: durations.length ? durations : [5],
    maxPrompt: model.maxPrompt ?? 1500,
  };
}

/** 内置模型 + 用户自定义模型（图片）。 */
export function buildImageModels(custom: CustomModel[] = []): ModelOption[] {
  return [
    ...IMAGE_MODELS,
    ...custom.filter((model) => model.category === "image").map(toImageOption),
  ];
}

/** 内置模型 + 用户自定义模型（视频）。 */
export function buildVideoModels(custom: CustomModel[] = []): ModelOption[] {
  return [
    ...VIDEO_MODELS,
    ...custom.filter((model) => model.category === "video").map(toVideoOption),
  ];
}

export function findImageModel(models: ModelOption[], id: string): ModelOption {
  return models.find((model) => model.id === id) ?? IMAGE_MODELS[0];
}

export function findVideoModel(models: ModelOption[], id: string): ModelOption {
  return models.find((model) => model.id === id) ?? VIDEO_MODELS[0];
}

export function clampImageSize(model: ModelOption, size: string): string {
  if (model.sizes.length === 0) return "";
  return model.sizes.some((item) => item.value === size)
    ? size
    : model.sizes[0].value;
}

/** 图生图模型的编辑功能保底值：默认「指令编辑」。 */
export function clampImageEditFunction(model: ModelOption, fn: string): string {
  const list = model.editFunctions ?? IMAGE_EDIT_FUNCTIONS;
  return list.some((item) => item.value === fn) ? fn : list[0].value;
}

export function clampVideoSize(model: ModelOption, size: string): string {
  if (model.sizes.length === 0) return "";
  return model.sizes.some((item) => item.value === size)
    ? size
    : model.sizes[0].value;
}

export function clampVideoResolution(
  model: ModelOption,
  resolution: string,
): VideoResolution {
  const list = model.resolutions ?? [];
  return (list.includes(resolution) ? resolution : (list[0] ?? "720P")) as VideoResolution;
}