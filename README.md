[![GitHub Actions status](https://github.com/enormora/pr-log/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/enormora/pr-log/actions/workflows/continuous-integration.yml)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/pr-log/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/pr-log)

# pr-log

`pr-log` creates changelog entries from merged GitHub pull requests. It can be used as a command-line tool or as a library for projects that need the same GitHub pull request collection, label resolution, and changelog rendering behavior.

## Packages

- [`pr-log`](packages/pr-log/README.md) [![NPM Version](https://img.shields.io/npm/v/pr-log.svg?style=flat)](https://www.npmjs.org/package/pr-log): command-line changelog generator.
- [`@pr-log/core`](packages/core/README.md) [![NPM Version](https://img.shields.io/npm/v/%40pr-log%2Fcore.svg?style=flat)](https://www.npmjs.org/package/@pr-log/core): reusable changelog generation API.

## Publishing

This repo uses packtory to publish `pr-log` and `@pr-log/core` from one build without npm workspaces.
The `pr-log` version is manual.
The `@pr-log/core` version is automatic, with `0.0.1` as the first publish version.
Package changelogs live in `source/packages/command-line-interface/CHANGELOG.md` and `source/packages/core/CHANGELOG.md`.
Each package changelog is published as `CHANGELOG.md` in its package tarball.

Use semver tags for `pr-log`, for example `6.2.0`.
Use package-aware tags for `@pr-log/core`, for example `@pr-log/core@0.0.1`.

```sh
just publish-dry-run
NPM_TOKEN=xxxxxxxxx just publish
```
