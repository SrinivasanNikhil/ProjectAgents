module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(mongoose)/)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/client/index.tsx',
    '!src/server/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/client/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/client/hooks/$1',
    '^@/utils/(.*)$': '<rootDir>/src/client/utils/$1',
    '^@/services/(.*)$': '<rootDir>/src/server/services/$1',
    '^@/models/(.*)$': '<rootDir>/src/server/models/$1',
    '^@/routes/(.*)$': '<rootDir>/src/server/routes/$1',
    '^@/middleware/(.*)$': '<rootDir>/src/server/middleware/$1',
    '^@/config/(.*)$': '<rootDir>/src/server/config/$1',
  },
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Add timeouts to prevent hanging tests
  testTimeout: 10000,
};
