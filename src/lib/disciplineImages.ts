export function getDisciplineImage(slug?: string, title?: string): string {
  const t = (title ?? '').toLowerCase();
  if (slug === 'mma' || t.includes('mma')) return '/disciplinas/mma.webp';
  if (slug === 'lucha' || t.includes('lucha')) return '/disciplinas/lucha.webp';
  if (slug === 'kids-1' || slug === 'kids-2' || t.includes('kids')) return '/disciplinas/kids.webp';
  if (t.includes('grappling') || t.includes('open mat')) return '/disciplinas/grappling.webp';
  return '/disciplinas/bjj.webp';
}

