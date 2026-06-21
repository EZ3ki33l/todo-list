/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/components/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@repo/theme$": "<rootDir>/../../packages/theme/src/index.ts",
    "^@repo/api/lib/(.*)$": "<rootDir>/../../packages/api/src/lib/$1",
    "^@repo/domain$": "<rootDir>/../../packages/domain/src/index.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gorhom|tamagui|@tamagui)",
  ],
};
