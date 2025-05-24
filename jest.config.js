const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // next.config.jsとテスト環境用の.envファイルが配置されたディレクトリのパス
    dir: './',
});

// Jestのカスタム設定
const customJestConfig = {
    // テストファイルのパターン
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
    // テスト環境
    testEnvironment: 'jest-environment-jsdom',
    // セットアップファイル
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    // モジュール名のエイリアス
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    // カバレッジの設定
    collectCoverageFrom: [
        'src/**/*.{js,jsx,ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/_*.{js,jsx,ts,tsx}',
        '!src/**/*.stories.{js,jsx,ts,tsx}',
    ],
};

// createJestConfigを使用して、Next.jsの設定を反映したJest設定を作成
module.exports = createJestConfig(customJestConfig);