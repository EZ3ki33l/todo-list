// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const workspaceRoot = path.resolve(__dirname, "../..");
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...new Set([...(config.watchFolders ?? []), workspaceRoot]),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.unstable_enableSymlinks = true;

const clerkExpoRoot = path.dirname(
  require.resolve("@clerk/expo/package.json", { paths: [projectRoot] }),
);
const clerkGoogleOneTapEntry = path.join(clerkExpoRoot, "dist/google-one-tap/index.js");

// Monorepo pnpm : Metro ne résout pas toujours les variantes .android.js / .ios.js
// quand le require() cible explicitement un fichier .js (@clerk/expo en est victime).
function resolveWithPlatformVariant(context, moduleName, platform, resolveRequest) {
  if ((platform !== "android" && platform !== "ios") || !moduleName.endsWith(".js")) {
    return null;
  }

  const platformModule = moduleName.replace(/\.js$/, `.${platform}.js`);
  try {
    return resolveRequest(context, platformModule, platform);
  } catch {
    return null;
  }
}

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolveRequest = defaultResolveRequest ?? context.resolveRequest;

  if (moduleName === "@clerk/expo/google-one-tap") {
    return resolveRequest(context, clerkGoogleOneTapEntry, platform);
  }

  const platformResolved = resolveWithPlatformVariant(
    context,
    moduleName,
    platform,
    resolveRequest,
  );
  if (platformResolved) return platformResolved;

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
