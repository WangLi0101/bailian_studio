import { useState } from "react";
import {
  Boxes,
  Check,
  Film,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { CustomModel, CustomModelCategory, Settings } from "../types";
import { useApp } from "../context/AppContext";
import { IMAGE_MODELS, VIDEO_MODELS } from "../lib/models";
import { cn } from "../lib/cn";
import { SectionCard } from "./SectionCard";
import {
  Button,
  Chip,
  Hint,
  Label,
  Segmented,
  TextInput,
} from "./ui";

const BUILT_IN_IDS = new Set(
  [...IMAGE_MODELS, ...VIDEO_MODELS].map((model) => model.id),
);

const SIZE_PATTERN = /^\d{2,5}\*\d{2,5}$/;
const RESOLUTIONS = ["480P", "720P", "1080P"];

interface Draft {
  id: string;
  label: string;
  category: CustomModelCategory;
  kind: "t2v" | "i2v";
  desc: string;
  sizes: string;
  resolutions: string;
  durations: string;
  maxPrompt: string;
}

const EMPTY_DRAFT: Draft = {
  id: "",
  label: "",
  category: "image",
  kind: "t2v",
  desc: "",
  sizes: "",
  resolutions: "",
  durations: "5",
  maxPrompt: "1500",
};

function splitList(value: string): string[] {
  return value
    .split(/[\s,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sizeTokens(value: string): string[] {
  return splitList(value).map((item) => item.replace(/[×xX]/g, "*"));
}

function draftFromModel(model: CustomModel): Draft {
  return {
    id: model.id,
    label: model.label,
    category: model.category,
    kind: model.kind ?? "t2v",
    desc: model.desc ?? "",
    sizes: (model.sizes ?? []).join(", "),
    resolutions: (model.resolutions ?? []).join(", "),
    durations: (model.durations ?? []).join(", "),
    maxPrompt: model.maxPrompt ? String(model.maxPrompt) : "",
  };
}

export function CustomModelManager() {
  const { settings, updateSettings, notify } = useApp();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const customModels = settings.customModels;

  const patchDraft = (patch: Partial<Draft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    setError("");
  };

  const openCreate = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
    setOpen(true);
  };

  const openEdit = (model: CustomModel) => {
    setEditingId(model.id);
    setDraft(draftFromModel(model));
    setError("");
    setOpen(true);
  };

  const closeEditor = () => {
    setOpen(false);
    setEditingId(null);
    setError("");
  };

  const handleSave = () => {
    const id = draft.id.trim();
    if (!id) {
      setError("请填写模型 ID，需与百炼控制台中的模型名称一致。");
      return;
    }
    const duplicated =
      BUILT_IN_IDS.has(id) ||
      customModels.some((model) => model.id === id && model.id !== editingId);
    if (duplicated) {
      setError("该模型 ID 已存在，请换一个 ID，或直接编辑列表中的同名模型。");
      return;
    }

    const sizes = sizeTokens(draft.sizes);
    if (sizes.some((value) => !SIZE_PATTERN.test(value))) {
      setError("尺寸格式应为「宽*高」，例如 1024*1024，多个尺寸用逗号分隔。");
      return;
    }

    const resolutions = splitList(draft.resolutions).map((value) =>
      value.toUpperCase(),
    );
    if (resolutions.some((value) => !RESOLUTIONS.includes(value))) {
      setError("清晰度仅支持 480P / 720P / 1080P，多个档位用逗号分隔。");
      return;
    }

    const durations = splitList(draft.durations).map((value) => Number(value));
    if (
      durations.some(
        (value) =>
          !Number.isFinite(value) ||
          !Number.isInteger(value) ||
          value <= 0 ||
          value > 60,
      )
    ) {
      setError("时长需为 1–60 之间的整数秒，多个时长用逗号分隔。");
      return;
    }

    let maxPrompt: number | undefined;
    if (draft.maxPrompt.trim()) {
      const parsed = Number(draft.maxPrompt);
      if (!Number.isFinite(parsed) || parsed < 100 || parsed > 10000) {
        setError("提示词上限需为 100–10000 之间的数字。");
        return;
      }
      maxPrompt = Math.round(parsed);
    }

    const entry: CustomModel = {
      id,
      label: draft.label.trim() || id,
      category: draft.category,
      desc: draft.desc.trim() || undefined,
      ...(draft.category === "video"
        ? {
            kind: draft.kind,
            ...(draft.kind === "i2v"
              ? { resolutions: resolutions.length ? resolutions : undefined }
              : { sizes: sizes.length ? sizes : undefined }),
            durations: durations.length ? [...new Set(durations)] : undefined,
          }
        : { sizes: sizes.length ? sizes : undefined }),
      maxPrompt,
    };

    const nextCustomModels = editingId
      ? customModels.map((model) => (model.id === editingId ? entry : model))
      : [...customModels, entry];

    const patch: Partial<Settings> = { customModels: nextCustomModels };
    if (editingId) {
      if (settings.imageModel === editingId) {
        patch.imageModel =
          entry.category === "image" ? entry.id : IMAGE_MODELS[0].id;
      }
      if (settings.videoModel === editingId) {
        patch.videoModel =
          entry.category === "video" ? entry.id : VIDEO_MODELS[0].id;
      }
    }

    updateSettings(patch);
    notify(
      editingId
        ? `已更新自定义模型「${entry.label}」`
        : `已添加自定义模型「${entry.label}」`,
      { severity: "success", duration: 3000 },
    );
    closeEditor();
  };

  const handleRemove = (model: CustomModel) => {
    if (confirmId !== model.id) {
      setConfirmId(model.id);
      window.setTimeout(
        () => setConfirmId((current) => (current === model.id ? null : current)),
        3200,
      );
      return;
    }

    const nextCustomModels = customModels.filter(
      (item) => item.id !== model.id,
    );
    const patch: Partial<Settings> = { customModels: nextCustomModels };
    if (settings.imageModel === model.id) {
      patch.imageModel = IMAGE_MODELS[0].id;
    }
    if (settings.videoModel === model.id) {
      patch.videoModel = VIDEO_MODELS[0].id;
    }
    updateSettings(patch);
    setConfirmId(null);
    if (editingId === model.id) closeEditor();
    notify(`已删除自定义模型「${model.label}」`, {
      severity: "info",
      duration: 2600,
    });
  };

  return (
    <SectionCard
      title="自定义模型"
      subtitle="添加列表未内置、但已在百炼开通的模型"
      icon={<Boxes className="h-[18px] w-[18px]" />}
      action={
        open ? undefined : (
          <Button
            size="sm"
            variant="tonal"
            onClick={openCreate}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            添加模型
          </Button>
        )
      }
    >
      {customModels.length === 0 && !open && (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface-1/30 px-4 py-6 text-center">
          <p className="text-[12px] font-semibold text-ink">还没有自定义模型</p>
          <p className="mx-auto mt-1 max-w-md text-[10.5px] leading-relaxed text-ink-3">
            如果百炼上线了新模型，或你使用的是业务空间专属模型，可以手动填写模型
            ID。添加后会出现在图片 / 视频创作页的模型列表中。
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={openCreate}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            添加第一个模型
          </Button>
        </div>
      )}

      {customModels.length > 0 && (
        <div className="space-y-2">
          {customModels.map((model) => {
            const isVideo = model.category === "video";
            const Icon = isVideo ? Film : ImageIcon;
            return (
              <div
                key={model.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface-1/40 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-ink">
                      {model.label}
                    </span>
                    <Chip tone="secondary" className="px-1.5 py-0.5 text-[9px]">
                      {isVideo
                        ? model.kind === "i2v"
                          ? "图生视频"
                          : "文生视频"
                        : "文生图"}
                    </Chip>
                  </div>
                  <p
                    className="mt-0.5 truncate font-mono text-[10px] text-ink-3"
                    title={model.id}
                  >
                    {model.id}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`编辑 ${model.label}`}
                    title="编辑"
                    onClick={() => openEdit(model)}
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${model.label}`}
                    title={confirmId === model.id ? "再次点击确认删除" : "删除"}
                    onClick={() => handleRemove(model)}
                    className={cn(
                      "inline-flex h-8 cursor-pointer items-center gap-1 rounded-xl px-2 text-[10.5px] font-semibold transition-colors",
                      confirmId === model.id
                        ? "bg-danger/12 text-danger"
                        : "text-ink-3 hover:bg-danger/8 hover:text-danger",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {confirmId === model.id && "确认"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <form
          className="mt-4 animate-fade-up rounded-2xl border border-primary/20 bg-primary/4 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[12.5px] font-bold text-ink">
              {editingId ? "编辑自定义模型" : "添加自定义模型"}
            </p>
            <button
              type="button"
              aria-label="收起"
              onClick={closeEditor}
              className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>模型 ID</Label>
              <TextInput
                value={draft.id}
                onChange={(event) => patchDraft({ id: event.target.value })}
                placeholder="例如 wan2.6-t2i-preview"
                spellCheck={false}
                autoComplete="off"
                aria-label="自定义模型 ID"
              />
            </div>
            <div>
              <Label>显示名称</Label>
              <TextInput
                value={draft.label}
                onChange={(event) => patchDraft({ label: event.target.value })}
                placeholder="留空则使用模型 ID"
                aria-label="自定义模型显示名称"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>模型类型</Label>
              <Segmented<CustomModelCategory>
                className="w-full [&>button]:flex-1"
                ariaLabel="模型类型"
                value={draft.category}
                onChange={(value) => patchDraft({ category: value })}
                options={[
                  {
                    value: "image",
                    label: "图片模型",
                    icon: <ImageIcon className="h-3.5 w-3.5" />,
                  },
                  {
                    value: "video",
                    label: "视频模型",
                    icon: <Film className="h-3.5 w-3.5" />,
                  },
                ]}
              />
            </div>
            {draft.category === "video" && (
              <div>
                <Label>生成方式</Label>
                <Segmented<"t2v" | "i2v">
                  className="w-full [&>button]:flex-1"
                  ariaLabel="生成方式"
                  value={draft.kind}
                  onChange={(value) => patchDraft({ kind: value })}
                  options={[
                    { value: "t2v", label: "文生视频" },
                    { value: "i2v", label: "图生视频" },
                  ]}
                />
              </div>
            )}
          </div>

          <div className="mt-3">
            <Label>模型描述（可选）</Label>
            <TextInput
              value={draft.desc}
              onChange={(event) => patchDraft({ desc: event.target.value })}
              placeholder="例如：新一代旗舰，更强的语义理解"
              aria-label="自定义模型描述"
            />
          </div>

          {draft.category === "video" && draft.kind === "i2v" ? (
            <div className="mt-3">
              <Label>清晰度档位（可选）</Label>
              <TextInput
                value={draft.resolutions}
                onChange={(event) =>
                  patchDraft({ resolutions: event.target.value })
                }
                placeholder="480P, 720P, 1080P"
                spellCheck={false}
                aria-label="自定义模型清晰度"
              />
              <Hint className="mt-1.5">
                留空则使用全部三档；画面比例跟随首帧图片。
              </Hint>
            </div>
          ) : (
            <div className="mt-3">
              <Label>
                {draft.category === "video" ? "视频尺寸（可选）" : "画面尺寸（可选）"}
              </Label>
              <TextInput
                value={draft.sizes}
                onChange={(event) => patchDraft({ sizes: event.target.value })}
                placeholder="1024*1024, 1280*720"
                spellCheck={false}
                aria-label="自定义模型尺寸"
              />
              <Hint className="mt-1.5">
                {draft.category === "video"
                  ? "留空则提供 480P / 720P / 1080P 常用尺寸；清晰度会按尺寸自动归档。"
                  : "留空则使用内置的 5 种常用比例；多个尺寸用逗号分隔。"}
              </Hint>
            </div>
          )}

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {draft.category === "video" && (
              <div>
                <Label>可选时长（秒）</Label>
                <TextInput
                  value={draft.durations}
                  onChange={(event) =>
                    patchDraft({ durations: event.target.value })
                  }
                  placeholder="5, 10"
                  inputMode="numeric"
                  aria-label="自定义模型时长"
                />
              </div>
            )}
            <div>
              <Label>提示词上限（可选）</Label>
              <TextInput
                value={draft.maxPrompt}
                onChange={(event) =>
                  patchDraft({ maxPrompt: event.target.value })
                }
                placeholder="1500"
                inputMode="numeric"
                aria-label="自定义模型提示词上限"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 rounded-xl border border-danger/25 bg-danger/8 px-3 py-2 text-[10.5px] leading-relaxed text-danger">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              icon={<Check className="h-3.5 w-3.5" />}
            >
              {editingId ? "保存修改" : "添加模型"}
            </Button>
            <Button size="sm" variant="outline" onClick={closeEditor}>
              取消
            </Button>
            <span className="text-[10px] text-ink-3">
              仅支持百炼文生图 / 视频生成接口的模型
            </span>
          </div>
        </form>
      )}
    </SectionCard>
  );
}