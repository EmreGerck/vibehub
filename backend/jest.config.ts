import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        strictNullChecks: false,
        noImplicitAny: false,
        // Inject jest globals into every test file
        types: ['jest', 'node'],
      },
    }],
  },
  globals: {},
  // expo-server-sdk ships ESM; transform it through ts-jest so Jest can consume it
  transformIgnorePatterns: [
    'node_modules/(?!(expo-server-sdk)/)',
  ],
  // Module mocks for ESM-only packages that cause parse errors in CJS Jest
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-server-sdk$': '<rootDir>/__mocks__/expo-server-sdk.ts',
    '^iyzipay$': '<rootDir>/__mocks__/iyzipay.ts',
    '^meilisearch$': '<rootDir>/__mocks__/meilisearch.ts',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  verbose: true,
  // Security test suites share module-level mocks (ioredis, meilisearch) that
  // conflict when Jest workers run files concurrently. Force serial execution
  // for the security suite via a project config.
  projects: [
    {
      displayName: 'security',
      testMatch: ['<rootDir>/__security_tests__/**/*.spec.ts'],
      testEnvironment: 'node',
      runInBand: true,
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: { strictNullChecks: false, noImplicitAny: false, types: ['jest', 'node'] },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^expo-server-sdk$': '<rootDir>/__mocks__/expo-server-sdk.ts',
        '^iyzipay$': '<rootDir>/__mocks__/iyzipay.ts',
        '^meilisearch$': '<rootDir>/__mocks__/meilisearch.ts',
      },
      transformIgnorePatterns: ['node_modules/(?!(expo-server-sdk)/)'],
    },
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/**/*.spec.ts'],
      testPathIgnorePatterns: ['<rootDir>/__security_tests__/'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: { strictNullChecks: false, noImplicitAny: false, types: ['jest', 'node'] },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
        '^expo-server-sdk$': '<rootDir>/__mocks__/expo-server-sdk.ts',
        '^iyzipay$': '<rootDir>/__mocks__/iyzipay.ts',
        '^meilisearch$': '<rootDir>/__mocks__/meilisearch.ts',
      },
      transformIgnorePatterns: ['node_modules/(?!(expo-server-sdk)/)'],
    },
  ],
};

export default config;
