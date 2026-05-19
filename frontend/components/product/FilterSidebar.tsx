'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../lib/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Shared filter primitives — used by both desktop sidebar and mobile drawer
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterValues {
  tenantId: string | null;
  minPrice?: number;
  maxPrice?: number;
  tags: string[];
  sizes: string[];
  colors: string[];
  gender: string | null;
  materials: string[];
  availability: 'in' | 'out' | null;
  rating: number | null;
  onSale: boolean;
  newOnly: boolean;
  trending: boolean;
  limited: boolean;
}

export const DEFAULT_FILTERS: FilterValues = {
  tenantId: null,
  minPrice: undefined,
  maxPrice: undefined,
  tags: [],
  sizes: [],
  colors: [],
  gender: null,
  materials: [],
  availability: null,
  rating: null,
  onSale: false,
  newOnly: false,
  trending: false,
  limited: false,
};

export function countActiveFilters(f: FilterValues): number {
  let n = 0;
  if (f.tenantId) n++;
  if (f.minPrice != null) n++;
  if (f.maxPrice != null) n++;
  n += f.tags.length + f.sizes.length + f.colors.length + f.materials.length;
  if (f.gender) n++;
  if (f.availability) n++;
  if (f.rating) n++;
  if (f.onSale) n++;
  if (f.newOnly) n++;
  if (f.trending) n++;
  if (f.limited) n++;
  return n;
}

interface Vendor {
  id: string;
  displayName: string;
  status: string;
}

