export const COVER_TEXT_COLORS = [
  { id: 'white', value: '#FFFFFF', label: 'White' },
  { id: 'cream', value: '#FFF8F0', label: 'Cream' },
  { id: 'navy', value: '#12121F', label: 'Navy' },
  { id: 'purple', value: '#7C3AED', label: 'Purple' },
  { id: 'gold', value: '#C9A227', label: 'Gold' },
] as const;

export const DEFAULT_COVER_TEXT_COLOR = '#FFFFFF';

const LIGHT_TEXT = new Set(['#FFFFFF', '#FFF8F0', '#F5F2FF']);
const DARK_GRADIENTS = new Set(['midnight']);

export function normalizeCoverTextColor(color?: string | null): string {
  if (!color) return DEFAULT_COVER_TEXT_COLOR;
  const match = COVER_TEXT_COLORS.find((option) => option.value.toLowerCase() === color.toLowerCase());
  return match?.value ?? color;
}

export function isLightCoverText(color: string): boolean {
  return LIGHT_TEXT.has(color.toUpperCase());
}

export function getCoverOverlay(
  textColor: string,
  coverType: 'image' | 'color' | 'gradient' = 'gradient',
  gradientId?: string
): readonly [string, string, string] {
  if (isLightCoverText(textColor)) {
    if (coverType === 'gradient' && gradientId && DARK_GRADIENTS.has(gradientId)) {
      return ['transparent', 'transparent', 'transparent'] as const;
    }
    return ['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)'] as const;
  }

  if (coverType === 'image') {
    return ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.52)'] as const;
  }

  return ['transparent', 'transparent', 'transparent'] as const;
}

export function coverMetaColor(textColor: string): string {
  if (isLightCoverText(textColor)) return 'rgba(255,255,255,0.88)';
  return `${textColor}CC`;
}
