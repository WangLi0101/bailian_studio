import { useCallback, useEffect, useState } from "react";
import { fetchTask, friendlyError } from "../lib/api";
import {
  clearPendingTask,
  loadPendingTasks,
  savePendingTask,
} from "../lib/storage";
import type {
  LibraryItem,
  MediaKind,
  Settings,
  TaskMeta,
  TaskSnapshot,
  ToastOptions,
} from "../types";

export type GenerationPhase =
  | "idle"
  | "submitting"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface GenerationController {
  phase: GenerationPhase;
  /** 当前通道的任务类型（图片 / 视频各自独立轮询，可并行）。 */
  kind: MediaKind;
  taskId: string | null;
  error: string | null;
  snapshot: TaskSnapshot | null;
  /** 服务端返回的原始任务状态，如 PENDING / RUNNING。 */
  rawStatus: string;
  elapsed: number;
  /** 提交任务时的上下文，用于刷新后恢复展示结果。 */
  meta: TaskMeta | null;
  isBusy: boolean;
  submit: (meta: TaskMeta, create: () => Promise<string>) => Promise<TaskSnapshot | null>;
  cancel: () => void;
  reset: () => void;
}

const KINDS: MediaKind[] = ["image", "video"];
const KIND_LABEL: Record<MediaKind, string> = { image: "图片", video: "视频" };
const TERMINAL_FAILURES = ["FAILED", "CANCELED", "UNKNOWN"];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** 提交后首次查询前的等待，给云端一点调度时间。 */
const FIRST_POLL_DELAY = 1200;

/**
 * 轮询退避：前 30 秒每 2.5 秒查一次，2 分钟内降到 5 秒，
 * 之后视频任务降到 9 秒（长任务无需高频查询），图片保持 6 秒。
 */
function pollDelay(elapsedMs: number, kind: MediaKind): number {
  if (elapsedMs < 30_000) return 2500;
  if (elapsedMs < 120_000) return 5000;
  return kind === "video" ? 9000 : 6000;
}

/** 图片任务 5 分钟仍未结束视为超时，视频任务放宽到 20 分钟。 */
function timeoutMs(kind: MediaKind): number {
  return kind === "video" ? 20 * 60_000 : 5 * 60_000;
}

interface GenerationState {
  phase: GenerationPhase;
  taskId: string | null;
  error: string | null;
  snapshot: TaskSnapshot | null;
  rawStatus: string;
  elapsed: number;
  meta: TaskMeta | null;
}

const idleState = (): GenerationState => ({
  phase: "idle",
  taskId: null,
  error: null,
  snapshot: null,
  rawStatus: "",
  elapsed: 0,
  meta: null,
});

/**
 * 任务轮询引擎放在模块级单例里，按图片 / 视频各建一条通道：
 * 页面切换（隐藏但保持挂载）不影响轮询，刷新后可恢复跟踪，两条通道可并行。
 */
const states: Record<MediaKind, GenerationState> = {
  image: idleState(),
  video: idleState(),
};
const listeners: Record<MediaKind, Set<(next: GenerationState) => void>> = {
  image: new Set(),
  video: new Set(),
};

function setState(kind: MediaKind, patch: Partial<GenerationState>): void {
  states[kind] = { ...states[kind], ...patch };
  for (const listener of listeners[kind]) listener(states[kind]);
}

interface RunHandle {
  /** 每次运行独立的取消标记，避免取消旧任务后误伤新任务。 */
  canceled: boolean;
}

const activeRuns: Partial<Record<MediaKind, RunHandle>> = {};
const tickers: Partial<Record<MediaKind, number>> = {};
let settingsGetter: (() => Settings) | null = null;

function startTicker(kind: MediaKind, startedAt: number): void {
  stopTicker(kind);
  tickers[kind] = window.setInterval(() => {
    setState(kind, {
      elapsed: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
    });
  }, 1000);
}

