import { useCallback, useEffect, useRef, useState } from "react";
import { fetchTask, friendlyError } from "../lib/api";
import type { Settings, TaskSnapshot } from "../types";

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
  taskId: string | null;
  error: string | null;
  snapshot: TaskSnapshot | null;
  rawStatus: string;
  elapsed: number;
  isBusy: boolean;
  submit: (create: () => Promise<string>) => Promise<TaskSnapshot | null>;
  cancel: () => void;
  reset: () => void;
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const POLL_INTERVAL = 2500;
const MAX_ATTEMPTS = 320;

export function useGeneration(settings: Settings): GenerationController {
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TaskSnapshot | null>(null);
  const [rawStatus, setRawStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const busyRef = useRef(false);
  const cancelRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const cancel = useCallback(() => {
    if (!busyRef.current) return;
    cancelRef.current = true;
    busyRef.current = false;
    clearTimer();
    setPhase("canceled");
  }, [clearTimer]);

  const reset = useCallback(() => {
    if (busyRef.current) return;
    setPhase("idle");
    setTaskId(null);
    setError(null);
    setSnapshot(null);
    setRawStatus("");
    setElapsed(0);
  }, []);

  const submit = useCallback(
    async (create: () => Promise<string>): Promise<TaskSnapshot | null> => {
      if (busyRef.current) return null;
      cancelRef.current = false;
      busyRef.current = true;
      setPhase("submitting");
      setTaskId(null);
      setError(null);
      setSnapshot(null);
      setRawStatus("");
      setElapsed(0);
      startRef.current = Date.now();
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);

      const finish = () => {
        busyRef.current = false;
        clearTimer();
      };

      try {
        const id = await create();
        if (cancelRef.current) return null;
        setTaskId(id);
        setPhase("queued");

        let attempts = 0;
        let failures = 0;

        while (!cancelRef.current) {
          await sleep(attempts === 0 ? 1200 : POLL_INTERVAL);
          if (cancelRef.current) return null;
          attempts += 1;

          if (attempts > MAX_ATTEMPTS) {
            throw new Error("任务等待超时，视频生成时间可能较长，请稍后在百炼控制台查看结果。");
          }

          try {
            const current = await fetchTask(settingsRef.current, id);
            failures = 0;
            if (cancelRef.current) return null;
            setRawStatus(current.taskStatus);

            if (current.taskStatus === "SUCCEEDED") {
              if (current.urls.length === 0 && !current.videoUrl) {
                throw new Error("任务已完成，但接口未返回可访问的媒体地址。");
              }
              setSnapshot(current);
              setPhase("succeeded");
              finish();
              return current;
            }

            if (["FAILED", "CANCELED", "UNKNOWN"].includes(current.taskStatus)) {
              const detail = current.message ?? "任务执行失败";
              throw new Error(
                `${current.code ? `[${current.code}] ` : ""}${detail}`,
              );
            }

            setPhase(current.taskStatus === "RUNNING" ? "running" : "queued");
          } catch (pollError) {
            if (cancelRef.current) return null;
            failures += 1;
            if (failures >= 3) throw pollError;
          }
        }
        return null;
      } catch (submitError) {
        if (cancelRef.current) return null;
        setError(friendlyError(submitError));
        setPhase("failed");
        finish();
        return null;
      }
    },
    [clearTimer],
  );

  return {
    phase,
    taskId,
    error,
    snapshot,
    rawStatus,
    elapsed,
    isBusy: phase === "submitting" || phase === "queued" || phase === "running",
    submit,
    cancel,
    reset,
  };
}