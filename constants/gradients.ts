export type GradientPreset = {
  id: string;
  name: string;
  colors: [string, string, ...string[]];
};

export const GRADIENT_PRESETS: GradientPreset[] = [
  { id: 'sunset', name: 'Sunset', colors: ['#FF6B6B', '#FFE66D'] },
  { id: 'lavender', name: 'Lavender', colors: ['#A78BFA', '#EC4899'] },
  { id: 'ocean', name: 'Ocean', colors: ['#06B6D4', '#3B82F6'] },
  { id: 'forest', name: 'Forest', colors: ['#10B981', '#059669'] },
  { id: 'peach', name: 'Peach', colors: ['#FB923C', '#F472B6'] },
  { id: 'midnight', name: 'Midnight', colors: ['#1E1B4B', '#7C3AED'] },
  { id: 'rose', name: 'Rose', colors: ['#F43F5E', '#FB7185'] },
  { id: 'sky', name: 'Sky', colors: ['#38BDF8', '#818CF8'] },
];

export const COLOR_PRESETS = [
  '#7C3AED',
  '#EC4899',
  '#F97316',
  '#06B6D4',
  '#10B981',
  '#3B82F6',
  '#F43F5E',
  '#1E1B4B',
];

export function getGradientColors(id: string): [string, string, ...string[]] {
  const preset = GRADIENT_PRESETS.find((g) => g.id === id);
  return preset?.colors ?? GRADIENT_PRESETS[0].colors;
}
