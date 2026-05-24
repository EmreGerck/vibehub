/**
 * SearchService — Meilisearch entegrasyonu
 * ─────────────────────────────────────────
 * Türkçe karakter desteği (ı→i, ş→s, ğ→g, ç→c, ö→o, ü→u),
 * fuzzy search, typo-tolerance ve instant-search.
 *
 * MEILISEARCH_HOST yoksa → Prisma LIKE fallback'e düşer.
 * Yani self-host Meilisearch kurulmadan da sistem çalışmaya devam eder.
 *
 * Docker compose'a eklemek için:
 *   meilisearch:
 *     image: getmeili/meilisearch:v1.7
 *     ports: ["7700:7700"]
 *     environment:
 *       MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
 *     volumes: [meilisearch_data:/meili_data]
 *
 * .env:
 *   MEILISEARCH_HOST=http://localhost:7700
 *   MEILISEARCH_API_KEY=your_master_key
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Meilisearch as MeiliSearch, Index } from 'meilisearch';
import { PrismaService } from '../prisma/prisma.service';

// ─── Document shape stored in Meilisearch ───────────────────────────────────

export interface ProductDocument {
  id:           string;
  title:        string;
  titleNorm:    string;   // Türkçe normalize edilmiş (ı→i, ş→s …)
  description:  string;
  tags:         string[];
  price:        number;
  currency:     string;
  images:       string[];
  status:       string;
  tenantId:     string;
  vendorName:   string;
  vendorSlug:   string;
  categoryId:   string | null;
  categoryName: string | null;
  createdAt:    number;  // unix timestamp for sorting
}

// ─── Turkish normalization ────────────────────────────────────────────────────

export function normalizeTR(str: string): string {
  // Replace uppercase Turkish chars FIRST — before toLowerCase()
  // because İ.toLowerCase() in Node produces 'i̇' (i + combining dot U+0307), not 'i'
  return str
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c')
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

// ─── Service ──────────────────────────────────────────────────────────────────

const INDEX_NAME = 'products';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client:  MeiliSearch | null = null;
  private index:   Index | null = null;
  private enabled: boolean = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const host   = this.config.get<string>('MEILISEARCH_HOST', '');
    const apiKey = this.config.get<string>('MEILISEARCH_API_KEY', '');

    if (!host) {
      this.logger.warn('[Search] MEILISEARCH_HOST not set — running in Prisma LIKE fallback mode.');
      return;
    }

    try {
      this.client  = new MeiliSearch({ host, apiKey });
      this.index   = this.client.index(INDEX_NAME);
      this.enabled = true;

      // Configure index settings — Türkçe dil desteği
      await this.index.updateSettings({
        searchableAttributes: ['title', 'titleNorm', 'description', 'tags', 'vendorName'],
        filterableAttributes: ['status', 'tenantId', 'categoryId', 'currency'],
        sortableAttributes:   ['price', 'createdAt'],
        rankingRules: [
          'words', 'typo', 'proximity', 'attribute', 'sort', 'exactness',
        ],
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
        },
        // Türkçe karakterleri birbirine eşdeğer say
        synonyms: {
          'i': ['ı'], 'ı': ['i'],
          'g': ['ğ'], 'ğ': ['g'],
          'u': ['ü'], 'ü': ['u'],
          's': ['ş'], 'ş': ['s'],
          'o': ['ö'], 'ö': ['o'],
          'c': ['ç'], 'ç': ['c'],
        },
        pagination: { maxTotalHits: 10000 },
      });

      this.logger.log(`[Search] Meilisearch connected at ${host} — index: ${INDEX_NAME}`);
    } catch (err) {
      this.logger.error(`[Search] Meilisearch init failed: ${err.message} — falling back to Prisma LIKE`);
      this.enabled = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Search
  // ─────────────────────────────────────────────────────────────────────────────

  async search(params: {
    query: string;
    tenantId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    sortBy?: 'price_asc' | 'price_desc' | 'newest';
    page?: number;
    limit?: number;
  }): Promise<{ ids: string[]; total: number; processingTimeMs?: number }> {
    const page  = params.page  ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);

    if (!this.enabled || !this.index) {
      return this._prismaFallback(params);
    }

    try {
      const filters: string[] = ['status = "LIVE"'];
      if (params.tenantId)   filters.push(`tenantId = "${params.tenantId}"`);
      if (params.categoryId) filters.push(`categoryId = "${params.categoryId}"`);
      if (params.currency)   filters.push(`currency = "${params.currency}"`);
      if (params.minPrice !== undefined) filters.push(`price >= ${params.minPrice}`);
      if (params.maxPrice !== undefined) filters.push(`price <= ${params.maxPrice}`);

      const sort: string[] = [];
      if      (params.sortBy === 'price_asc')  sort.push('price:asc');
      else if (params.sortBy === 'price_desc') sort.push('price:desc');
      else if (params.sortBy === 'newest')     sort.push('createdAt:desc');

      // Normalize the query for Turkish char matching
      const normalizedQuery = normalizeTR(params.query);

      const result = await this.index.search(normalizedQuery, {
        filter:           filters.join(' AND '),
        sort:             sort.length ? sort : undefined,
        offset:           (page - 1) * limit,
        limit,
        attributesToRetrieve: ['id'],
      });

      return {
        ids:              result.hits.map((h: any) => h.id),
        total:            result.estimatedTotalHits ?? result.hits.length,
        processingTimeMs: result.processingTimeMs,
      };
    } catch (err) {
      this.logger.error(`[Search] Meilisearch search failed: ${err.message} — falling back to Prisma`);
      return this._prismaFallback(params);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Index management
  // ─────────────────────────────────────────────────────────────────────────────

  /** Index a single product (call after create/update/approve). */
  async indexProduct(productId: string): Promise<void> {
    if (!this.enabled || !this.index) return;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        tenant:   { select: { displayName: true, slug: true } },
        category: { select: { name: true } },
      },
    });

    if (!product) return;

    const doc: ProductDocument = {
      id:           product.id,
      title:        product.title,
      titleNorm:    normalizeTR(product.title),
      description:  product.description ?? '',
      tags:         product.tags ?? [],
      price:        Number(product.price),
      currency:     product.currency,
      images:       (product.images as string[]) ?? [],
      status:       product.status,
      tenantId:     product.tenantId,
      vendorName:   product.tenant?.displayName ?? '',
      vendorSlug:   product.tenant?.slug ?? '',
      categoryId:   product.categoryId,
      categoryName: product.category?.name ?? null,
      createdAt:    Math.floor(product.createdAt.getTime() / 1000),
    };

    await this.index.addDocuments([doc], { primaryKey: 'id' });
    this.logger.log(`[Search] Indexed product ${productId}`);
  }

  /** Remove a product from the index (after archive/reject). */
  async deleteProduct(productId: string): Promise<void> {
    if (!this.enabled || !this.index) return;
    await this.index.deleteDocument(productId);
    this.logger.log(`[Search] Removed product ${productId} from index`);
  }

  /** Full reindex — run after bulk data changes or first deploy. */
  async reindexAll(): Promise<{ indexed: number }> {
    if (!this.enabled || !this.index) {
      this.logger.warn('[Search] Meilisearch not available — reindex skipped');
      return { indexed: 0 };
    }

    this.logger.log('[Search] Starting full reindex...');

    // Clear existing index
    await this.index.deleteAllDocuments();

    const BATCH = 100;
    let skip = 0;
    let indexed = 0;

    while (true) {
      const products = await this.prisma.product.findMany({
        where:   { status: 'LIVE' },
        skip,
        take:    BATCH,
        include: {
          tenant:   { select: { displayName: true, slug: true } },
          category: { select: { name: true } },
        },
      });

      if (products.length === 0) break;

      const docs: ProductDocument[] = products.map(p => ({
        id:           p.id,
        title:        p.title,
        titleNorm:    normalizeTR(p.title),
        description:  p.description ?? '',
        tags:         p.tags ?? [],
        price:        Number(p.price),
        currency:     p.currency,
        images:       (p.images as string[]) ?? [],
        status:       p.status,
        tenantId:     p.tenantId,
        vendorName:   p.tenant?.displayName ?? '',
        vendorSlug:   p.tenant?.slug ?? '',
        categoryId:   p.categoryId,
        categoryName: p.category?.name ?? null,
        createdAt:    Math.floor(p.createdAt.getTime() / 1000),
      }));

      await this.index.addDocuments(docs, { primaryKey: 'id' });
      indexed += docs.length;
      skip += BATCH;
    }

    this.logger.log(`[Search] Reindex complete — ${indexed} products indexed`);
    return { indexed };
  }

  async getStats(): Promise<{ enabled: boolean; documents?: number; host?: string }> {
    if (!this.enabled || !this.index) return { enabled: false };
    try {
      const stats = await this.index.getStats();
      return {
        enabled:   true,
        documents: stats.numberOfDocuments,
        host:      this.config.get('MEILISEARCH_HOST'),
      };
    } catch {
      return { enabled: false };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Prisma fallback
  // ─────────────────────────────────────────────────────────────────────────────

  private async _prismaFallback(params: {
    query: string;
    tenantId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
  }): Promise<{ ids: string[]; total: number }> {
    const page  = params.page  ?? 1;
    const limit = params.limit ?? 20;

    // Normalize query for Türkçe-aware LIKE
    const q    = params.query.trim();
    const qNorm = normalizeTR(q);

    const where: any = {
      status: 'LIVE',
      OR: [
        { title:       { contains: q,     mode: 'insensitive' } },
        { title:       { contains: qNorm, mode: 'insensitive' } },
        { description: { contains: q,     mode: 'insensitive' } },
        { description: { contains: qNorm, mode: 'insensitive' } },
      ],
    };

    if (params.tenantId)   where.tenantId   = params.tenantId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) where.price.gte = params.minPrice;
      if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { ids: items.map(p => p.id), total };
  }
}
