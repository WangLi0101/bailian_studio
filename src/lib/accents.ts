import type { AccentId } from "../types";

export interface AccentPreset {
  id: AccentId;
  name: string;
  swatch: string;
}

export const ACCENTS: AccentPreset[] = [
  { id: "violet", name: "紫罗兰", swatch: "linear-gradient(135deg, #5B57E8, #A855F7)" },
  { id: "ocean", name: "深海", swatch: "linear-gradient(135deg, #0B6BCB, #18B6C9)" },
  { id: "forest", name: "森野", swatch: "linear-gradient(135deg, #0E7C5A, #6BAF3C)" },
  { id: "amber", name: "琥珀", swatch: "linear-gradient(135deg, #A9570A, #E7A21D)" },
];

export function getAccent(id: AccentId): AccentPreset {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}