export type PageKey = "image" | "video" | "gallery" | "settings";

export type ThemeMode = "system" | "light" | "dark";

export type AccentId = "violet" | "ocean" | "forest" | "amber";

export type MediaKind = "image" | "video";

export interface Settings {
  baseUrl: string;
  apiKey: string;
  imageModel: string;
  videoModel: string;
  /** 用户在设置中自行添加的模型。 */
  customModels: CustomModel[];
  promptExtend: boolean;
  watermark: boolean;
  themeMode: ThemeMode;
  accent: AccentId;
}

export type CustomModelCategory = "image" | "video";

/**
 * 自定义模型只保存「调用所需的最少信息」，运行时再转换成 ModelOption。
 * 内置模型仍然来自 models.ts，二者在界面上合并展示。
 */
export type ModelKind = "t2i" | "i2i" | "t2v" | "i2v";

export interface CustomModel {
  /** 传给 DashScope 的模型 ID。 */
  id: string;
  label: string;
  category: CustomModelCategory;
  /** 文生图 / 图生图（图片模型）、文生视频 / 图生视频（视频模型）。 */
  kind?: ModelKind;
  /** 视频模型接口协议：旧版（size / img_url）或新版（resolution / ratio / media）。 */
  protocol?: "legacy" | "v2";
  desc?: string;
  /** 图片尺寸或文生视频像素尺寸，如 1024*1024。 */
  sizes?: string[];
  /** 图生视频的清晰度档位，如 720P。 */
  resolutions?: string[];
  durations?: number[];
  maxPrompt?: number;
}

export interface LibraryItem {
  id: string;
  kind: MediaKind;
  urls: string[];
  prompt: string;
  negativePrompt?: string;
  model: string;
  size?: string;
  duration?: number;
  createdAt: number;
  taskId?: string;
  inputImageUrl?: string;
}

export interface SizeOption {
  value: string;
  label: string;
  ratio: number;
  hint?: string;
  /** 提交给 API 的宽高比取值（新版协议模型使用，如 "16:9"、"adaptive"）。 */
  token?: string;
}

export interface ModelOption {
  id: string;
  label: string;
  desc: string;
  tag?: string;
  kind?: ModelKind;
  /** 图生图（图像编辑）模型支持的编辑功能，对应 input.function。 */
  editFunctions?: Array<{ value: string; label: string }>;
  /** 新版协议（wan2.7 / wan3.0 / HappyHorse）：resolution + ratio 与 media 传参。 */
  protocol?: "legacy" | "v2";
  /** All-in-One 模型（wan3.0）：文生/图生视频共用一个模型 ID，首帧图片可选。 */
  allInOne?: boolean;
  /** 是否支持 prompt_extend 参数（HappyHorse 不支持）。 */
  supportsPromptExtend?: boolean;
  /** 是否支持 negative_prompt 参数（wan3.0 / HappyHorse 不支持）。 */
  supportsNegativePrompt?: boolean;
  sizes: SizeOption[];
  /** 图生视频使用的分辨率档位（480P / 720P / 1080P）。 */
  resolutions?: string[];
  durations?: number[];
  /** 单次提示词最大字符数，按模型版本限制。 */
  maxPrompt?: number;
}

/**
 * 提交生成任务时的上下文信息。
 * 任务在后台完成时（页面切换或刷新后），依据这些信息构建作品库条目。
 */
export interface TaskMeta {
  prompt: string;
  negativePrompt?: string;
  model: string;
  size?: string;
  duration?: number;
  inputImageUrl?: string;
}

export interface TaskSnapshot {
  taskId?: string;
  taskStatus: string;
  rawStatus: string;
  urls: string[];
  videoUrl?: string;
  message?: string;
  code?: string;
  usage?: unknown;
}

export interface ImageTaskPayload {
  prompt: string;
  negativePrompt?: string;
  size: string;
  count: number;
  model: string;
  promptExtend: boolean;
  watermark: boolean;
  /** 图生图（图像编辑）：输入原图，支持公网地址或 Base64。 */
  imageUrl?: string;
  /** 图生图：编辑功能（input.function），如 description_edit。 */
  editFunction?: string;
}

export interface VideoTaskPayload {
  prompt: string;
  negativePrompt?: string;
  model: string;
  /** 文生视频的像素尺寸（旧版协议），如 1280*720。 */
  size?: string;
  /** 图生视频的分辨率档位（旧版协议）；新版协议下文生视频也传档位。 */
  resolution?: string;
  /** 新版协议的宽高比，如 16:9 / adaptive。 */
  ratio?: string;
  /** 接口协议：旧版（size / img_url）或新版（resolution / ratio / media）。 */
  protocol?: "legacy" | "v2";
  duration: number;
  imageUrl?: string;
  promptExtend: boolean;
  watermark: boolean;
  /** 新版协议下模型是否支持 prompt_extend。 */
  supportsPromptExtend?: boolean;
  /** 新版协议下模型是否支持 negative_prompt。 */
  supportsNegativePrompt?: boolean;
}

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export type ToastSeverity = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  severity?: ToastSeverity;
  action?: ToastAction;
  duration?: number;
}

export interface VideoHandoff {
  imageUrl: string;
  prompt?: string;
}

export interface ImageHandoff {
  imageUrl: string;
  prompt?: string;
}