import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(expo-server-sdk)/)'
  ],
  moduleNameMapper: {
    'expo-server-sdk': '<rootDir>/tests/__mocks__/expo-server-sdk.ts'
  },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  testTimeout: 30000,
  forceExit: true,
  clearMocks: true,
  globals: {
    'ts-jest': {
      diagnostics: false
    }
  }
}

export default config