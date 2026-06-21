---
name: Metro ENOENT crash fix
description: How to prevent Metro from crashing when Replit skill temp dirs are created/deleted mid-session.
---

## The rule
Add a raw RegExp `blockList` entry in `artifacts/mobile/metro.config.js` to stop Metro watching `.local/skills/.tmp-*` paths.

```js
config.resolver.blockList = [
  /[/\\]\.local[/\\]skills[/\\]\.tmp-[^/\\]*/,
];
```

**Why:** Replit's integrations skill creates temp directories under `.local/skills/.tmp-<random>/` then deletes them. Metro's FallbackWatcher holds a file-system watch on these paths; when they vanish it throws `ENOENT` and kills the Metro process entirely.

**How to apply:** Any time the mobile expo workflow crashes with `ENOENT: no such file or directory, watch '.../.local/skills/.tmp-...'`, add/verify the blockList entry above. Do NOT use `metro-config/src/defaults/exclusionList` — that subpath is not exported by the installed version of metro-config.
