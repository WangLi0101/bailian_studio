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
export interface CustomModel {
  /** 传给 DashScope 的模型 ID。 */
  id: string;
  label: string;
  category: CustomModelCategory;
  /** 仅视频模型有效：文生视频 / 图生视频。 */
  kind?: "t2v" | "i2v";
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
}

export interface ModelOption {
  id: string;
  label: string;
  desc: string;
  tag?: string;
  kind?: "t2v" | "i2v";
  sizes: SizeOption[];
  /** 图生视频使用的分辨率档位（480P / 720P / 1080P）。 */
  resolutions?: string[];
  durations?: number[];
  /** 单次提示词最大字符数，按模型版本限制。 */
  maxPrompt?: number;
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
}

export interface VideoTaskPayload {
  prompt: string;
  negativePrompt?: string;
  model: string;
  /** 文生视频的像素尺寸，如 1280*720。 */
  size?: string;
  /** 图生视频的分辨率档位，如 720P。 */
  resolution?: string;
  duration: number;
  imageUrl?: string;
  promptExtend: boolean;
  watermark: boolean;
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