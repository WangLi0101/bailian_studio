import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  CircleAlert,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";
import type {
  LibraryItem,
  ModelOption,
  Settings,
  ToastOptions,
  ToastSeverity,
} from "../types";
import {
  clearPersistedLibrary,
  loadLibrary,
  loadSettings,
  saveLibrary,
  saveSettings,
} from "../lib/storage";
import {
  buildImageModels,
  buildVideoModels,
  findImageModel,
  findVideoModel,
} from "../lib/models";

interface AppContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  mode: "light" | "dark";
  /** 内置 + 自定义图片模型。 */
  imageModels: ModelOption[];
  /** 内置 + 自定义视频模型。 */
  videoModels: ModelOption[];
  getImageModel: (id: string) => ModelOption;
  getVideoModel: (id: string) => ModelOption;
  library: LibraryItem[];
  addLibraryItem: (item: LibraryItem) => void;
  removeLibraryItem: (id: string) => void;
  clearLibrary: () => void;
  notify: (message: string, options?: ToastOptions) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface ToastState {
  id: number;
  message: string;
  severity: ToastSeverity;
  duration: number;
  action?: ToastOptions["action"];
}

function useSystemDark(): boolean {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setDark(event.matches);
    query.addEventListener("change", handler);
    return () => query.removeEventListener("change", handler);
  }, []);

  return dark;
}

const SEVERITY_STYLES: Record<
  ToastSeverity,
  { icon: typeof Info; className: string }
> = {
  success: { icon: CircleCheck, className: "text-success bg-success/10" },
  error: { icon: CircleAlert, className: "text-danger bg-danger/10" },
  warning: { icon: TriangleAlert, className: "text-warning bg-warning/10" },
  info: { icon: Info, className: "text-primary bg-primary/10" },
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [library, setLibrary] = useState<LibraryItem[]>(() => loadLibrary());
  const systemDark = useSystemDark();
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<number | null>(null);

  const mode: "light" | "dark" =
    settings.themeMode === "system"
      ? systemDark
        ? "dark"
        : "light"
      : settings.themeMode;

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLibrary(library);
  }, [library]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.dataset.accent = settings.accent;
    root.style.colorScheme = mode;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", mode === "dark" ? "#0C0C11" : "#F6F5FB");
  }, [mode, settings.accent]);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => ({ ...previous, ...patch }));
  }, []);

  const imageModels = useMemo(
    () => buildImageModels(settings.customModels),
    [settings.customModels],
  );
  const videoModels = useMemo(
    () => buildVideoModels(settings.customModels),
    [settings.customModels],
  );
  const getImageModel = useCallback(
    (id: string) => findImageModel(imageModels, id),
    [imageModels],
  );
  const getVideoModel = useCallback(
    (id: string) => findVideoModel(videoModels, id),
    [videoModels],
  );

  const addLibraryItem = useCallback((item: LibraryItem) => {
    setLibrary((previous) => [item, ...previous].slice(0, 80));
  }, []);

  const removeLibraryItem = useCallback((id: string) => {
    setLibrary((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const clearLibrary = useCallback(() => {
    setLibrary([]);
    clearPersistedLibrary();
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) {
      window.clearTimeout(toastTimer.current);
      toastTimer.current = null;
    }
    setToast(null);
  }, []);

  const notify = useCallback((message: string, options?: ToastOptions) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    const id = Date.now();
    const duration = options?.duration ?? 4200;
    setToast({
      id,
      message,
      severity: options?.severity ?? "success",
      duration,
      action: options?.action,
    });
    if (duration > 0) {
      toastTimer.current = window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, duration);
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      updateSettings,
      mode,
      imageModels,
      videoModels,
      getImageModel,
      getVideoModel,
      library,
      addLibraryItem,
      removeLibraryItem,
      clearLibrary,
      notify,
    }),
    [
      settings,
      updateSettings,
      mode,
      imageModels,
      videoModels,
      getImageModel,
      getVideoModel,
      library,
      addLibraryItem,
      removeLibraryItem,
      clearLibrary,
      notify,
    ],
  );

  const severity = toast ? SEVERITY_STYLES[toast.severity] : null;
  const ToastIcon = severity?.icon ?? Info;

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast &&
        severity &&
        createPortal(
          <div
            className="pointer-events-none fixed bottom-6 left-1/2 z-[120] w-[min(580px,calc(100vw-2rem))] animate-toast-in"
            role="status"
            aria-live="polite"
          >
            <div className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line-strong bg-card/95 p-3 pr-2 shadow-float backdrop-blur-xl">
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${severity.className}`}
              >
                <ToastIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="min-w-0 flex-1 whitespace-pre-line break-words pt-1.5 text-[13px] leading-relaxed text-ink">
                {toast.message}
              </p>
              {toast.action && (
                <button
                  type="button"
                  className="mt-1 shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  onClick={() => {
                    toast.action?.onClick();
                    dismissToast();
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                aria-label="关闭提示"
                className="mt-1 grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                onClick={dismissToast}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside <AppProvider>");
  return context;
}