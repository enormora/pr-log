# @pr-log/core

Reusable changelog generation API for projects that need the same GitHub pull request collection, label resolution, changed-file lookup, and changelog rendering behavior as the `pr-log` CLI.

## Install

```sh
npm install @pr-log/core
```

## Usage

```ts
import { createPrLogEngine } from '@pr-log/core';

const prLogEngine = createPrLogEngine({
    githubToken: process.env.GH_TOKEN,
    workingDirectory: process.cwd(),
    labelLookupIntervalMilliseconds: 250,
    maximumRateLimitRetryCount: 3
});
```

`@pr-log/core` owns Git/GitHub range resolution, pull request collection, label resolution, changed-file lookup, changelog rendering, and changelog Markdown merging.
Target impact and release planning stay outside pr-log. Consumers pass target source files into pr-log when they need target-specific changelogs.

A target-aware integration usually follows this flow:

1. Compute release targets and their source files.
2. Resolve a base ref for each target.
3. Collect merged pull requests for each Git range.
4. Fetch changed files for those pull requests.
5. Filter pull requests by target source files.
6. Resolve labels for each target.
7. Render one Markdown string per target, or one grouped Markdown string for all targets.
8. Read the existing changelog outside pr-log.
9. Pass the existing and generated Markdown to `prLogEngine.updateChangelog()`.
10. Write the returned Markdown outside pr-log.

Target-scoped labels can override the pull request level label for one target. The default pattern is `{targetName}:{label}`.
For example, `pkg-a:breaking` overrides a `bug` pull request label when rendering `pkg-a`, while other targets still use `bug`.

Package-aware release tags use `<packageName>@<version>` by default, for example `@scope/package@1.2.3`.
Consumers can pass a package tag format with `{packageName}` and `{version}` placeholders.
Missing package base refs reject with `MissingChangelogBaseRefError`.
pr-log renders and merges Markdown only. Consumers decide whether that text is written to one file, separate target files, release notes, or another destination.
pr-log does not compute target impact, map build artifacts to source files, publish packages, commit files, create tags, or create releases.
