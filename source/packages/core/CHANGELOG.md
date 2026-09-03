## 0.0.5 (September 3, 2026)

### Features

* Add `collapse: "same"` changelog collapse rules ([#718](https://github.com/enormora/pr-log/pull/718))
* Add `versionGroup` collapse rules ([#717](https://github.com/enormora/pr-log/pull/717))
* Detect single-parent (squash-merge-like) commits ([#656](https://github.com/enormora/pr-log/pull/656))

### Dependency Upgrades

* Update dependency `@packtory/cli` to `0.0.77` ([#681](https://github.com/enormora/pr-log/pull/681))
* ⬆️ Update eslint ([#658](https://github.com/enormora/pr-log/pull/658))
* Update dependency execa to v10.0.1 ([#684](https://github.com/enormora/pr-log/pull/684), [#660](https://github.com/enormora/pr-log/pull/660))

### Code Refactoring

* Revert Packtory declaration workarounds ([#682](https://github.com/enormora/pr-log/pull/682))

### Build-Related

* Align Node engines with CI ([#697](https://github.com/enormora/pr-log/pull/697))

## 0.0.4 (July 13, 2026)

### Features

* Add configurable GitHub API base URL ([#645](https://github.com/enormora/pr-log/pull/645))
* Support changelog entries without PR links ([#646](https://github.com/enormora/pr-log/pull/646))
* Add `extractChangelogReleaseSection` to `@pr-log/core` ([#637](https://github.com/enormora/pr-log/pull/637))

### Enhancements

* Expose pull request changed file metadata ([#647](https://github.com/enormora/pr-log/pull/647))

### Code Refactoring

* Move package READMEs into `source/packages` ([#634](https://github.com/enormora/pr-log/pull/634))

## 0.0.3 (July 7, 2026)

### Enhancements

* Expose `PrLogConfig` from `@pr-log/core` ([#610](https://github.com/enormora/pr-log/pull/610))

### Dependency Upgrades

* Update `eslint` config packages ([#602](https://github.com/enormora/pr-log/pull/602))
* ⬆️ Update dependency semver to v7.8.5 ([#561](https://github.com/enormora/pr-log/pull/561))

## 0.0.2 (June 18, 2026)

### Features

* Add `pr-log.ignoredLabels` changelog filtering ([#568](https://github.com/lo1tuma/pr-log/pull/568))

### Enhancements

* Add `PrLogEngine.updateChangelog()` ([#564](https://github.com/lo1tuma/pr-log/pull/564))

### Build-Related

* Delete gated `release/pr-log` workflow runs ([#581](https://github.com/lo1tuma/pr-log/pull/581))
* Mirror `release/pr-log` CI into commit statuses ([#580](https://github.com/lo1tuma/pr-log/pull/580))
* Add `release/pr-log` status proof ([#579](https://github.com/lo1tuma/pr-log/pull/579))
* Add `release/pr-log` check-run proof ([#578](https://github.com/lo1tuma/pr-log/pull/578))
* Remove `release/pr-log` workflow approval attempt ([#577](https://github.com/lo1tuma/pr-log/pull/577))
* Wait for `release/pr-log` workflow runs ([#576](https://github.com/lo1tuma/pr-log/pull/576))
* Approve `release/pr-log` workflow runs ([#575](https://github.com/lo1tuma/pr-log/pull/575))
* Handle empty GitHub API responses in release workflow ([#573](https://github.com/lo1tuma/pr-log/pull/573))
* Replace direct release push with `release/pr-log` automation ([#570](https://github.com/lo1tuma/pr-log/pull/570))
* Add `Release PR policy` checks ([#569](https://github.com/lo1tuma/pr-log/pull/569))
* Fix `@pr-log/core` minimum version ([#566](https://github.com/lo1tuma/pr-log/pull/566))
* Add manual `pr-log` publish workflow ([#565](https://github.com/lo1tuma/pr-log/pull/565))

## 0.0.1 (June 11, 2026)

### Features

* Add target Markdown rendering ([#551](https://github.com/lo1tuma/pr-log/pull/551))
* Add target file attribution ([#550](https://github.com/lo1tuma/pr-log/pull/550))
* Add target-scoped label overrides ([#547](https://github.com/lo1tuma/pr-log/pull/547))
* Fetch raw pull request labels ([#546](https://github.com/lo1tuma/pr-log/pull/546))
* Add `createPrLogEngine()` API ([#548](https://github.com/lo1tuma/pr-log/pull/548))
* Add target Markdown rendering ([#543](https://github.com/lo1tuma/pr-log/pull/543))
* Add target file attribution helper ([#542](https://github.com/lo1tuma/pr-log/pull/542))
* Add target-scoped label overrides ([#541](https://github.com/lo1tuma/pr-log/pull/541))

### Enhancements

* Export `MissingChangelogBaseRefError` from `@pr-log/core` ([#554](https://github.com/lo1tuma/pr-log/pull/554))
* Export `defaultValidLabels` from `@pr-log/core` ([#539](https://github.com/lo1tuma/pr-log/pull/539))
* Add package-aware changelog base refs ([#529](https://github.com/lo1tuma/pr-log/pull/529))
* Add `@pr-log/core` API package ([#528](https://github.com/lo1tuma/pr-log/pull/528))

### Documentation

* Add package-specific READMEs for `pr-log` and `@pr-log/core` ([#556](https://github.com/lo1tuma/pr-log/pull/556))
* Document target-aware `@pr-log/core` API ([#545](https://github.com/lo1tuma/pr-log/pull/545))

### Code Refactoring

* Fetch raw pull request labels ([#540](https://github.com/lo1tuma/pr-log/pull/540))

### Build-Related

* Enable Packtory `deadCodeElimination` and checks ([#558](https://github.com/lo1tuma/pr-log/pull/558))
* Enable package checks ([#553](https://github.com/lo1tuma/pr-log/pull/553))
* Add package entry points ([#549](https://github.com/lo1tuma/pr-log/pull/549))
