export function formatPrice(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '₺0,00';
  return '₺' + num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BRAND_COLORS: Record<string, [string, string]> = {
  tekir:  ['#7c3aed', '#a855f7'],
  kalt:   ['#2563eb', '#06b6d4'],
  modexl: ['#dc2626', '#f97316'],
  'mode-xl': ['#dc2626', '#f97316'],
};

export function brandGradient(slug?: string | null): string {
  const key = slug?.toLowerCase().replace(/\s+/g, '') ?? '';
  for (const [k, [from, to]] of Object.entries(BRAND_COLORS)) {
    if (key.includes(k)) return `linear-gradient(135deg, ${from}, ${to})`;
  }
  return 'linear-gradient(135deg, #6366f1, #a855f7)';
}
