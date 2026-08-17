// Explicit local entry point, instead of pointing package.json's "main"
// straight at "expo-router/entry". In this pnpm workspace, Metro's release
// bundling step (createBundleReleaseJsAndAssets) resolves that package
// path relative to the wrong directory and fails to find it — a known
// class of bug where Expo's dynamic entry-resolution script gets confused
// by a nested monorepo + pnpm's .pnpm symlink store. A plain local file
// right next to package.json resolves unambiguously regardless.
import "expo-router/entry";
