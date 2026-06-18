module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "@tamagui/babel-plugin",
        {
          components: ["tamagui"],
          config: "./tamagui.config.ts",
          // Bundle initial plus rapide en dev (Tamagui ~30s sans ça).
          disableExtraction: process.env.NODE_ENV === "development",
        },
      ],
    ],
  };
};
