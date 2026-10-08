// Categorical colours for stems on the dark surface, assigned by position
// and recycled after twelve.
export const STEM_COLORS = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#e66767", "#2aa7b8", "#a8743a", "#8fb33a", "#e39bd1", "#7f8c8d"];

export function stemColor(index) {
  return STEM_COLORS[index % STEM_COLORS.length];
}
