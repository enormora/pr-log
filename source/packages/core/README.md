# @pr-log/core

Reusable changelog generation API for projects that need the same GitHub pull request collection, label resolution, changed-file lookup, and changelog rendering behavior as the `pr-log` CLI.

## Install

```sh
npm install @pr-log/core
```

## Usage

```ts
import { createPrLogEngine, defaultPrLogConfig } from '@pr-log/core';

const prLogEngine = createPrLogEngine({
    githubToken: process.env.GH_TOKEN,
    githubApiBaseUrl: undefined,
    workingDirectory: process.cwd(),
    config: defaultPrLogConfig
});
```

Set `githubApiBaseUrl` only when GitHub API requests must be routed to a compatible API endpoint.

`@pr-log/core` owns Git/GitHub range resolution, pull request collection, label resolution, changed-file lookup, changelog rendering, release-section extraction, and changelog Markdown merging.
Target impact and release planning stay outside pr-log. Consumers pass target source files into pr-log when they need target-specific changelogs.

Pull request collection reads first-parent Git history.
It supports standard GitHub merge commits and single-parent commits whose subject ends with `(#123)`.
For those suffix commits, pr-log verifies that GitHub reports the pull request as merged and that its `merge_commit_sha` matches the commit hash.
Two-parent commits with custom `Title (#123)` messages are ignored.

A target-aware integration usually follows this flow:

1. Compute release targets and their source files.
2. Resolve a base ref for each target.
3. Collect merged pull requests for each Git range.
4. Fetch changed files for those pull requests.
5. Filter pull requests by target source files.
6. Resolve labels for each target.
7. Render one Markdown string per target, or one grouped Markdown string for all targets.
8. Read the existing changelog outside pr-log.
9. Extract an existing release section with `prLogEngine.extractChangelogReleaseSection()` when release tooling needs already-committed notes.
10. Pass the existing and generated Markdown to `prLogEngine.updateChangelog()`.
11. Write the returned Markdown outside pr-log.

Target-scoped labels can override the pull request level label for one target. The default pattern is `{targetName}:{label}`.
For example, `pkg-a:breaking` overrides a `bug` pull request label when rendering `pkg-a`, while other targets still use `bug`.

Changelog behavior is configured with `PrLogConfig`.
Start from `defaultPrLogConfig` and override the fields your integration owns:

```ts
const config = {
    ...defaultPrLogConfig,
    validLabels: new Map([ [ 'change', 'Changes' ] ]),
    ignoredLabels: [ 'release' ],
    dateFormat: 'dd.MM.yyyy',
    collapseRules: [
        {
            label: 'change',
            pattern: /^Update (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$/u,
            replace: 'Update $<dependency> from $<from> to $<to>',
            keyGroup: 'dependency',
            fromGroup: 'from',
            toGroup: 'to'
        },
        {
            label: 'change',
            pattern: /^Update dependency (?<dependency>.+?) to (?<to>.+?)$/u,
            replace: 'Update dependency $<dependency> to $<to>',
            keyGroup: 'dependency',
            versionGroup: 'to'
        }
    ],
    versionBumps: {
        major: [],
        minor: [ 'change' ],
        patch: []
    },
    labelLookupIntervalMilliseconds: 250,
    maximumRateLimitRetryCount: 3
};
```

Pass that config to label resolution, rendering, and version-number resolution calls.

Package-aware release tags use `<packageName>@<version>` by default, for example `@scope/package@1.2.3`.
Consumers can pass a package tag format with `{packageName}` and `{version}` placeholders.
Missing package base refs reject with `MissingChangelogBaseRefError`.
pr-log renders and merges Markdown only. Consumers decide whether that text is written to one file, separate target files, release notes, or another destination.
pr-log does not compute target impact, map build artifacts to source files, publish packages, commit files, create tags, or create releases.

`prLogEngine.extractChangelogReleaseSection()` reads changelog Markdown rendered by pr-log and returns the matching release section for a version and optional `targetName`.
It returns a typed `ReleaseSectionNotFound` result when no non-empty matching section exists.