function stopTicker(kind: MediaKind): void {
  const id = tickers[kind];
  if (id !== undefined) {
    window.clearInterval(id);
    delete tickers[kind];
  }
}

/** 由 AppProvider 注册，轮询时始终读取最新设置（如运行中更换 API Key）。 */
export function bindGenerationSettings(getSettings: () => Settings): void {
  settingsGetter = getSettings;
}

/** 按任务元信息与服务端快照构建作品库条目。 */
export function buildLibraryItem(
  kind: MediaKind,
  meta: TaskMeta,
  snapshot: TaskSnapshot,
): LibraryItem {
  const urls =
    kind === "video" && snapshot.videoUrl
      ? [
          snapshot.videoUrl,
          ...snapshot.urls.filter((url) => url !== snapshot.videoUrl),
        ]
      : snapshot.urls;
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now()),
    kind,
    urls,
    prompt: meta.prompt,
    negativePrompt: meta.negativePrompt,
    model: meta.model,
    size: meta.size,
    duration: meta.duration,
    createdAt: Date.now(),
    taskId: snapshot.taskId,
    inputImageUrl: meta.inputImageUrl,
  };
}

async function runTask(
  run: RunHandle,
  kind: MediaKind,
  taskId: string,
  startedAt: number,
): Promise<TaskSnapshot | null> {
  let failures = 0;
  let delay = FIRST_POLL_DELAY;

  while (!run.canceled) {
    await sleep(delay);
    if (run.canceled) return null;

    if (Date.now() - startedAt > timeoutMs(kind)) {
      throw new Error(
        `任务等待超时，${KIND_LABEL[kind]}生成时间可能较长，请稍后在百炼控制台查看结果。`,
      );
    }

    let current: TaskSnapshot;
    try {
      const settings = settingsGetter?.();
      if (!settings) throw new Error("应用设置尚未就绪，请重新发起生成。");
      current = await fetchTask(settings, taskId);
      failures = 0;
    } catch (pollError) {
      if (run.canceled) return null;
      failures += 1;
      if (failures >= 3) throw pollError;
      delay = pollDelay(Date.now() - startedAt, kind);
      continue;
    }

    setState(kind, { rawStatus: current.taskStatus });

    if (current.taskStatus === "SUCCEEDED") {
      if (current.urls.length === 0 && !current.videoUrl) {
        throw new Error("任务已完成，但接口未返回可访问的媒体地址。");
      }
      setState(kind, {
        phase: "succeeded",
        snapshot: current,
        elapsed: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      });
      clearPendingTask(kind);
      return current;
    }

    if (TERMINAL_FAILURES.includes(current.taskStatus)) {
      const detail = current.message ?? "任务执行失败";
      throw new Error(`${current.code ? `[${current.code}] ` : ""}${detail}`);
    }

    setState(kind, {
      phase: current.taskStatus === "RUNNING" ? "running" : "queued",
    });
    delay = pollDelay(Date.now() - startedAt, kind);
  }

  return null;
}

async function submitGeneration(
  kind: MediaKind,
  meta: TaskMeta,
  create: () => Promise<string>,
): Promise<TaskSnapshot | null> {
  const running = activeRuns[kind];
  if (running && !running.canceled) return null;

  const run: RunHandle = { canceled: false };
  activeRuns[kind] = run;
  const startedAt = Date.now();

  setState(kind, {
    phase: "submitting",
    taskId: null,
    error: null,
    snapshot: null,
    rawStatus: "",
    elapsed: 0,
    meta,
  });
  startTicker(kind, startedAt);

  try {
    const taskId = await create();
    if (run.canceled) return null;
    setState(kind, { phase: "queued", taskId });
    // 持久化进行中的任务：页面刷新后 resumePendingTask 会继续跟踪。
    savePendingTask({ taskId, kind, startedAt, meta });
    return await runTask(run, kind, taskId, startedAt);
  } catch (submitError) {
    if (run.canceled) return null;
    setState(kind, { phase: "failed", error: friendlyError(submitError) });
    clearPendingTask(kind);
    return null;
  } finally {
    if (activeRuns[kind] === run) {
      delete activeRuns[kind];
      stopTicker(kind);
    }
  }
}

