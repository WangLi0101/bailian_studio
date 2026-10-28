import { Sparkles } from "lucide-react";

export function PromptIdeas({
  ideas,
  onPick,
}: {
  ideas: string[];
  onPick: (idea: string) => void;
}) {
  return (
    <div
      className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
      style={{
        maskImage:
          "linear-gradient(to right, #000 calc(100% - 28px), transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, #000 calc(100% - 28px), transparent)",
      }}
    >
      <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-ink-3">
        <Sparkles className="h-3.5 w-3.5" />
        灵感
      </span>
      {ideas.map((idea) => (
        <button
          key={idea}
          type="button"
          title={idea}
          onClick={() => onPick(idea)}
          className="max-w-[220px] shrink-0 cursor-pointer truncate rounded-full border border-line bg-surface-1/50 px-2.5 py-1 text-[10.5px] text-ink-2 transition-all duration-200 hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
        >
          {idea}
        </button>
      ))}
    </div>
  );
}