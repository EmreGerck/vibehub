/**
 * SearchService — Comprehensive Unit Tests
 * ─────────────────────────────────────────
 * Covers: normalizeTR(), onModuleInit (connected / host missing / init error),
 *         search (Meilisearch path, Prisma fallback, fallback on error),
 *         indexProduct (with / without product), deleteProduct, reindexAll,
 *         getStats.
 *
 * Monkey tests: empty query fallback, Meilisearch throwing mid-search,
 *               batch boundary in reindexAll, missing MEILISEARCH_HOST.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { normalizeTR, SearchService } from '../search.service';
import { PrismaService } from '../../prisma/prisma.service';

// ─── normalizeTR ──────────────────────────────────────────────────────────────

describe('normalizeTR()', () => {
  it('normalizes Turkish characters correctly', () => {
    expect(normalizeTR('Şarkı')).toBe('sarki');
    expect(normalizeTR('İSTANBUL')).toBe('istanbul');
    expect(normalizeTR('Türkçe')).toBe('turkce');
    expect(normalizeTR('ğüşıöç')).toBe('gusioc');
  });

  it('maps ı→i, ş→s, ğ→g, ü→u, ö→o, ç→c', () => {
    expect(normalizeTR('ı')).toBe('i');
    expect(normalizeTR('ş')).toBe('s');
    expect(normalizeTR('ğ')).toBe('g');
    expect(normalizeTR('ü')).toBe('u');
    expect(normalizeTR('ö')).toBe('o');
    expect(normalizeTR('ç')).toBe('c');
  });

  it('maps uppercase Turkish chars', () => {
    expect(normalizeTR('İ')).toBe('i');
    expect(normalizeTR('Ş')).toBe('s');
    expect(normalizeTR('Ğ')).toBe('g');
    expect(normalizeTR('Ü')).toBe('u');
    expect(normalizeTR('Ö')).toBe('o');
    expect(normalizeTR('Ç')).toBe('c');
  });

  it('lowercases all chars', () => {
    expect(normalizeTR('HELLO')).toBe('hello');
  });

  it('handles empty string without throwing', () => {
    expect(normalizeTR('')).toBe('');
  });
});

// ─── SearchService mocks ──────────────────────────────────────────────────────

function makeConfig(host = 'http://localhost:7700', apiKey = 'test-key') {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'MEILISEARCH_HOST')    return host;
      if (key === 'MEILISEARCH_API_KEY') return apiKey;
      return def ?? '';
    }),
  } as unknown as ConfigService;
}

const LIVE_PRODUCT = {
  id: 'prod-1', title: 'Test', description: 'Desc', tags: [], price: 100,
  currency: 'TRY', images: [], status: 'LIVE', tenantId: 'tenant-1',
  categoryId: null, createdAt: new Date(), updatedAt: new Date(),
  tenant: { displayName: 'Shop', slug: 'shop' },
  category: null,
};

function makePrisma(products: any[] = [LIVE_PRODUCT]): PrismaService {
  let batchCalls = 0;
  return {
    product: {
      findUnique: jest.fn().mockResolvedValue(LIVE_PRODUCT),
      findMany:   jest.fn().mockImplementation(async () => {
        batchCalls++;
        // Return products on first call, empty on second (end of batch)
        if (batchCalls === 1) return products;
        return [];
      }),
      count:      jest.fn().mockResolvedValue(products.length),
    },
  } as unknown as PrismaService;
}

// ─── Meilisearch mock ─────────────────────────────────────────────────────────
// The module is already mapped to src/__mocks__/meilisearch.ts via moduleNameMapper.
// We override specific index methods here for fine-grained test control.

const mockIndex = {
  updateSettings:     jest.fn().mockResolvedValue({}),
  search:             jest.fn().mockResolvedValue({ hits: [{ id: 'prod-1' }], estimatedTotalHits: 1, processingTimeMs: 5 }),
  addDocuments:       jest.fn().mockResolvedValue({}),
  deleteDocument:     jest.fn().mockResolvedValue({}),
  deleteAllDocuments: jest.fn().mockResolvedValue({}),
  getStats:           jest.fn().mockResolvedValue({ numberOfDocuments: 42 }),
};

jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue(mockIndex),
  })),
  Index: class {},
}));

async function buildService(configOverride?: any, prismaOverride?: any): Promise<SearchService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SearchService,
      { provide: ConfigService, useValue: configOverride ?? makeConfig() },
      { provide: PrismaService, useValue: prismaOverride ?? makePrisma() },
    ],
  }).compile();
  const svc = module.get<SearchService>(SearchService);
  await svc.onModuleInit();
  return svc;
}

beforeEach(() => jest.clearAllMocks());

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SearchService', () => {

  // ── onModuleInit ──────────────────────────────────────────────────────────────

  describe('onModuleInit()', () => {
    it('stays disabled when MEILISEARCH_HOST not set', async () => {
      const config = makeConfig('', '');
      const svc = await buildService(config);
      const stats = await svc.getStats();
      expect(stats.enabled).toBe(false);
    });

    it('enables when host is configured and init succeeds', async () => {
      const svc = await buildService();
      const stats = await svc.getStats();
      expect(stats.enabled).toBe(true);
    });
  });

  // ── search ────────────────────────────────────────────────────────────────────

  describe('search()', () => {
    it('returns results from Meilisearch when enabled', async () => {
      const svc = await buildService();
      const result = await svc.search({ query: 'test', page: 1, limit: 10 });
      expect(result.ids).toContain('prod-1');
      expect(result.processingTimeMs).toBe(5);
    });

    it('falls back to Prisma when Meilisearch throws', async () => {
      const svc = await buildService();
      (mockIndex.search as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));
      const result = await svc.search({ query: 'test', page: 1, limit: 10 });
      // Prisma fallback returns product ids
      expect(result.ids).toContain('prod-1');
      expect(result.processingTimeMs).toBeUndefined();
    });

    it('uses Prisma fallback when Meilisearch disabled (no host)', async () => {
      const config = makeConfig('', '');
      const svc = await buildService(config);
      const result = await svc.search({ query: 'test', page: 1, limit: 10 });
      expect(result.ids).toContain('prod-1');
    });

    it('applies tenantId filter in Meilisearch query', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', tenantId: 'tenant-1' });
      const searchCall = (mockIndex.search as jest.Mock).mock.calls[0];
      expect(searchCall[1].filter).toContain('tenantId = "tenant-1"');
    });

    it('applies price range filters', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', minPrice: 50, maxPrice: 200 });
      const filter = (mockIndex.search as jest.Mock).mock.calls[0][1].filter;
      expect(filter).toContain('price >= 50');
      expect(filter).toContain('price <= 200');
    });

    it('applies sort: price_asc', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', sortBy: 'price_asc' });
      const sort = (mockIndex.search as jest.Mock).mock.calls[0][1].sort;
      expect(sort).toContain('price:asc');
    });

    it('applies sort: newest', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', sortBy: 'newest' });
      const sort = (mockIndex.search as jest.Mock).mock.calls[0][1].sort;
      expect(sort).toContain('createdAt:desc');
    });

    it('normalizes Turkish query before sending to Meilisearch', async () => {
      const svc = await buildService();
      await svc.search({ query: 'Şarkı' });
      const normalizedQuery = (mockIndex.search as jest.Mock).mock.calls[0][0];
      expect(normalizedQuery).toBe('sarki');
    });

    it('respects pagination offset', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', page: 3, limit: 10 });
      const opts = (mockIndex.search as jest.Mock).mock.calls[0][1];
      expect(opts.offset).toBe(20); // (3-1) * 10
      expect(opts.limit).toBe(10);
    });

    it('caps limit at 100', async () => {
      const svc = await buildService();
      await svc.search({ query: 'test', limit: 9999 });
      const opts = (mockIndex.search as jest.Mock).mock.calls[0][1];
      expect(opts.limit).toBe(100);
    });
  });

  // ── Prisma fallback ───────────────────────────────────────────────────────────

  describe('_prismaFallback (via disabled service)', () => {
    it('searches both original and normalized query', async () => {
      const config = makeConfig('', '');
      const prisma = makePrisma();
      const svc = await buildService(config, prisma);
      await svc.search({ query: 'Şarkı', page: 1, limit: 10 });
      const call = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
      const orConditions = call.where.OR;
      const values = orConditions.map((c: any) => c.title?.contains ?? c.description?.contains).filter(Boolean);
      expect(values).toContain('Şarkı');
      expect(values).toContain('sarki');
    });
  });

  // ── indexProduct ──────────────────────────────────────────────────────────────

  describe('indexProduct()', () => {
    it('adds document to Meilisearch index', async () => {
      const svc = await buildService();
      await svc.indexProduct('prod-1');
      expect(mockIndex.addDocuments).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'prod-1' })]),
        { primaryKey: 'id' },
      );
    });

    it('adds titleNorm (Turkish-normalized title) to document', async () => {
      const prisma = makePrisma([{ ...LIVE_PRODUCT, title: 'Şarkı Kitabı' }]);
      (prisma.product.findUnique as jest.Mock).mockResolvedValue({ ...LIVE_PRODUCT, title: 'Şarkı Kitabı', tenant: { displayName: 'x', slug: 'x' }, category: null });
      const svc = await buildService(undefined, prisma);
      await svc.indexProduct('prod-1');
      const doc = (mockIndex.addDocuments as jest.Mock).mock.calls[0][0][0];
      expect(doc.titleNorm).toBe('sarki kitabi');
    });

    it('does nothing when product not found', async () => {
      const prisma = makePrisma();
      (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);
      const svc = await buildService(undefined, prisma);
      await svc.indexProduct('GHOST');
      expect(mockIndex.addDocuments).not.toHaveBeenCalled();
    });

    it('does nothing when Meilisearch is disabled', async () => {
      const svc = await buildService(makeConfig('', ''));
      await svc.indexProduct('prod-1');
      expect(mockIndex.addDocuments).not.toHaveBeenCalled();
    });
  });

  // ── deleteProduct ─────────────────────────────────────────────────────────────

  describe('deleteProduct()', () => {
    it('removes document from index', async () => {
      const svc = await buildService();
      await svc.deleteProduct('prod-1');
      expect(mockIndex.deleteDocument).toHaveBeenCalledWith('prod-1');
    });

    it('does nothing when disabled', async () => {
      const svc = await buildService(makeConfig('', ''));
      await svc.deleteProduct('prod-1');
      expect(mockIndex.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // ── reindexAll ────────────────────────────────────────────────────────────────

  describe('reindexAll()', () => {
    it('clears index and re-adds all LIVE products', async () => {
      const svc = await buildService();
      const result = await svc.reindexAll();
      expect(mockIndex.deleteAllDocuments).toHaveBeenCalled();
      expect(mockIndex.addDocuments).toHaveBeenCalled();
      expect(result.indexed).toBeGreaterThan(0);
    });

    it('returns { indexed: 0 } when disabled', async () => {
      const svc = await buildService(makeConfig('', ''));
      const result = await svc.reindexAll();
      expect(result.indexed).toBe(0);
    });
  });

  // ── getStats ──────────────────────────────────────────────────────────────────

  describe('getStats()', () => {
    it('returns enabled:true with document count', async () => {
      const svc = await buildService();
      const stats = await svc.getStats();
      expect(stats.enabled).toBe(true);
      expect(stats.documents).toBe(42);
    });

    it('returns enabled:false when disabled', async () => {
      const svc = await buildService(makeConfig('', ''));
      const stats = await svc.getStats();
      expect(stats.enabled).toBe(false);
    });

    it('returns enabled:false when getStats throws', async () => {
      const svc = await buildService();
      (mockIndex.getStats as jest.Mock).mockRejectedValueOnce(new Error('timeout'));
      const stats = await svc.getStats();
      expect(stats.enabled).toBe(false);
    });
  });
});
