export const DISCIPLINE_IMAGE_OPTIONS = [
  { key: 'bjj', label: 'BJJ (Gi)', src: '/disciplinas/bjj.webp' },
  { key: 'grappling', label: 'Grappling / No-Gi', src: '/disciplinas/grappling.webp' },
  { key: 'mma', label: 'MMA', src: '/disciplinas/mma.webp' },
  { key: 'lucha', label: 'Lucha Olímpica', src: '/disciplinas/lucha.webp' },
  { key: 'kids', label: 'Kids', src: '/disciplinas/kids.webp' },
] as const;

export type DisciplineImageKey = (typeof DISCIPLINE_IMAGE_OPTIONS)[number]['key'];

export function getDisciplineImage(
  slug?: string,
  title?: string,
  imageKey?: string | null
): string {
  if (imageKey) {
    const custom = DISCIPLINE_IMAGE_OPTIONS.find((opt) => opt.key === imageKey);
    if (custom) return custom.src;
  }

  const t = (title ?? '').toLowerCase();
  if (slug === 'mma' || t.includes('mma')) return '/disciplinas/mma.webp';
  if (slug === 'lucha' || t.includes('lucha')) return '/disciplinas/lucha.webp';
  if (slug === 'kids-1' || slug === 'kids-2' || t.includes('kids')) return '/disciplinas/kids.webp';
  if (t.includes('grappling') || t.includes('open mat')) return '/disciplinas/grappling.webp';
  return '/disciplinas/bjj.webp';
}
