## 6.3.0 (June 19, 2026)

### Features

* Add `pr-log.ignoredLabels` changelog filtering ([#568](https://github.com/enormora/pr-log/pull/568))

### Enhancements

* Add `PrLogEngine.updateChangelog()` ([#564](https://github.com/enormora/pr-log/pull/564))

### Build-Related

* Fix package repository URL ([#585](https://github.com/enormora/pr-log/pull/585))
* Fix release PR merge publishing ([#583](https://github.com/enormora/pr-log/pull/583))
* Delete gated `release/pr-log` workflow runs ([#581](https://github.com/enormora/pr-log/pull/581))
* Mirror `release/pr-log` CI into commit statuses ([#580](https://github.com/enormora/pr-log/pull/580))
* Add `release/pr-log` status proof ([#579](https://github.com/enormora/pr-log/pull/579))
* Add `release/pr-log` check-run proof ([#578](https://github.com/enormora/pr-log/pull/578))
* Remove `release/pr-log` workflow approval attempt ([#577](https://github.com/enormora/pr-log/pull/577))
* Wait for `release/pr-log` workflow runs ([#576](https://github.com/enormora/pr-log/pull/576))
* Approve `release/pr-log` workflow runs ([#575](https://github.com/enormora/pr-log/pull/575))
* Handle empty GitHub API responses in release workflow ([#573](https://github.com/enormora/pr-log/pull/573))
* Replace direct release push with `release/pr-log` automation ([#570](https://github.com/enormora/pr-log/pull/570))
* Add `Release PR policy` checks ([#569](https://github.com/enormora/pr-log/pull/569))
* Trim `Prepare release` validation ([#567](https://github.com/enormora/pr-log/pull/567))
* Fix `@pr-log/core` minimum version ([#566](https://github.com/enormora/pr-log/pull/566))
* Add manual `pr-log` publish workflow ([#565](https://github.com/enormora/pr-log/pull/565))

## 6.3.0 (June 18, 2026)

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
* Trim `Prepare release` validation ([#567](https://github.com/lo1tuma/pr-log/pull/567))
* Fix `@pr-log/core` minimum version ([#566](https://github.com/lo1tuma/pr-log/pull/566))
* Add manual `pr-log` publish workflow ([#565](https://github.com/lo1tuma/pr-log/pull/565))

## 6.2.0 (June 11, 2026)

### Features

* Add target Markdown rendering ([#551](https://github.com/lo1tuma/pr-log/pull/551))
* Add target file attribution ([#550](https://github.com/lo1tuma/pr-log/pull/550))
* Add target-scoped label overrides ([#547](https://github.com/lo1tuma/pr-log/pull/547))
* Fetch raw pull request labels ([#546](https://github.com/lo1tuma/pr-log/pull/546))
* Add `createPrLogEngine()` API ([#548](https://github.com/lo1tuma/pr-log/pull/548))
* Add target Markdown rendering ([#543](https://github.com/lo1tuma/pr-log/pull/543))
* Add target file attribution helper ([#542](https://github.com/lo1tuma/pr-log/pull/542))
* Add target-scoped label overrides ([#541](https://github.com/lo1tuma/pr-log/pull/541))
* Support revert commits in merged pull request detection ([#516](https://github.com/lo1tuma/pr-log/pull/516))
* Fetch pull request titles from GitHub when merge bodies are missing ([#515](https://github.com/lo1tuma/pr-log/pull/515))
* Throttle pull request label lookups ([#510](https://github.com/lo1tuma/pr-log/pull/510))
* Add auto-version release mode ([#508](https://github.com/lo1tuma/pr-log/pull/508))

### Enhancements

* Export `MissingChangelogBaseRefError` from `@pr-log/core` ([#554](https://github.com/lo1tuma/pr-log/pull/554))
* Export `defaultValidLabels` from `@pr-log/core` ([#539](https://github.com/lo1tuma/pr-log/pull/539))
* Add package-aware changelog base refs ([#529](https://github.com/lo1tuma/pr-log/pull/529))
* Add `@pr-log/core` API package ([#528](https://github.com/lo1tuma/pr-log/pull/528))
* Collapse repeated upgrade changelog entries ([#519](https://github.com/lo1tuma/pr-log/pull/519))

### Documentation

* Update root `README.md` badges ([#557](https://github.com/lo1tuma/pr-log/pull/557))
* Add package-specific READMEs for `pr-log` and `@pr-log/core` ([#556](https://github.com/lo1tuma/pr-log/pull/556))
* Document target-aware `@pr-log/core` API ([#545](https://github.com/lo1tuma/pr-log/pull/545))

### Dependency Upgrades

* ⬆️ Update dependency @types/node to v24.13.1 ([#533](https://github.com/lo1tuma/pr-log/pull/533))
* ⬆️ Update dependency semver to v7.8.2 ([#532](https://github.com/lo1tuma/pr-log/pull/532))
* ⬆️ Update dependency @types/node to v24.13.0 ([#531](https://github.com/lo1tuma/pr-log/pull/531))
* ⬆️ Update dependency date-fns to v4.4.0 ([#530](https://github.com/lo1tuma/pr-log/pull/530))
* ⬆️ Lock file maintenance ([#527](https://github.com/lo1tuma/pr-log/pull/527))
* ⬆️ Update dependency true-myth to v9.4.0 ([#525](https://github.com/lo1tuma/pr-log/pull/525))
* ⬆️ Update dependency date-fns to v4.3.0 ([#524](https://github.com/lo1tuma/pr-log/pull/524))
* ⬆️ Lock file maintenance ([#523](https://github.com/lo1tuma/pr-log/pull/523))
* ⬆️ Update dependency semver to v7.8.1 ([#522](https://github.com/lo1tuma/pr-log/pull/522))
* ⬆️ Update dependency mocha to v11.7.6 ([#521](https://github.com/lo1tuma/pr-log/pull/521))
* ⬆️ Update dependency date-fns to v4.2.1 ([#518](https://github.com/lo1tuma/pr-log/pull/518))
* ⬆️ Update dependency typescript to v6 ([#494](https://github.com/lo1tuma/pr-log/pull/494))
* ⬆️ Update dependency git-url-parse to v16.1.0 ([#441](https://github.com/lo1tuma/pr-log/pull/441))
* ⬆️ Update dependency date-fns to v4 ([#406](https://github.com/lo1tuma/pr-log/pull/406))
* ⬆️ Update dependency prettier to v3.8.3 ([#420](https://github.com/lo1tuma/pr-log/pull/420))
* ⬆️ Update @enormora/eslint-config ([#366](https://github.com/lo1tuma/pr-log/pull/366))
* ⬆️ Lock file maintenance ([#509](https://github.com/lo1tuma/pr-log/pull/509))
* ⬆️ Update dependency sinon to v22 ([#502](https://github.com/lo1tuma/pr-log/pull/502))
* ⬆️ Update dependency @sindresorhus/is to v8 ([#498](https://github.com/lo1tuma/pr-log/pull/498))
* ⬆️ Update dependency c8 to v11 ([#487](https://github.com/lo1tuma/pr-log/pull/487))
* ⬆️ Lock file maintenance ([#499](https://github.com/lo1tuma/pr-log/pull/499))
* ⬆️ Lock file maintenance ([#496](https://github.com/lo1tuma/pr-log/pull/496))
* ⬆️ Update dependency sinon to v21.1.1 ([#497](https://github.com/lo1tuma/pr-log/pull/497))
* ⬆️ Lock file maintenance ([#495](https://github.com/lo1tuma/pr-log/pull/495))
* ⬆️ Lock file maintenance ([#493](https://github.com/lo1tuma/pr-log/pull/493))
* ⬆️ Lock file maintenance ([#492](https://github.com/lo1tuma/pr-log/pull/492))
* ⬆️ Lock file maintenance ([#491](https://github.com/lo1tuma/pr-log/pull/491))
* ⬆️ Lock file maintenance ([#490](https://github.com/lo1tuma/pr-log/pull/490))
* ⬆️ Update dependency @types/node to v24.11.0 ([#488](https://github.com/lo1tuma/pr-log/pull/488))
* ⬆️ Update Node.js to v24 ([#466](https://github.com/lo1tuma/pr-log/pull/466))
* ⬆️ Update dependency sinon to v21.0.1 ([#471](https://github.com/lo1tuma/pr-log/pull/471))
* ⬆️ Update actions/checkout action to v6 ([#472](https://github.com/lo1tuma/pr-log/pull/472))
* ⬆️ Lock file maintenance ([#486](https://github.com/lo1tuma/pr-log/pull/486))
* ⬆️ Lock file maintenance ([#485](https://github.com/lo1tuma/pr-log/pull/485))
* ⬆️ Lock file maintenance ([#484](https://github.com/lo1tuma/pr-log/pull/484))
* ⬆️ Lock file maintenance ([#483](https://github.com/lo1tuma/pr-log/pull/483))
* ⬆️ Lock file maintenance ([#482](https://github.com/lo1tuma/pr-log/pull/482))
* ⬆️ Lock file maintenance ([#481](https://github.com/lo1tuma/pr-log/pull/481))
* ⬆️ Lock file maintenance ([#480](https://github.com/lo1tuma/pr-log/pull/480))
* ⬆️ Lock file maintenance ([#479](https://github.com/lo1tuma/pr-log/pull/479))
* ⬆️ Lock file maintenance ([#478](https://github.com/lo1tuma/pr-log/pull/478))
* ⬆️ Lock file maintenance ([#477](https://github.com/lo1tuma/pr-log/pull/477))
* ⬆️ Lock file maintenance ([#476](https://github.com/lo1tuma/pr-log/pull/476))
* ⬆️ Lock file maintenance ([#475](https://github.com/lo1tuma/pr-log/pull/475))
* ⬆️ Lock file maintenance ([#474](https://github.com/lo1tuma/pr-log/pull/474))
* ⬆️ Lock file maintenance ([#473](https://github.com/lo1tuma/pr-log/pull/473))
* ⬆️ Lock file maintenance ([#470](https://github.com/lo1tuma/pr-log/pull/470))
* ⬆️ Lock file maintenance ([#468](https://github.com/lo1tuma/pr-log/pull/468))
* ⬆️ Lock file maintenance ([#467](https://github.com/lo1tuma/pr-log/pull/467))
* ⬆️ Update dependency @types/node to v22.18.12 ([#459](https://github.com/lo1tuma/pr-log/pull/459))
* ⬆️ Lock file maintenance ([#465](https://github.com/lo1tuma/pr-log/pull/465))
* ⬆️ Lock file maintenance ([#464](https://github.com/lo1tuma/pr-log/pull/464))
* ⬆️ Update actions/setup-node action to v6 ([#463](https://github.com/lo1tuma/pr-log/pull/463))
* ⬆️ Lock file maintenance ([#462](https://github.com/lo1tuma/pr-log/pull/462))
* ⬆️ Lock file maintenance ([#461](https://github.com/lo1tuma/pr-log/pull/461))
* ⬆️ Lock file maintenance ([#460](https://github.com/lo1tuma/pr-log/pull/460))
* ⬆️ Update actions/setup-node action to v5 ([#458](https://github.com/lo1tuma/pr-log/pull/458))
* ⬆️ Update actions/checkout action to v5 ([#457](https://github.com/lo1tuma/pr-log/pull/457))
* ⬆️ Update dependency commander to v14 ([#450](https://github.com/lo1tuma/pr-log/pull/450))
* ⬆️ Update dependency @octokit/rest to v22 ([#452](https://github.com/lo1tuma/pr-log/pull/452))
* ⬆️ Update dependency @ava/typescript to v6 ([#456](https://github.com/lo1tuma/pr-log/pull/456))
* ⬆️ Update dependency true-myth to v9 ([#445](https://github.com/lo1tuma/pr-log/pull/445))
* ⬆️ Update dependency sinon to v21 ([#455](https://github.com/lo1tuma/pr-log/pull/455))
* ⬆️ Lock file maintenance ([#454](https://github.com/lo1tuma/pr-log/pull/454))
* ⬆️ Lock file maintenance ([#453](https://github.com/lo1tuma/pr-log/pull/453))
* ⬆️ Lock file maintenance ([#451](https://github.com/lo1tuma/pr-log/pull/451))
* ⬆️ Lock file maintenance ([#449](https://github.com/lo1tuma/pr-log/pull/449))
* ⬆️ Lock file maintenance ([#448](https://github.com/lo1tuma/pr-log/pull/448))
* ⬆️ Lock file maintenance ([#447](https://github.com/lo1tuma/pr-log/pull/447))
* ⬆️ Lock file maintenance ([#446](https://github.com/lo1tuma/pr-log/pull/446))
* ⬆️ Lock file maintenance ([#444](https://github.com/lo1tuma/pr-log/pull/444))
* ⬆️ Lock file maintenance ([#442](https://github.com/lo1tuma/pr-log/pull/442))
* ⬆️ Update dependency true-myth to v8.5.3 ([#443](https://github.com/lo1tuma/pr-log/pull/443))
* ⬆️ Lock file maintenance ([#440](https://github.com/lo1tuma/pr-log/pull/440))
* ⬆️ Lock file maintenance ([#438](https://github.com/lo1tuma/pr-log/pull/438))
* ⬆️ Lock file maintenance ([#437](https://github.com/lo1tuma/pr-log/pull/437))
* ⬆️ Lock file maintenance ([#436](https://github.com/lo1tuma/pr-log/pull/436))
* ⬆️ Lock file maintenance ([#435](https://github.com/lo1tuma/pr-log/pull/435))
* ⬆️ Lock file maintenance ([#434](https://github.com/lo1tuma/pr-log/pull/434))
* ⬆️ Lock file maintenance ([#433](https://github.com/lo1tuma/pr-log/pull/433))
* ⬆️ Lock file maintenance ([#432](https://github.com/lo1tuma/pr-log/pull/432))
* ⬆️ Lock file maintenance ([#431](https://github.com/lo1tuma/pr-log/pull/431))
* ⬆️ Lock file maintenance ([#430](https://github.com/lo1tuma/pr-log/pull/430))
* ⬆️ Lock file maintenance ([#429](https://github.com/lo1tuma/pr-log/pull/429))
* ⬆️ Update dependency commander to v13 ([#427](https://github.com/lo1tuma/pr-log/pull/427))
* ⬆️ Lock file maintenance ([#428](https://github.com/lo1tuma/pr-log/pull/428))
* ⬆️ Lock file maintenance ([#426](https://github.com/lo1tuma/pr-log/pull/426))
* ⬆️ Lock file maintenance ([#425](https://github.com/lo1tuma/pr-log/pull/425))
* ⬆️ Lock file maintenance ([#424](https://github.com/lo1tuma/pr-log/pull/424))
* ⬆️ Lock file maintenance ([#423](https://github.com/lo1tuma/pr-log/pull/423))
* ⬆️ Lock file maintenance ([#422](https://github.com/lo1tuma/pr-log/pull/422))
* ⬆️ Lock file maintenance ([#421](https://github.com/lo1tuma/pr-log/pull/421))
* ⬆️ Update Node.js to v22 ([#414](https://github.com/lo1tuma/pr-log/pull/414))
* ⬆️ Update dependency git-url-parse to v16 ([#417](https://github.com/lo1tuma/pr-log/pull/417))
* ⬆️ Lock file maintenance ([#419](https://github.com/lo1tuma/pr-log/pull/419))
* ⬆️ Lock file maintenance ([#418](https://github.com/lo1tuma/pr-log/pull/418))
* ⬆️ Lock file maintenance ([#416](https://github.com/lo1tuma/pr-log/pull/416))
* ⬆️ Lock file maintenance ([#415](https://github.com/lo1tuma/pr-log/pull/415))
* ⬆️ Update dependency @types/node to v22 ([#413](https://github.com/lo1tuma/pr-log/pull/413))
* ⬆️ Lock file maintenance ([#412](https://github.com/lo1tuma/pr-log/pull/412))
* ⬆️ Update dependency git-url-parse to v15 ([#401](https://github.com/lo1tuma/pr-log/pull/401))
* ⬆️ Update dependency @sindresorhus/is to v7 ([#393](https://github.com/lo1tuma/pr-log/pull/393))
* ⬆️ Update dependency true-myth to v8 ([#398](https://github.com/lo1tuma/pr-log/pull/398))
* ⬆️ Update dependency sinon to v19 ([#405](https://github.com/lo1tuma/pr-log/pull/405))
* ⬆️ Lock file maintenance ([#411](https://github.com/lo1tuma/pr-log/pull/411))
* ⬆️ Lock file maintenance ([#410](https://github.com/lo1tuma/pr-log/pull/410))
* ⬆️ Lock file maintenance ([#409](https://github.com/lo1tuma/pr-log/pull/409))
* ⬆️ Lock file maintenance ([#408](https://github.com/lo1tuma/pr-log/pull/408))
* ⬆️ Lock file maintenance ([#407](https://github.com/lo1tuma/pr-log/pull/407))
* ⬆️ Lock file maintenance ([#404](https://github.com/lo1tuma/pr-log/pull/404))
* ⬆️ Lock file maintenance ([#403](https://github.com/lo1tuma/pr-log/pull/403))
* ⬆️ Lock file maintenance ([#402](https://github.com/lo1tuma/pr-log/pull/402))
* ⬆️ Lock file maintenance ([#400](https://github.com/lo1tuma/pr-log/pull/400))
* ⬆️ Lock file maintenance ([#399](https://github.com/lo1tuma/pr-log/pull/399))
* ⬆️ Lock file maintenance ([#397](https://github.com/lo1tuma/pr-log/pull/397))
* ⬆️ Lock file maintenance ([#396](https://github.com/lo1tuma/pr-log/pull/396))
* ⬆️ Lock file maintenance ([#395](https://github.com/lo1tuma/pr-log/pull/395))
* ⬆️ Lock file maintenance ([#394](https://github.com/lo1tuma/pr-log/pull/394))
* ⬆️ Lock file maintenance ([#392](https://github.com/lo1tuma/pr-log/pull/392))
* ⬆️ Lock file maintenance ([#391](https://github.com/lo1tuma/pr-log/pull/391))
* ⬆️ Lock file maintenance ([#390](https://github.com/lo1tuma/pr-log/pull/390))
* ⬆️ Update dependency @octokit/rest to v21 ([#389](https://github.com/lo1tuma/pr-log/pull/389))
* ⬆️ Update dependency execa to v9 ([#378](https://github.com/lo1tuma/pr-log/pull/378))
* ⬆️ Update dependency sinon to v18 ([#381](https://github.com/lo1tuma/pr-log/pull/381))
* ⬆️ Update dependency @ava/typescript to v5 ([#376](https://github.com/lo1tuma/pr-log/pull/376))
* ⬆️ Update dependency c8 to v10 ([#387](https://github.com/lo1tuma/pr-log/pull/387))
* ⬆️ Lock file maintenance ([#388](https://github.com/lo1tuma/pr-log/pull/388))
* ⬆️ Lock file maintenance ([#386](https://github.com/lo1tuma/pr-log/pull/386))
* ⬆️ Lock file maintenance ([#385](https://github.com/lo1tuma/pr-log/pull/385))
* ⬆️ Lock file maintenance ([#384](https://github.com/lo1tuma/pr-log/pull/384))
* ⬆️ Lock file maintenance ([#383](https://github.com/lo1tuma/pr-log/pull/383))
* ⬆️ Lock file maintenance ([#382](https://github.com/lo1tuma/pr-log/pull/382))
* ⬆️ Lock file maintenance ([#380](https://github.com/lo1tuma/pr-log/pull/380))
* ⬆️ Lock file maintenance ([#377](https://github.com/lo1tuma/pr-log/pull/377))
* ⬆️ Lock file maintenance ([#375](https://github.com/lo1tuma/pr-log/pull/375))
* ⬆️ Lock file maintenance ([#374](https://github.com/lo1tuma/pr-log/pull/374))
* ⬆️ Lock file maintenance ([#373](https://github.com/lo1tuma/pr-log/pull/373))
* ⬆️ Lock file maintenance ([#372](https://github.com/lo1tuma/pr-log/pull/372))
* ⬆️ Lock file maintenance ([#370](https://github.com/lo1tuma/pr-log/pull/370))
* ⬆️ Lock file maintenance ([#369](https://github.com/lo1tuma/pr-log/pull/369))
* ⬆️ Lock file maintenance ([#368](https://github.com/lo1tuma/pr-log/pull/368))
* ⬆️ Lock file maintenance ([#367](https://github.com/lo1tuma/pr-log/pull/367))

### Code Refactoring

* Compose `pr-log` CLI through `@pr-log/core` ([#552](https://github.com/lo1tuma/pr-log/pull/552))
* Compose `pr-log` CLI through core renderer ([#544](https://github.com/lo1tuma/pr-log/pull/544))
* Fetch raw pull request labels ([#540](https://github.com/lo1tuma/pr-log/pull/540))
* Migrate AVA based unit tests to Mocha ([#506](https://github.com/lo1tuma/pr-log/pull/506))
* Switch TypeScript imports to .ts extensions and enable erasable syntax only ([#503](https://github.com/lo1tuma/pr-log/pull/503))

### Build-Related

* Enable Packtory `deadCodeElimination` and checks ([#558](https://github.com/lo1tuma/pr-log/pull/558))
* Remove unused `pack` and `pack-all` recipes ([#555](https://github.com/lo1tuma/pr-log/pull/555))
* Enable package checks ([#553](https://github.com/lo1tuma/pr-log/pull/553))
* Add package entry points ([#549](https://github.com/lo1tuma/pr-log/pull/549))
* Be more explicit about when pipeline should run ([#520](https://github.com/lo1tuma/pr-log/pull/520))
* Run required checks for merge queues ([#513](https://github.com/lo1tuma/pr-log/pull/513))
* Run push CI only on main ([#512](https://github.com/lo1tuma/pr-log/pull/512))
* Group ESLint config updates ([#511](https://github.com/lo1tuma/pr-log/pull/511))
* Add Node.js 26 to supported engines ([#507](https://github.com/lo1tuma/pr-log/pull/507))
* Migrate npm scripts to just recipes ([#505](https://github.com/lo1tuma/pr-log/pull/505))
* Expand GitHub Actions Node.js test matrix to 20, 22, and 24 ([#504](https://github.com/lo1tuma/pr-log/pull/504))

## 6.1.1 (March 6, 2024)

### Bug Fixes

* Revert "⬆️ Update @enormora/eslint-config" ([#365](https://github.com/lo1tuma/pr-log/pull/365))
* Move loglevel from development to runtime dependencies ([#363](https://github.com/lo1tuma/pr-log/pull/363))

### Dependency Upgrades

* ⬆️ Update @enormora/eslint-config ([#358](https://github.com/lo1tuma/pr-log/pull/358))
* ⬆️ Lock file maintenance ([#364](https://github.com/lo1tuma/pr-log/pull/364))
* ⬆️ Lock file maintenance ([#361](https://github.com/lo1tuma/pr-log/pull/361))
* ⬆️ Lock file maintenance ([#360](https://github.com/lo1tuma/pr-log/pull/360))
* ⬆️ Update dependency commander to v12 ([#355](https://github.com/lo1tuma/pr-log/pull/355))
* ⬆️ Lock file maintenance ([#359](https://github.com/lo1tuma/pr-log/pull/359))
* ⬆️ Lock file maintenance ([#357](https://github.com/lo1tuma/pr-log/pull/357))
* Move @enormora dependencies to development dependencies ([#356](https://github.com/lo1tuma/pr-log/pull/356))

## 6.1.0 (February 4, 2024)

### Bug Fixes

* Remove "Unreleased" title when version was not released ([#351](https://github.com/lo1tuma/pr-log/pull/351))

### Features

* Introduce --unreleased CLI option ([#347](https://github.com/lo1tuma/pr-log/pull/347))
* Introduce "--stdout" option to print the changelog ([#340](https://github.com/lo1tuma/pr-log/pull/340))

### Documentation

* Document --stdout option ([#341](https://github.com/lo1tuma/pr-log/pull/341))

### Dependency Upgrades

* ⬆️ Lock file maintenance ([#354](https://github.com/lo1tuma/pr-log/pull/354))
* ⬆️ Lock file maintenance ([#353](https://github.com/lo1tuma/pr-log/pull/353))
* ⬆️ Lock file maintenance ([#352](https://github.com/lo1tuma/pr-log/pull/352))
* ⬆️ Update dependency git-url-parse to v14 ([#349](https://github.com/lo1tuma/pr-log/pull/349))
* ⬆️ Update dependency c8 to v9 ([#350](https://github.com/lo1tuma/pr-log/pull/350))
* ⬆️ Lock file maintenance ([#348](https://github.com/lo1tuma/pr-log/pull/348))
* ⬆️ Lock file maintenance ([#346](https://github.com/lo1tuma/pr-log/pull/346))
* ⬆️ Lock file maintenance ([#344](https://github.com/lo1tuma/pr-log/pull/344))
* Disable Renovates dependency dashboard ([#342](https://github.com/lo1tuma/pr-log/pull/342))
* ⬆️ Update dependency @types/sinon to v17 ([#331](https://github.com/lo1tuma/pr-log/pull/331))
* ⬆️ Update dependency ava to v6 ([#338](https://github.com/lo1tuma/pr-log/pull/338))
* ⬆️ Lock file maintenance ([#339](https://github.com/lo1tuma/pr-log/pull/339))
* ⬆️ Lock file maintenance ([#337](https://github.com/lo1tuma/pr-log/pull/337))
* ⬆️ Lock file maintenance ([#336](https://github.com/lo1tuma/pr-log/pull/336))
* ⬆️ Lock file maintenance ([#335](https://github.com/lo1tuma/pr-log/pull/335))
* ⬆️ Update dependency @types/node to v20.9.0 ([#333](https://github.com/lo1tuma/pr-log/pull/333))
* ⬆️ Lock file maintenance ([#334](https://github.com/lo1tuma/pr-log/pull/334))
* ⬆️ Lock file maintenance ([#332](https://github.com/lo1tuma/pr-log/pull/332))
* ⬆️ Lock file maintenance ([#330](https://github.com/lo1tuma/pr-log/pull/330))

### Build-Related

* Check pull request labels ([#343](https://github.com/lo1tuma/pr-log/pull/343))

## 6.0.0 (October 24, 2023)

### Breaking Changes

* Add support for custom default branch and change default to `main` ([#326](https://github.com/lo1tuma/pr-log/pull/326))

### Bug Fixes

* Ignore merge commits with indirect parent ([#328](https://github.com/lo1tuma/pr-log/pull/328))

### Dependency Upgrades

* ⬆️ Update actions/setup-node action to v4 ([#327](https://github.com/lo1tuma/pr-log/pull/327))
* ⬆️ Update dependency sinon to v17 ([#324](https://github.com/lo1tuma/pr-log/pull/324))
* ⬆️ Lock file maintenance ([#325](https://github.com/lo1tuma/pr-log/pull/325))
* ⬆️ Lock file maintenance ([#322](https://github.com/lo1tuma/pr-log/pull/322))
* ⬆️ Update dependency @types/semver to v7.5.3 ([#312](https://github.com/lo1tuma/pr-log/pull/312))
* ⬆️ Update dependency @types/sinon to v10.0.17 ([#313](https://github.com/lo1tuma/pr-log/pull/313))
* ⬆️ Update typescript-eslint monorepo to v6.7.3 ([#314](https://github.com/lo1tuma/pr-log/pull/314))
* ⬆️ Update dependency @octokit/rest to v20.0.2 ([#296](https://github.com/lo1tuma/pr-log/pull/296))
* ⬆️ Update dependency @types/node to v20.7.0 ([#315](https://github.com/lo1tuma/pr-log/pull/315))
* ⬆️ Update dependency @types/node to v20.6.5 ([#311](https://github.com/lo1tuma/pr-log/pull/311))

### Code Refactoring

* Force exact dependency installation ([#309](https://github.com/lo1tuma/pr-log/pull/309))

### Build-Related

* Automatically set upgrade label for renovate PRs ([#329](https://github.com/lo1tuma/pr-log/pull/329))
* Enable verbatim module syntax in TypeScript compiler settings ([#323](https://github.com/lo1tuma/pr-log/pull/323))
* Group @enormora/eslint-config dependencies ([#321](https://github.com/lo1tuma/pr-log/pull/321))
* Migrate to ESLint flat config ([#317](https://github.com/lo1tuma/pr-log/pull/317))
* Enable automatic dependency updates for minor and patch versions ([#316](https://github.com/lo1tuma/pr-log/pull/316))
* Specify versions of GitHub actions ([#310](https://github.com/lo1tuma/pr-log/pull/310))

## 5.0.0 (September 25, 2023)

### Breaking Changes

* Rewrite codebase to TypeScript (drop nodejs support for versions < 20) ([#298](https://github.com/lo1tuma/pr-log/pull/298))
* Drop support for node < 18 ([#275](https://github.com/lo1tuma/pr-log/pull/275))
* Replace moment.js by date-fns ([#239](https://github.com/lo1tuma/pr-log/pull/239))
* Drop support for node v10 ([#238](https://github.com/lo1tuma/pr-log/pull/238))

### Bug Fixes

* Ensure there is always an empty line between the existing content and the new content in CHANGELOG.md ([#308](https://github.com/lo1tuma/pr-log/pull/308))
* Fix parsing of git commit log messages ([#307](https://github.com/lo1tuma/pr-log/pull/307))
* Fix token authentication ([#306](https://github.com/lo1tuma/pr-log/pull/306))
* Remove quotes from git log format ([#305](https://github.com/lo1tuma/pr-log/pull/305))

### Documentation

* Remove david-dm badge from README.md ([#277](https://github.com/lo1tuma/pr-log/pull/277))

### Dependency Upgrades

* ⬆️ Update dependency @types/node to v20.6.5 ([#301](https://github.com/lo1tuma/pr-log/pull/301))
* ⬆️ Update dependency eslint to v8.50.0 ([#283](https://github.com/lo1tuma/pr-log/pull/283))
* Update all dependencies ([#273](https://github.com/lo1tuma/pr-log/pull/273))
* ⬆️ Update dependency ava to v3 ([#222](https://github.com/lo1tuma/pr-log/pull/222))
* ⬆️ Update dependency nyc to v15 ([#220](https://github.com/lo1tuma/pr-log/pull/220))
* ⬆️ Update dependency babel-plugin-istanbul to v6 ([#219](https://github.com/lo1tuma/pr-log/pull/219))
* ⬆️ Update dependency git-promise to v1 ([#228](https://github.com/lo1tuma/pr-log/pull/228))
* ⬆️ Update dependency sinon to v9 ([#230](https://github.com/lo1tuma/pr-log/pull/230))
* ⬆️ Update dependency semver to v7 ([#216](https://github.com/lo1tuma/pr-log/pull/216))
* ⬆️ Update dependency commander to v6 ([#234](https://github.com/lo1tuma/pr-log/pull/234))
* ⬆️ Update dependency moment to v2.29.0 ([#229](https://github.com/lo1tuma/pr-log/pull/229))
* ⬆️ Update dependency ramda to v0.27.1 ([#224](https://github.com/lo1tuma/pr-log/pull/224))
* ⬆️ Update dependency eslint-plugin-ava to v11 ([#237](https://github.com/lo1tuma/pr-log/pull/237))
* ⬆️ Update dependency eslint to v7 ([#231](https://github.com/lo1tuma/pr-log/pull/231))
* ⬆️ Update dependency @octokit/rest to v18 ([#232](https://github.com/lo1tuma/pr-log/pull/232))
* ⬆️ Update dependency git-url-parse to v11.2.0 ([#233](https://github.com/lo1tuma/pr-log/pull/233))
* ⬆️ Update babel monorepo ([#214](https://github.com/lo1tuma/pr-log/pull/214))

### Code Refactoring

* Refactoring: introduce GitCommandRunner ([#300](https://github.com/lo1tuma/pr-log/pull/300))
* Use execaCommand instead of template string tag ([#299](https://github.com/lo1tuma/pr-log/pull/299))
* ⬆️ Pin dependencies ([#242](https://github.com/lo1tuma/pr-log/pull/242))
* Use eslint-config-joyn ([#241](https://github.com/lo1tuma/pr-log/pull/241))
* ⬆️ Pin dependency date-fns to 2.16.1 ([#240](https://github.com/lo1tuma/pr-log/pull/240))

### Build-Related

* ⬆️ Update actions/setup-node action to v3 ([#281](https://github.com/lo1tuma/pr-log/pull/281))
* Add node v18 to CI environments ([#274](https://github.com/lo1tuma/pr-log/pull/274))
* Use github actions instead  of travis ci ([#236](https://github.com/lo1tuma/pr-log/pull/236))

## 4.0.0 (December 7, 2019)

### Breaking Changes

-   Drop support for nodejs 6 and 8 ([#208](https://github.com/lo1tuma/pr-log/pull/208))

### Dependency Upgrades

-   ⬆️ Update dependency babel-plugin-istanbul to v5.2.0 ([#193](https://github.com/lo1tuma/pr-log/pull/193))
-   ⬆️ Update dependency ava to v2 ([#201](https://github.com/lo1tuma/pr-log/pull/201))
-   ⬆️ Update dependency sinon to v7.5.0 ([#190](https://github.com/lo1tuma/pr-log/pull/190))
-   ⬆️ Update dependency moment to v2.24.0 ([#191](https://github.com/lo1tuma/pr-log/pull/191))
-   ⬆️ Update dependency coveralls to v3.0.9 ([#194](https://github.com/lo1tuma/pr-log/pull/194))
-   ⬆️ Update dependency @octokit/rest to v16.35.0 ([#187](https://github.com/lo1tuma/pr-log/pull/187))
-   ⬆️ Update dependency eslint to v6 ([#203](https://github.com/lo1tuma/pr-log/pull/203))
-   ⬆️ Update dependency eslint-plugin-ava to v9 ([#206](https://github.com/lo1tuma/pr-log/pull/206))
-   Update to babel 7 ([#209](https://github.com/lo1tuma/pr-log/pull/209))
-   ⬆️ Update dependency semver to v6 ([#197](https://github.com/lo1tuma/pr-log/pull/197))
-   ⬆️ Update dependency nyc to v14.1.1 ([#200](https://github.com/lo1tuma/pr-log/pull/200))
-   ⬆️ Update dependency commander to v4 ([#207](https://github.com/lo1tuma/pr-log/pull/207))
-   ⬆️ Update dependency nyc to v14 ([#199](https://github.com/lo1tuma/pr-log/pull/199))
-   ⬆️ Update dependency eslint-plugin-ava to v6 ([#195](https://github.com/lo1tuma/pr-log/pull/195))

### Code Refactoring

-   Fix deprecation warnings from octokit ([#213](https://github.com/lo1tuma/pr-log/pull/213))
-   Refactor ESLint config/setup ([#211](https://github.com/lo1tuma/pr-log/pull/211))
-   Use builtin promisify instead of separate package ([#212](https://github.com/lo1tuma/pr-log/pull/212))

### Build-Related

-   Add .editorconfig ([#210](https://github.com/lo1tuma/pr-log/pull/210))

## 3.1.0 (January 8, 2019)

### Bug Fixes

-   Fix octokit usage ([#186](https://github.com/lo1tuma/pr-log/pull/186))
-   Fix incorrect git URL in test case ([#161](https://github.com/lo1tuma/pr-log/pull/161))

### Features

-   Support github token-based authentication ([#179](https://github.com/lo1tuma/pr-log/pull/179))

### Documentation

-   Remove greenkeeper badge ([#160](https://github.com/lo1tuma/pr-log/pull/160))

### Dependency Upgrades

-   ⬆️ Update dependency git-url-parse to v11 ([#176](https://github.com/lo1tuma/pr-log/pull/176))
-   ⬆️ Update dependency eslint to v5.12.0 ([#181](https://github.com/lo1tuma/pr-log/pull/181))
-   ⬆️ Update dependency sinon to v7.2.2 ([#177](https://github.com/lo1tuma/pr-log/pull/177))
-   ⬆️ Update dependency ramda to v0.26.1 ([#182](https://github.com/lo1tuma/pr-log/pull/182))
-   ⬆️ Update dependency @octokit/rest to v16 ([#183](https://github.com/lo1tuma/pr-log/pull/183))
-   ⬆️ Update dependency ava to v1 ([#185](https://github.com/lo1tuma/pr-log/pull/185))
-   ⬆️ Update dependency moment to v2.23.0 ([#184](https://github.com/lo1tuma/pr-log/pull/184))
-   ⬆️ Update dependency eslint-plugin-ava to v5 ([#174](https://github.com/lo1tuma/pr-log/pull/174))
-   ⬆️ Update dependency sinon to v7 ([#171](https://github.com/lo1tuma/pr-log/pull/171))
-   ⬆️ Update dependency eslint to v5 ([#173](https://github.com/lo1tuma/pr-log/pull/173))
-   ⬆️ Update dependency git-url-parse to v10 ([#170](https://github.com/lo1tuma/pr-log/pull/170))
-   ⬆️ Update dependency nyc to v13 ([#175](https://github.com/lo1tuma/pr-log/pull/175))
-   ⬆️ Update dependency babel-plugin-istanbul to v5 ([#172](https://github.com/lo1tuma/pr-log/pull/172))
-   ⬆️ Update dependency sinon to v4.5.0 ([#169](https://github.com/lo1tuma/pr-log/pull/169))
-   ⬆️ Update dependency moment to v2.22.2 ([#168](https://github.com/lo1tuma/pr-log/pull/168))
-   ⬆️ Update dependency coveralls to v3.0.2 ([#165](https://github.com/lo1tuma/pr-log/pull/165))
-   ⬆️ Update dependency eslint-config-holidaycheck to v0.13.1 ([#166](https://github.com/lo1tuma/pr-log/pull/166))
-   ⬆️ Update dependency git-url-parse to v8.3.1 ([#167](https://github.com/lo1tuma/pr-log/pull/167))
-   ⬆️ Update dependency commander to v2.19.0 ([#164](https://github.com/lo1tuma/pr-log/pull/164))
-   Update sinon to the latest version 🚀 ([#147](https://github.com/lo1tuma/pr-log/pull/147))
-   Update sinon to the latest version 🚀 ([#146](https://github.com/lo1tuma/pr-log/pull/146))

### Code Refactoring

-   ⬆️ Pin dependencies ([#163](https://github.com/lo1tuma/pr-log/pull/163))
-   Remove bluebird dependency ([#145](https://github.com/lo1tuma/pr-log/pull/145))

### Build-Related

-   Configure Renovate ([#162](https://github.com/lo1tuma/pr-log/pull/162))
-   Update to node 10 in .travis.yml ([#158](https://github.com/lo1tuma/pr-log/pull/158))

## 3.0.0 (March 9, 2018)

### Breaking Changes

-   Make validLabels an array of pairs to define order of changelog sections ([#144](https://github.com/lo1tuma/pr-log/pull/144))
-   Don’t write stacktraces to stderr per default ([#141](https://github.com/lo1tuma/pr-log/pull/141))
-   Make references to pull requests a link ([#142](https://github.com/lo1tuma/pr-log/pull/142))
-   Remove support for nodejs 4 and 7 ([#125](https://github.com/lo1tuma/pr-log/pull/125))

### Enhancements

-   Add support for custom date format configuration ([#143](https://github.com/lo1tuma/pr-log/pull/143))
-   Validate CLI argument to be a valid semver version number ([#133](https://github.com/lo1tuma/pr-log/pull/133))
-   Add refactor label ([#132](https://github.com/lo1tuma/pr-log/pull/132))

### Documentation

-   Small README.md improvements ([#140](https://github.com/lo1tuma/pr-log/pull/140))

### Dependency Upgrades

-   Update commander to the latest version 🚀 ([#137](https://github.com/lo1tuma/pr-log/pull/137))
-   Update @octokit/rest to the latest version 🚀 ([#135](https://github.com/lo1tuma/pr-log/pull/135))
-   Update mocha to the latest version 🚀 ([#128](https://github.com/lo1tuma/pr-log/pull/128))

### Code Refactoring

-   Use ava instead of mocha/chai ([#138](https://github.com/lo1tuma/pr-log/pull/138))
-   Remove proxyquire dependency ([#134](https://github.com/lo1tuma/pr-log/pull/134))
-   Use octokit instead of restling ([#131](https://github.com/lo1tuma/pr-log/pull/131))
-   Use async/await instead of bluebird ([#130](https://github.com/lo1tuma/pr-log/pull/130))

## 2.1.0 (March 3, 2018)

### Dependency Upgrades

-   Update chai to version 4.1.2 (#124)
-   Update git-url-parse to version 8.1.0 (#123)
-   chore(package): update coveralls to version 3.0.0 (#122)
-   Update mocha to version 5.0.1 (#121)
-   Update sinon to version 4.4.2 (#120)
-   Update babel-register to the latest version 🚀 (#104)
-   Update babel-cli to the latest version 🚀 (#105)
-   Update parse-github-repo-url to the latest version 🚀 (#106)
-   Update bluebird to the latest version 🚀 (#111)
-   Update ramda to the latest version 🚀 (#112)
-   fix(package): update moment to version 2.20.1 (#119)
-   fix(package): update commander to version 2.14.1 (#118)
-   chore(package): update eslint to version 4.7.0 (#109)
-   Update sinon to the latest version 🚀 (#101)
-   Update sinon to the latest version 🚀 (#88)
-   Update eslint and eslint-config-holidaycheck to the latest version 🚀 (#95)
-   Update eslint-plugin-mocha to the latest version 🚀 (#92)
-   Update chai-as-promised to the latest version 🚀 (#97)
-   Update commander to the latest version 🚀 (#96)
-   Update chai-as-promised to the latest version 🚀 (#90)
-   Update commander to the latest version 🚀 (#93)
-   Update git-url-parse to the latest version 🚀 (#91)
-   Update sinon-chai to the latest version 🚀 (#89)
-   Update nyc to the latest version 🚀 (#85)
-   Update ramda to the latest version 🚀 (#86)
-   Update dependencies to enable Greenkeeper 🌴 (#82)
-   Update eslint (#81)

### Bug Fixes

-   Reduce cyclomatic complexity to fix build (#117)

### Build-Related

-   Use files whitelist instead of .npmignore (#100)
-   Switch to babel-preset-env (#99)
-   Add node 8 test environment (#98)
-   Move to nyc for code coverage (#80)

## 2.0.0 (May 23, 2017)

### Breaking Changes

-   Drop nodejs 0.x and 5.x support (#79)
-   Skip prerelease tags and upgrade semver (#76)

### Features

-   Allow the user to configure PR label to group mapping (#78)
-   Added --sloppy option (#75)

### Enhancements

-   Handle PRs that don't match expected merge format (#77)

## 1.6.0 (August 25, 2016)

### Bug Fixes

-   Support parentheses in PR titles (#74)

## 1.5.0 (June 4, 2016)

### Bug Fixes

-   Fix stripping trailing empty line (#70)

### Dependency Upgrades

-   Update eslint-config-holidaycheck to version 0.9.0 🚀 (#69)
-   Update git-url-parse to version 6.0.3 🚀 (#65)
-   Update eslint-plugin-mocha to version 3.0.0 🚀 (#68)
-   Update bluebird to version 3.4.0 🚀 (#59)
-   Update babel-preset-es2015 to version 6.9.0 🚀 (#58)
-   Update sinon to version 1.17.4 🚀 (#45)
-   Update babel-cli to version 6.9.0 🚀 (#57)
-   Update babel-register to version 6.9.0 🚀 (#60)
-   Update proxyquire to version 1.7.9 🚀 (#52)
-   Update mocha to version 2.5.3 🚀 (#64)
-   Update eslint to version 2.11.1 🚀 (#67)
-   Update git-url-parse to version 6.0.2 🚀 (#43)
-   Update babel-cli to version 6.7.7 🚀 (#42)
-   Update eslint to version 2.8.0 🚀 (#39)
-   Update parse-github-repo-url to version 1.3.0 🚀 (#40)
-   Update moment to version 2.13.0 🚀 (#41)
-   Update eslint-plugin-mocha to version 2.2.0 🚀 (#38)
-   Update eslint-config-holidaycheck to version 0.7.0 🚀 (#36)
-   Update parse-github-repo-url to version 1.2.0 🚀 (#37)
-   Update bluebird to version 3.3.5 🚀 (#35)
-   Update ramda to version 0.21.0 🚀 (#33)
-   Update eslint-plugin-mocha to version 2.1.0 🚀 (#34)
-   Update babel-cli to version 6.7.5 🚀 (#32)
-   Update eslint to version 2.7.0 🚀 (#31)
-   Update eslint to version 2.6.0 🚀 (#29)
-   Update eslint-config-holidaycheck to version 0.6.0 🚀 (#30)
-   Update ramda to version 0.20.1 🚀 (#28)
-   Update ramda to version 0.20.0 🚀 (#24)
-   Update eslint to version 2.5.3 🚀 (#26)
-   Update coveralls to version 2.11.9 🚀 (#21)
-   Update chai-as-promised to version 5.3.0 🚀 (#20)
-   Update eslint to version 2.4.0 🚀 (#15)
-   Update bluebird to version 3.3.4 🚀 (#14)
-   Update moment to version 2.12.0 🚀 (#13)

### Build-Related

-   Convert to es2015 (#18)

## 1.4.0 (March 5, 2016)

### Dependency Upgrades

-   Update all dependencies 🌴 (#11)
-   Update to ESLint 2 and use eslint-config-holidaycheck (#12)

### Enhancements

-   Replace lodash by ramda (#10)

### Bug Fixes

-   Fix long computation time (#9)

## 1.3.0 (July 1, 2015)

### Enhancements

-   Replace superagent-promise with restling (#8)

### Bug Fixes

-   Avoid extra empty line (#7)

## 1.2.0 (June 21, 2015)

### Dependency Upgrades

-   Update dependencies (#6)

## 1.1.0 (March 8, 2015)

### Bug Fixes

-   Fix crash with mulitline commit message body (#4)

### Dependency Upgrades

-   Update eslint (#5)
-   Update dependencies (#3)

## 1.0.0 (January 22, 2015)

Initial release
