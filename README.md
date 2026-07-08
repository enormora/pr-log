[![GitHub Actions status](https://github.com/enormora/pr-log/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/enormora/pr-log/actions/workflows/continuous-integration.yml)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/pr-log/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/pr-log)

# pr-log

`pr-log` creates changelog entries from merged GitHub pull requests. It can be used as a command-line tool or as a library for projects that need the same GitHub pull request collection, label resolution, and changelog rendering behavior.

## Packages

- [`pr-log`](source/packages/command-line-interface/README.md) [![NPM Version](https://img.shields.io/npm/v/pr-log.svg?style=flat)](https://www.npmjs.org/package/pr-log): command-line changelog generator.
- [`@pr-log/core`](source/packages/core/README.md) [![NPM Version](https://img.shields.io/npm/v/%40pr-log%2Fcore.svg?style=flat)](https://www.npmjs.org/package/@pr-log/core): reusable changelog generation API.
