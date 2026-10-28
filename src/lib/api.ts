import { invoke } from "@tauri-apps/api/core";
import type {
  ImageTaskPayload,
  Settings,
  TaskSnapshot,
  VideoTaskPayload,
} from "../types";
import { DEFAULT_BASE_URL } from "./storage";

interface ApiResponse {
  status: number;
  body: unknown;
  text: string;
}

const IMAGE_ENDPOINT = "/api/v1/services/aigc/text2image/image-synthesis";
const IMAGE_EDIT_ENDPOINT = "/api/v1/services/aigc/image2image/image-synthesis";
const VIDEO_ENDPOINT = "/api/v1/services/aigc/video-generation/video-synthesis";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function normalizeBaseUrl(input: string): string {
  let value = input.trim();
  if (!value) return DEFAULT_BASE_URL;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  value = value.replace(/\/+$/, "");
  value = value.replace(/\/compatible-mode\/v1$/i, "");
  return value;
}

interface RequestOptions {
  headers?: Record<string, string>;
}

async function request(
  settings: Settings,
  path: string,
  method: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<ApiResponse> {
  const url = `${normalizeBaseUrl(settings.baseUrl)}${path}`;
  if (isTauri) {
    try {
      return await invoke<ApiResponse>("api_request", {
        url,
        apiKey: settings.apiKey,
        method,
        body: body ?? null,
        headers: options?.headers ?? null,
      });
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : String(error));
    }
  }

  // Browser fallback (Vite dev in a regular tab). DashScope may reject this with
  // CORS; the packaged app always uses the Rust proxy above.
  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
        ...(options?.headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { status: response.status, body: parsed, text };
  } catch (error) {
    throw new ApiError(
      `网络请求失败（浏览器预览模式可能受 CORS 限制，请使用桌面 App）：${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function responseError(response: ApiResponse): ApiError {
  const body = asRecord(response.body);
  const output = asRecord(body.output);
  const nested = asRecord(body.error);
  const code =
    (typeof body.code === "string" ? body.code : undefined) ??
    (typeof nested.code === "string" ? nested.code : undefined) ??
    (typeof output.code === "string" ? output.code : undefined);
  const message =
    (typeof body.message === "string" ? body.message : undefined) ??
    (typeof nested.message === "string" ? nested.message : undefined) ??
    (typeof output.message === "string" ? output.message : undefined) ??
    response.text.slice(0, 400) ??
    `HTTP ${response.status}`;
  return new ApiError(
    `${code ? `[${code}] ` : ""}${message || `HTTP ${response.status}`}`,
    response.status,
    code,
  );
}

function assertOk(response: ApiResponse): void {
  if (response.status >= 400) throw responseError(response);
  if (asRecord(response.body).error) throw responseError(response);
}

function extractTaskId(body: unknown): string {
  const parsed = asRecord(body);
  const output = asRecord(parsed.output);
  const taskId = output.task_id ?? parsed.task_id;
  if (typeof taskId !== "string" || !taskId) {
    throw new ApiError("任务已提交，但接口未返回 task_id，请检查 Base URL 是否正确。");
  }
  return taskId;
}

export async function createImageTask(
  settings: Settings,
  payload: ImageTaskPayload,
): Promise<string> {
  const isEdit = Boolean(payload.imageUrl);

  // 图生图（图像编辑）：原图 + 编辑指令，走 image2image 接口。
  // 该接口不支持 negative_prompt，输出比例跟随原图。
  const body = isEdit
    ? {
        model: payload.model,
        input: {
          function: payload.editFunction || "description_edit",
          prompt: payload.prompt,
          base_image_url: payload.imageUrl,
        },
        parameters: {
          n: payload.count,
          watermark: payload.watermark,
          prompt_extend: payload.promptExtend,
        },
      }
    : {
        model: payload.model,
        input: {
          prompt: payload.prompt,
          ...(payload.negativePrompt ? { negative_prompt: payload.negativePrompt } : {}),
        },
        parameters: {
          size: payload.size,
          n: payload.count,
          prompt_extend: payload.promptExtend,
          watermark: payload.watermark,
        },
      };

  const response = await request(
    settings,
    isEdit ? IMAGE_EDIT_ENDPOINT : IMAGE_ENDPOINT,
    "POST",
    body,
    {
      headers: { "X-DashScope-Async": "enable" },
    },
  );
  assertOk(response);
  return extractTaskId(response.body);
}

export async function createVideoTask(
  settings: Settings,
  payload: VideoTaskPayload,
): Promise<string> {
  const isV2 = payload.protocol === "v2";
  const input: Record<string, unknown> = { prompt: payload.prompt };
  const parameters: Record<string, unknown> = { duration: payload.duration };

  if (isV2) {
    // 新版协议（wan2.7 / wan3.0 / HappyHorse）：
    // resolution + ratio 定义输出规格，图生视频通过 input.media 传首帧。
    if (payload.resolution) parameters.resolution = payload.resolution;
    if (payload.ratio) parameters.ratio = payload.ratio;
    if (payload.supportsPromptExtend !== false) {
      parameters.prompt_extend = payload.promptExtend;
    }
    parameters.watermark = payload.watermark;
    if (payload.negativePrompt && payload.supportsNegativePrompt !== false) {
      input.negative_prompt = payload.negativePrompt;
    }
    if (payload.imageUrl) {
      input.media = [{ type: "first_frame", url: payload.imageUrl }];
    }
  } else {
    // 旧版协议（wan2.5 及更早）：size / resolution 档位 + img_url 首帧。
    if (payload.negativePrompt) input.negative_prompt = payload.negativePrompt;
    if (payload.imageUrl) input.img_url = payload.imageUrl;
    parameters.prompt_extend = payload.promptExtend;
    parameters.watermark = payload.watermark;
    if (payload.resolution) {
      parameters.resolution = payload.resolution;
    } else if (payload.size) {
      parameters.size = payload.size;
    }
  }

  const body = { model: payload.model, input, parameters };
  const response = await request(settings, VIDEO_ENDPOINT, "POST", body, {
    headers: { "X-DashScope-Async": "enable" },
  });
  assertOk(response);
  return extractTaskId(response.body);
}

export async function fetchTask(settings: Settings, taskId: string): Promise<TaskSnapshot> {
  const response = await request(
    settings,
    `/api/v1/tasks/${encodeURIComponent(taskId)}`,
    "GET",
  );
  assertOk(response);

  const parsed = asRecord(response.body);
  const output = asRecord(parsed.output);
  const usage = parsed.usage;
  const rawStatus = String(output.task_status ?? parsed.task_status ?? "UNKNOWN").toUpperCase();

  const results = Array.isArray(output.results) ? output.results : [];
  const urls: string[] = [];
  for (const entry of results) {
    const record = asRecord(entry);
    for (const key of ["url", "video_url", "image_url"]) {
      const value = record[key];
      if (typeof value === "string" && value && !urls.includes(value)) urls.push(value);
    }
  }

  const directVideo = output.video_url;
  const videoUrl =
    typeof directVideo === "string" && directVideo
      ? directVideo
      : urls.find((url) => /\.(mp4|mov|webm)(\?|$)/i.test(url));

  const code =
    (typeof parsed.code === "string" ? parsed.code : undefined) ??
    (typeof output.code === "string" ? output.code : undefined);
  const message =
    (typeof output.message === "string" ? output.message : undefined) ??
    (typeof parsed.message === "string" ? parsed.message : undefined);

  const returnedTaskId = output.task_id ?? parsed.task_id;
  return {
    taskId: typeof returnedTaskId === "string" ? returnedTaskId : taskId,
    taskStatus: rawStatus,
    rawStatus,
    urls,
    videoUrl,
    message,
    code,
    usage,
  };
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
}

export async function testConnection(settings: Settings): Promise<ConnectionResult> {
  if (!settings.apiKey.trim()) {
    return { ok: false, message: "请先填写 API Key" };
  }
  if (!/^https?:\/\//i.test(normalizeBaseUrl(settings.baseUrl))) {
    return { ok: false, message: "Base URL 格式不正确" };
  }
  try {
    const response = await request(
      settings,
      "/api/v1/tasks/connection-check",
      "GET",
    );
    if (response.status === 401) {
      return { ok: false, message: "API Key 无效，请检查填写是否正确（通常以 sk- 开头）" };
    }
    if (response.status === 403) {
      return {
        ok: false,
        message: "密钥已识别，但被拒绝访问。请确认密钥归属地域与 Base URL 匹配。",
      };
    }
    if (response.status >= 500) {
      return {
        ok: false,
        message: `百炼服务暂时不可用（HTTP ${response.status}），请稍后再试`,
      };
    }
    return {
      ok: true,
      message:
        response.status === 200
          ? "连接成功，密钥有效"
          : "连接成功，密钥已通过鉴权（测试任务不存在属正常现象）",
    };
  } catch (error) {
    return { ok: false, message: friendlyError(error) };
  }
}

export async function downloadToDisk(url: string, fileName: string): Promise<string> {
  if (isTauri) {
    return invoke<string>("download_file", { url, fileName });
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return "";
}

export function guessFileName(url: string, kind: "image" | "video"): string {
  let extension = "";
  try {
    const match = new URL(url).pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
    extension = match?.[1]?.toLowerCase() ?? "";
  } catch {
    extension = "";
  }
  const allowed = ["png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "webm"];
  if (!allowed.includes(extension)) extension = kind === "image" ? "png" : "mp4";
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `bailian-${kind}-${stamp}.${extension}`;
}

export function friendlyError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const rules: Array<[RegExp, string]> = [
    [
      /InvalidApiKey|invalid_api_key|incorrect api key|401/i,
      "API Key 无效或已过期，请在「设置」中检查密钥是否完整。",
    ],
    [
      /AccessDenied|Forbidden|ModelNotOpen|403/i,
      "当前密钥没有该模型的调用权限，请前往百炼控制台开通对应模型服务。",
    ],
    [
      /Arrearage|QuotaExceeded|AllocationQuota|欠费|余额/i,
      "账户余额不足或免费额度已用尽，请检查阿里云百炼账户。",
    ],
    [
      /Throttling|rate.?limit|429/i,
      "请求过于频繁，已触发限流，请稍等片刻再试。",
    ],
    [
      /DataInspectionFailed|inappropriate|敏感|审核/i,
      "内容未通过安全审核，请调整提示词后重试。",
    ],
    [
      /UnsupportedModel|model_not_found|model not found|模型.*(不存在|未开通)/i,
      "模型不可用，请在设置中更换模型，并确认已在百炼控制台开通。",
    ],
    [
      /timeout|timed out|超时/i,
      "请求超时，请检查网络连接后重试。",
    ],
    [
      /Failed to fetch|Network|network|dns|connect|CORS/i,
      "网络连接失败，请检查 Base URL、代理设置或网络状态。",
    ],
    [
      /task_id|Base URL/i,
      raw || "接口返回格式不符合预期，请检查 Base URL 是否为百炼原生 API 地址。",
    ],
  ];
  for (const [pattern, message] of rules) {
    if (pattern.test(raw)) return message;
  }
  return raw || "生成失败，请稍后重试。";
}