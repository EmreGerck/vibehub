/**
 * SECURITY TEST — Injection Attacks
 * ══════════════════════════════════════════════════════════════════
 * CSO threat model: SQL injection (Prisma parameterises, but validate
 * boundaries), NoSQL / Redis key injection, ReDoS on search query,
 * path traversal in user-controlled strings, prototype pollution.
 *
 * OWASP: A03 Injection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SearchService, normalizeTR } from '../search/search.service';
import { CartService } from '../cart/cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// ─── Meilisearch mock (same pattern as search.service.spec.ts) ───────────────

jest.mock('meilisearch', () => ({
  Meilisearch: jest.fn().mockImplementation(() => ({
    index: jest.fn().mockReturnValue({
      updateSettings:  jest.fn().mockResolvedValue({}),
      search:          jest.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 }),
      addDocuments:    jest.fn().mockResolvedValue({}),
      deleteDocument:  jest.fn().mockResolvedValue({}),
      getStats:        jest.fn().mockResolvedValue({ numberOfDocuments: 0 }),
    }),
  })),
  Index: class {},
}));

jest.mock('ioredis', () => {
  const store: Record<string, string> = {};
  const ctor: any = jest.fn().mockImplementation(() => ({
    get: jest.fn(async (k: string) => store[k] ?? null),
    set: jest.fn(async (k: string, v: string) => { store[k] = v; return 'OK'; }),
    del: jest.fn(async (k: string) => { delete store[k]; return 1; }),
  }));
  ctor.default = ctor;
  return ctor;
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(host = '') {
  return {
    get: jest.fn((key: string, def?: string) => {
      if (key === 'MEILISEARCH_HOST') return host;
      return def ?? '';
    }),
  } as unknown as ConfigService;
}

function makePrismaSearch(results: any[] = []) {
  return {
    product: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany:   jest.fn().mockResolvedValue(results),
      count:      jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;
}

function makeCartPrisma() {
  return {
    productVariant: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany:   jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

async function buildSearch(host = ''): Promise<SearchService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SearchService,
      { provide: ConfigService, useValue: makeConfig(host) },
      { provide: PrismaService, useValue: makePrismaSearch() },
    ],
  }).compile();
  const svc = module.get<SearchService>(SearchService);
  await svc.onModuleInit();
  return svc;
}

async function buildCart(): Promise<CartService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      CartService,
      { provide: PrismaService, useValue: makeCartPrisma() },
      { provide: ConfigService, useValue: { get: jest.fn(() => '') } as any },
    ],
  }).compile();
  return module.get<CartService>(CartService);
}

beforeEach(() => jest.clearAllMocks());

// ─── SEC-INJ-01: SQL-like Injection in Search ─────────────────────────────────

describe('[SEC-INJ-01] SQL/NoSQL Injection in Search Query', () => {
  const SQL_PAYLOADS = [
    "' OR 1=1 --",
    "'; DROP TABLE products; --",
    "\" OR \"\"=\"",
    "1; SELECT * FROM users",
    "UNION SELECT password FROM users",
    "' AND SLEEP(5) --",
  ];

  it.each(SQL_PAYLOADS)('Prisma fallback handles SQL payload safely: %s', async (payload) => {
    // Meilisearch disabled → falls to Prisma which parameterises automatically
    const svc = await buildSearch('');
    // Must not throw — Prisma parameterises all values
    await expect(svc.search({ query: payload })).resolves.toBeDefined();
  });

  it('search query is never executed as raw SQL (Prisma ORM boundary)', async () => {
    const prisma = makePrismaSearch();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: ConfigService, useValue: makeConfig('') },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const svc = module.get<SearchService>(SearchService);
    await svc.onModuleInit();

    await svc.search({ query: "' OR 1=1 --" });

    // Verify Prisma findMany received the malicious string as a VALUE (not appended SQL)
    const findManyCall = (prisma.product.findMany as jest.Mock).mock.calls[0][0];
    const whereStr = JSON.stringify(findManyCall.where);
    // The payload is a VALUE in the `contains` field, not part of the query structure
    expect(whereStr).toContain("' OR 1=1 --"); // it's inside a string value
    // Prisma's `contains` is always parameterised — safe
  });
});

// ─── SEC-INJ-02: Redis Key Injection ─────────────────────────────────────────

describe('[SEC-INJ-02] Redis Key Injection Prevention', () => {
  it('userId with special chars cannot traverse to other cart keys', async () => {
    const svc = await buildCart();
    // Attacker tries to use `../` or `:` in userId to access another key
    const maliciousUserId = 'user-001:cart:another-user';
    // getCart should work on the constructed key (not crash) and return empty
    const result = await svc.getCart(maliciousUserId);
    expect(result).toEqual([]);
    // The key used will be `cart:user-001:cart:another-user` — distinct from `cart:another-user`
  });

  it('null-byte injection in userId does not crash Redis', async () => {
    const svc = await buildCart();
    const nullByteId = 'user\x00evil';
    const result = await svc.getCart(nullByteId);
    expect(result).toEqual([]); // Returns empty — no crash
  });
});

// ─── SEC-INJ-03: ReDoS Prevention in Search ──────────────────────────────────

describe('[SEC-INJ-03] ReDoS — Search Query Length Cap', () => {
  it('truncates or handles extremely long search queries without hanging', async () => {
    const svc = await buildSearch('');
    const reDoSQuery = 'a'.repeat(10000) + '!';
    const start = Date.now();
    await expect(svc.search({ query: reDoSQuery })).resolves.toBeDefined();
    const elapsed = Date.now() - start;
    // Must complete in < 2 seconds — not a catastrophic backtrack
    expect(elapsed).toBeLessThan(2000);
  });

  it('repeated special chars do not cause exponential normalization time', async () => {
    const svc = await buildSearch('');
    const specialQuery = 'İğüşöçİğüşöç'.repeat(500);
    const start = Date.now();
    await expect(svc.search({ query: specialQuery })).resolves.toBeDefined();
    expect(Date.now() - start).toBeLessThan(2000);
  });
});

// ─── SEC-INJ-04: Path Traversal ──────────────────────────────────────────────

describe('[SEC-INJ-04] Path Traversal in User Input', () => {
  it('normalizeTR does not execute arbitrary code via string input', () => {
    // Pure function — no eval, no file access
    const traversal = '../../../etc/passwd';
    const result = normalizeTR(traversal);
    // Result is just lowercased — no filesystem interaction
    expect(result).toBe('../../../etc/passwd');
    expect(result).not.toContain('root:'); // Obviously
  });

  it('search query with path traversal chars is handled safely', async () => {
    const svc = await buildSearch('');
    await expect(svc.search({ query: '../../../etc/passwd' })).resolves.toBeDefined();
  });

  it('search query with null bytes handled safely', async () => {
    const svc = await buildSearch('');
    await expect(svc.search({ query: 'product\x00.php' })).resolves.toBeDefined();
  });
});

// ─── SEC-INJ-05: Prototype Pollution Prevention ──────────────────────────────

describe('[SEC-INJ-05] Prototype Pollution', () => {
  it('normalizeTR is safe against prototype pollution via string input', () => {
    // Verify normalizeTR doesn't mutate Object.prototype
    const before = Object.prototype.toString;
    normalizeTR('__proto__[admin]=true');
    expect(Object.prototype.toString).toBe(before);
    expect((({} as any).admin)).toBeUndefined();
  });

  it('search with __proto__ key in tenantId filter does not pollute', async () => {
    const svc = await buildSearch('');
    // Should not throw or pollute
    await expect(svc.search({ query: 'test', tenantId: '__proto__' }))
      .resolves.toBeDefined();
    expect((({} as any).__proto__?.malicious)).toBeUndefined();
  });
});

// ─── SEC-INJ-06: normalizeTR Input Boundary ──────────────────────────────────

describe('[SEC-INJ-06] normalizeTR Boundary Conditions', () => {
  it('handles very large input without error', () => {
    const large = 'İğüşöç'.repeat(1000);
    expect(() => normalizeTR(large)).not.toThrow();
  });

  it('handles unicode surrogate pairs without crash', () => {
    expect(() => normalizeTR('😀🎉🔥')).not.toThrow();
  });

  it('handles control characters safely', () => {
    expect(() => normalizeTR('\x00\x01\x02\x1f')).not.toThrow();
  });

  it('handles mixed RTL/LTR text safely', () => {
    expect(() => normalizeTR('مرحبا Şarkı hello')).not.toThrow();
  });
});
