/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  // products/specs/*.spec.ts는 Zod 스키마 정의 파일 (테스트 아님)
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/modules/products/specs/'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