/** 仅停止本地等待与轮询；云端任务会继续执行并计费。 */
export function cancelGeneration(kind: MediaKind): void {
  const run = activeRuns[kind];
  if (!run || run.canceled) return;
  run.canceled = true;
  stopTicker(kind);
  clearPendingTask(kind);
  setState(kind, { phase: "canceled" });
}

export function resetGeneration(kind: MediaKind): void {
  const run = activeRuns[kind];
  if (run && !run.canceled) return;
  setState(kind, idleState());
}

/**
 * 应用启动时恢复刷新前仍在云端渲染的任务：
 * 继续轮询原任务，完成/失败后写入作品库并弹 Toast。
 * 超过等待上限的陈旧记录直接丢弃。
 */
export async function resumePendingTask(handlers: {
  addLibraryItem: (item: LibraryItem) => void;
  notify: (message: string, options?: ToastOptions) => void;
}): Promise<void> {
  const pending = loadPendingTasks();
  for (const kind of KINDS) {
    const record = pending[kind];
    if (!record) continue;
    // 已有运行中的任务（如 StrictMode 双挂载或刚提交的新任务）时不重复恢复。
    const existing = activeRuns[kind];
    if (existing && !existing.canceled) continue;

    const { taskId, startedAt, meta } = record;
    if (Date.now() - startedAt > timeoutMs(kind)) {
      clearPendingTask(kind);
      continue;
    }

    const run: RunHandle = { canceled: false };
    activeRuns[kind] = run;

    setState(kind, {
      phase: "queued",
      taskId,
      error: null,
      snapshot: null,
      rawStatus: "",
      elapsed: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      meta,
    });
    startTicker(kind, startedAt);

    void (async () => {
      try {
        const snapshot = await runTask(run, kind, taskId, startedAt);
        if (run.canceled || !snapshot) return;
        handlers.addLibraryItem(buildLibraryItem(kind, meta, snapshot));
        handlers.notify(`上次未完成的${KIND_LABEL[kind]}已生成，结果已存入作品库`, {
          severity: "success",
        });
      } catch (error) {
        if (run.canceled) return;
        setState(kind, { phase: "failed", error: friendlyError(error) });
        handlers.notify(
          `上次提交的${KIND_LABEL[kind]}任务失败：${friendlyError(error)}`,
          { severity: "error" },
        );
      } finally {
        if (activeRuns[kind] === run) {
          delete activeRuns[kind];
          stopTicker(kind);
        }
      }
    })();
  }
}

export function useGeneration(kind: MediaKind): GenerationController {
  const [view, setView] = useState<GenerationState>(states[kind]);

  useEffect(() => {
    const listener = (next: GenerationState) => setView(next);
    listeners[kind].add(listener);
    listener(states[kind]);
    return () => {
      listeners[kind].delete(listener);
    };
  }, [kind]);

  const submit = useCallback(
    (meta: TaskMeta, create: () => Promise<string>) =>
      submitGeneration(kind, meta, create),
    [kind],
  );
  const cancel = useCallback(() => cancelGeneration(kind), [kind]);
  const reset = useCallback(() => resetGeneration(kind), [kind]);

  return {
    kind,
    phase: view.phase,
    taskId: view.taskId,
    error: view.error,
    snapshot: view.snapshot,
    rawStatus: view.rawStatus,
    elapsed: view.elapsed,
    meta: view.meta,
    isBusy:
      view.phase === "submitting" ||
      view.phase === "queued" ||
      view.phase === "running",
    submit,
    cancel,
    reset,
  };
}
