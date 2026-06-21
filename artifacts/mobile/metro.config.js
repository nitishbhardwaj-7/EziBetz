const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Redirect fontfaceobserver to a no-op mock (expo-font uses it on web,
// but pnpm's isolated layout prevents auto-resolution)
config.resolver.extraNodeModules = {
  fontfaceobserver: path.resolve(projectRoot, "fontfaceobserver-mock.js"),
};

// Block Metro from watching ephemeral temp dirs created by Replit skills.
// These get deleted mid-session which crashes the FallbackWatcher.
// Use raw RegExp — metro-config/src/defaults/exclusionList is not exported
// in this version of metro-config.
config.resolver.blockList = [
  /[/\\]\.local[/\\]skills[/\\]\.tmp-[^/\\]*/,
];

module.exports = config;