interface Props {
  vendors: Vendor[];
  allTags: string[];
  values: FilterValues;
  onChange: (next: FilterValues) => void;
  /** Mobile drawer mode */
  mobile?: boolean;
  /** Mobile drawer open state — only used when mobile=true */
  open?: boolean;
  onClose?: () => void;
  /** Total result count to display in mobile "Apply" button */
  resultsCount?: number;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS: { name: string; hex: string }[] = [
  { name: 'Black',   hex: '#0a0a0a' },
  { name: 'White',   hex: '#ffffff' },
  { name: 'Purple',  hex: '#9333ea' },
  { name: 'Pink',    hex: '#ec4899' },
  { name: 'Red',     hex: '#ef4444' },
  { name: 'Blue',    hex: '#3b82f6' },
  { name: 'Green',   hex: '#10b981' },
  { name: 'Yellow',  hex: '#f59e0b' },
  { name: 'Gray',    hex: '#6b7280' },
  { name: 'Beige',   hex: '#d6b88a' },
];
const MATERIALS = ['Cotton', 'Polyester', 'Wool', 'Vinyl', 'Denim', 'Fleece'];
const GENDERS: { value: string; key: string }[] = [
  { value: 'unisex', key: 'shop.unisex' },
  { value: 'men',    key: 'shop.men' },
  { value: 'women',  key: 'shop.women' },
  { value: 'kids',   key: 'shop.kids' },
];

export function FilterSidebar(props: Props) {
  const { mobile = false, open = false, onClose, resultsCount } = props;

  // Mobile drawer is rendered as an overlay
  if (mobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
            open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={onClose}
        />
        {/* Drawer */}
        <aside
          className={`fixed left-0 top-0 z-[61] h-full w-[85%] max-w-sm bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-out-expo lg:hidden ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!open}
        >
          <DrawerHeader onClose={onClose} />
          <div className="overflow-y-auto pretty-scrollbar h-[calc(100%-128px)] px-5 pt-2 pb-6">
            <FilterContent {...props} />
          </div>
          <DrawerFooter
            values={props.values}
            onChange={props.onChange}
            onClose={onClose}
            resultsCount={resultsCount}
          />
        </aside>
      </>
    );
  }

  // Desktop sidebar (sticky)
  return (
    <aside className="hidden lg:block w-72 shrink-0 self-start sticky top-20">
      <div className="card p-5 max-h-[calc(100vh-110px)] overflow-y-auto pretty-scrollbar animate-fade-in-up">
        <DesktopHeader values={props.values} onChange={props.onChange} />
        <FilterContent {...props} />
      </div>
    </aside>
  );
}

function DesktopHeader({ values, onChange }: { values: FilterValues; onChange: (n: FilterValues) => void }) {
  const t = useI18n((s) => s.t);
  const count = countActiveFilters(values);
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-gray-900 dark:text-white">{t('shop.refine')}</h2>
        {count > 0 && (
          <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white animate-pop">
            {count}
          </span>
        )}
      </div>
      {count > 0 && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline transition-colors"
        >
          {t('shop.resetAll')}
        </button>
      )}
    </div>
  );
}

function DrawerHeader({ onClose }: { onClose?: () => void }) {
  const t = useI18n((s) => s.t);
  return (
    <div className="h-16 px-5 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
      <h2 className="font-semibold text-gray-900 dark:text-white text-lg">{t('shop.filters')}</h2>
      <button
        onClick={onClose}
        className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Close"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function DrawerFooter({
  values,
  onChange,
  onClose,
  resultsCount,
}: {
  values: FilterValues;
  onChange: (n: FilterValues) => void;
  onClose?: () => void;
  resultsCount?: number;
}) {
  const t = useI18n((s) => s.t);
  const count = countActiveFilters(values);
  return (
    <div className="absolute left-0 right-0 bottom-0 px-5 py-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur flex items-center gap-2">
      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="btn-secondary py-2 text-sm flex-1"
        disabled={count === 0}
      >
        {t('shop.resetAll')}
      </button>
      <button
        onClick={onClose}
        className="btn-primary py-2 text-sm flex-[1.4]"
      >
        {t('shop.applyFilters')}
        {resultsCount != null && (
          <span className="ml-1.5 inline-block bg-white/20 px-1.5 py-0.5 rounded-md text-[11px]">
            {resultsCount}
          </span>
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The shared filter sections
// ─────────────────────────────────────────────────────────────────────────────

function FilterContent({ vendors, allTags, values, onChange }: Props) {
  const t = useI18n((s) => s.t);
  const update = useCallback(
    (patch: Partial<FilterValues>) => onChange({ ...values, ...patch }),
    [values, onChange],
  );

  const toggleArr = (key: keyof FilterValues, value: string) => {
    const cur = (values[key] as string[]) ?? [];
    const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    update({ [key]: next } as any);
  };

  return (
    <div className="space-y-1">
      {/* Quick toggles */}
      <Section title="" defaultOpen noChevron>
        <div className="flex flex-wrap gap-2">
          <Chip active={values.newOnly} onClick={() => update({ newOnly: !values.newOnly })} icon="sparkle">
            {t('shop.newArrivals')}
          </Chip>
          <Chip active={values.trending} onClick={() => update({ trending: !values.trending })} icon="flame">
            {t('shop.trending')}
          </Chip>
          <Chip active={values.onSale} onClick={() => update({ onSale: !values.onSale })} icon="tag">
            {t('shop.onSale')}
          </Chip>
          <Chip active={values.limited} onClick={() => update({ limited: !values.limited })} icon="star">
            {t('shop.limitedEdition')}
          </Chip>
        </div>
      </Section>

      {/* Artist / vendor */}
      <Section title={t('shop.artist')} defaultOpen searchable>
        {(query) => (
          <VendorList
            vendors={vendors}
            query={query}
            selected={values.tenantId}
            onSelect={(id) => update({ tenantId: values.tenantId === id ? null : id })}
          />
        )}
      </Section>

      {/* Price range with histogram bars */}
      <Section title={t('shop.priceRange')} defaultOpen>
        <PriceRange
          min={values.minPrice}
          max={values.maxPrice}
          onChange={(min, max) => update({ minPrice: min, maxPrice: max })}
        />
      </Section>

      {/* Size */}
      <Section title={t('shop.size')} defaultOpen>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((s) => {
            const active = values.sizes.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleArr('sizes', s)}
                className={`h-10 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-[1.02]'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Color swatches */}
      <Section title={t('shop.color')}>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const active = values.colors.includes(c.name);
            return (
              <button
                key={c.name}
                onClick={() => toggleArr('colors', c.name)}
                aria-label={c.name}
                className="group relative"
              >
                <span
                  className={`block h-9 w-9 rounded-full border-2 transition-all duration-200 ${
                    active
                      ? 'border-purple-500 scale-110 shadow-lg shadow-purple-500/30'
                      : 'border-gray-300 dark:border-gray-700 hover:scale-110'
                  }`}
                  style={{ background: c.hex }}
                />
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pop">
                    <CheckIcon className={c.name === 'White' || c.name === 'Beige' || c.name === 'Yellow' ? 'text-gray-900' : 'text-white'} />
                  </span>
                )}
                <span className="absolute left-1/2 -translate-x-1/2 -bottom-7 text-[10px] font-medium text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Gender */}
      <Section title={t('shop.gender')}>
        <div className="grid grid-cols-2 gap-2">
          {GENDERS.map((g) => {
            const active = values.gender === g.value;
            return (
              <button
                key={g.value}
                onClick={() => update({ gender: active ? null : g.value })}
                className={`h-10 rounded-xl text-sm font-medium transition-all duration-200 active:scale-95 ${
                  active
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t(g.key)}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Material */}
      <Section title={t('shop.material')}>
        <CheckList items={MATERIALS} selected={values.materials} onToggle={(v) => toggleArr('materials', v)} />
      </Section>

      {/* Rating */}
      <Section title={t('shop.rating')}>
        <div className="space-y-1.5">
          {[4, 3, 2, 1].map((r) => {
            const active = values.rating === r;
            return (
              <button
                key={r}
                onClick={() => update({ rating: active ? null : r })}
                className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-colors text-sm ${
                  active
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} filled={i < r} />
                  ))}
                </span>
                <span className="text-xs">{t('shop.andUp')}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Availability */}
      <Section title={t('shop.availability')}>
        <div className="space-y-1.5">
          {(['in', 'out'] as const).map((opt) => {
            const active = values.availability === opt;
            return (
              <label
                key={opt}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  active
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  checked={active}
                  onChange={() => update({ availability: active ? null : opt })}
                />
                <span
                  className={`h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    active ? 'border-purple-600' : 'border-gray-400 dark:border-gray-600'
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-purple-600 animate-pop" />}
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {opt === 'in' ? t('shop.inStock') : t('shop.outOfStock')}
                </span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* Tags (from product data) */}
      {allTags.length > 0 && (
        <Section title={t('shop.tags')}>
          <TagList tags={allTags} selected={values.tags} onToggle={(v) => toggleArr('tags', v)} />
        </Section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible section
// ─────────────────────────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  searchable?: boolean;
  noChevron?: boolean;
  children: React.ReactNode | ((query: string) => React.ReactNode);
}

function Section({ title, defaultOpen = false, searchable = false, noChevron = false, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-b-0 py-2">
      {title && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full py-2 group"
        >
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            {title}
          </span>
          {!noChevron && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </button>
      )}
      <div
        ref={contentRef}
        className="grid transition-[grid-template-rows,opacity] duration-300 ease-out-expo"
        style={{
          gridTemplateRows: open ? '1fr' : '0fr',
          opacity: open ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          <div className="pt-2 pb-3 space-y-3">
            {searchable && (
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="input py-1.5 text-sm pl-8"
                />
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            )}
            {typeof children === 'function' ? children(query) : children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: 'flame' | 'sparkle' | 'tag' | 'star';
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 active:scale-95 ${
        active
          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30 scale-[1.04]'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {icon === 'flame' && <span aria-hidden>🔥</span>}
      {icon === 'sparkle' && <span aria-hidden>✨</span>}
      {icon === 'tag' && <span aria-hidden>🏷️</span>}
      {icon === 'star' && <span aria-hidden>⭐</span>}
      {children}
    </button>
  );
}

function VendorList({
  vendors,
  query,
  selected,
  onSelect,
}: {
  vendors: Vendor[];
  query: string;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const t = useI18n((s) => s.t);

  const filtered = useMemo(() => {
    const active = vendors.filter((v) => v.status === 'ACTIVE');
    const q = query.trim().toLowerCase();
    if (!q) return active;
    return active.filter((v) => v.displayName.toLowerCase().includes(q));
  }, [vendors, query]);

  const visible = showAll ? filtered : filtered.slice(0, 6);

  return (
    <div className="space-y-0.5">
      {visible.map((v, i) => {
        const active = selected === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all duration-150 animate-fade-in ${
              active
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            style={{ animationDelay: `${i * 18}ms` }}
          >
            <span className="truncate">{v.displayName}</span>
            {active && <CheckIcon className="text-purple-600 dark:text-purple-400 shrink-0" />}
          </button>
        );
      })}
      {filtered.length > 6 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          className="text-xs font-medium text-purple-600 dark:text-purple-400 px-3 py-1.5 hover:underline transition-colors"
        >
          {showAll ? t('shop.showLess') : `${t('shop.showMore')} (${filtered.length - 6})`}
        </button>
      )}
      {filtered.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-600 px-3 py-2">No matches</p>
      )}
    </div>
  );
}

function PriceRange({
  min,
  max,
  onChange,
}: {
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
}) {
  const t = useI18n((s) => s.t);
  const [localMin, setLocalMin] = useState(min?.toString() ?? '');
  const [localMax, setLocalMax] = useState(max?.toString() ?? '');

  useEffect(() => setLocalMin(min?.toString() ?? ''), [min]);
  useEffect(() => setLocalMax(max?.toString() ?? ''), [max]);

  const apply = () => {
    const n = (v: string) => (v === '' ? undefined : Number(v));
    onChange(n(localMin), n(localMax));
  };

  // Decorative histogram — gives a premium feel even without real distribution data
  const bars = useMemo(() => {
    const seed = [3, 6, 11, 18, 24, 28, 22, 15, 10, 6, 4, 3, 2, 2, 1];
    return seed.map((h) => h / 28);
  }, []);

  const minN = Number(localMin);
  const maxN = Number(localMax);
  const hasRange = !Number.isNaN(minN) || !Number.isNaN(maxN);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-px h-12 px-0.5">
        {bars.map((b, i) => {
          const pct = (i + 0.5) / bars.length;
          const inRange =
            hasRange &&
            (Number.isNaN(minN) || pct >= minN / 200) &&
            (Number.isNaN(maxN) || pct <= maxN / 200);
          return (
            <div
              key={i}
              className={`flex-1 rounded-t-sm transition-colors duration-300 ${
                inRange || !hasRange ? 'bg-gradient-to-t from-purple-500 to-pink-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              style={{ height: `${Math.max(8, b * 100)}%` }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          placeholder={t('shop.min')}
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="input py-1.5 text-sm flex-1"
        />
        <span className="text-gray-400 text-sm">–</span>
        <input
          type="number"
          min="0"
          placeholder={t('shop.max')}
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value)}
          onBlur={apply}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className="input py-1.5 text-sm flex-1"
        />
      </div>
    </div>
  );
}

function CheckList({
  items,
  selected,
  onToggle,
}: {
  items: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((it) => {
        const active = selected.includes(it);
        return (
          <label
            key={it}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => onToggle(it)}
              className="sr-only"
            />
            <span
              className={`h-4 w-4 rounded-md border-2 transition-all duration-200 flex items-center justify-center ${
                active
                  ? 'bg-purple-600 border-purple-600 scale-110'
                  : 'border-gray-300 dark:border-gray-600 group-hover:border-purple-400'
              }`}
            >
              {active && (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" className="animate-pop">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </span>
            <span className={`text-sm transition-colors ${active ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
              {it}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function TagList({
  tags,
  selected,
  onToggle,
}: {
  tags: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 active:scale-95 animate-fade-in ${
              active
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            style={{ animationDelay: `${i * 14}ms` }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? '#f59e0b' : 'none'}
      stroke={filled ? '#f59e0b' : 'currentColor'}
      strokeWidth="1.6"
      className={filled ? '' : 'text-gray-400 dark:text-gray-600'}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
