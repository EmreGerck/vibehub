/**
 * Manual mock for the `meilisearch` ESM package.
 * Meilisearch ships ESM-only which Jest CJS mode cannot parse.
 * This mock provides a minimal stub so tests that import from search.service.ts compile.
 * Tests that actually test Meilisearch behaviour override it via jest.mock() + mockReturnValue.
 */

const mockIndex = {
  updateSettings:     jest.fn().mockResolvedValue({}),
  search:             jest.fn().mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 }),
  addDocuments:       jest.fn().mockResolvedValue({}),
  deleteDocument:     jest.fn().mockResolvedValue({}),
  deleteAllDocuments: jest.fn().mockResolvedValue({}),
  getStats:           jest.fn().mockResolvedValue({ numberOfDocuments: 0 }),
};

export class Meilisearch {
  index(_name: string) {
    return mockIndex;
  }
}

export { mockIndex as __mockIndex };

// Also export as MeiliSearch alias (legacy name)
export const MeiliSearch = Meilisearch;

export class Index {}
export enum MatchingStrategies {
  ALL = 'all',
  LAST = 'last',
  FREQUENCY = 'frequency',
}
