[![NPM Version](https://img.shields.io/npm/v/pr-log.svg?style=flat)](https://www.npmjs.org/package/pr-log)

# pr-log

> Changelog generator based on GitHub Pull Requests

## Install

```sh
npm install pr-log
```

## Setup and configuration

You have to follow these steps to use `pr-log` without problems.

### GitHub

The following categories are defined by default:

|    GitHub label | Human friendly name | Description                                                          |
| --------------: | :------------------ | -------------------------------------------------------------------- |
|      `breaking` | Breaking Changes    | Backwards-incompatible changes                                       |
|           `bug` | Bug Fixes           | Changes that only fix a bug                                          |
|       `feature` | Features            | New features                                                         |
|   `enhancement` | Enhancements        | Non-breaking improvements of existing features                       |
| `documentation` | Documentation       | Changes to documentation and/or README                               |
|       `upgrade` | Dependency Upgrades | Any kind of dependency updates                                       |
|      `refactor` | Code Refactoring    | Changes that do not affect the behavior but improve the code quality |
|         `build` | Build-Related       | Changes related to the build process and/or CI/CD pipeline           |

You can create a custom mapping by adding a `pr-log.validLabels` section to your `package.json`.
`validLabels` must be specified as an array of key, value pairs. The same order will be used to format the changelog sections.

```json
{
    "pr-log": {
        "validLabels": [
            ["core", "Core features"],
            ["addon", "Addons"]
        ]
    }
}
```

To use `pr-log` your GitHub project needs some small configuration:

- Create the labels mentioned above.
- Set the correct label on your pull requests. You need to set exactly one label. Multiple labels or one that is not recognized will throw an error.
- Use correct semver versioning for your tags, for example `2.4.7`.

### Project

As `pr-log` reads repository information from your project you have to add the `repository` information in your `package.json`.

```json
{
    "repository": {
        "type": "git",
        "url": "https://github.com/<your username>/<your repository name>.git"
    }
}
```

### Changelog formatting

#### Custom date format

If you want to use a custom date format you can configure `pr-log.dateFormat` in your `package.json`.

```json
{
    "pr-log": { "dateFormat": "dd.MM.yyyy" }
}
```

Refer to the [`date-fns` documentation](https://date-fns.org/docs/format) for details about the format expressions.

#### Collapse repeated pull requests

If your changelog tends to collect several pull requests that represent one logical change, you can configure `pr-log.collapseRules`.
This is useful for dependency upgrade bots, but the feature is intentionally generic and works with any pull request title format you control.

Each collapse rule:

- applies only to one label
- matches pull request titles with a regular expression
- groups entries by one named capture group
- collapses only continuous chains where one entry ends with the version the next entry starts from
- renders the collapsed title with a replacement template

```json
{
    "pr-log": {
        "collapseRules": [
            {
                "label": "upgrade",
                "pattern": "^Update (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$",
                "replace": "Update $<dependency> from $<from> to $<to>"
            }
        ]
    }
}
```

With that configuration, these pull requests in one release:

- `Update foo from 1 to 2`
- `Update foo from 2 to 3`
- `Update foo from 3 to 4`

become one changelog entry:

- `Update foo from 1 to 4`

The default capture group names are `dependency`, `from`, and `to`.
If your title format uses different names, you can override them with `keyGroup`, `fromGroup`, and `toGroup`.
Collapsed entries include links to all pull requests that contributed to the final line item.

## Usage

To create or update your changelog run:

```sh
pr-log [options] <version-number>
```

`version-number` is the name of this release.

You can also run `pr-log --auto-version` to derive the next version number from the labels of merged pull requests since the latest stable semver tag.
The default bump precedence is:

- `breaking` -> major
- `feature` -> minor
- any other valid label -> patch

Example:

- In GitHub a tag named `2.0.0` exists that is behind `main`.
- A pull request `#13` was created since the last tag that has the label `breaking`.
- A pull request `#22` was created since the last tag that has the label `documentation`.

`pr-log 2.0.0` creates a changelog with the following example content:

```markdown
## 2.0.0 (January 20, 2015)

### Breaking Changes

- Use new backwards incompatible version of module XYZ (#13)

### Documentation

- Fix some spelling mistakes in documentation. (#22)
```

To validate labels on a single pull request, run:

```sh
pr-log validate-pull-request-labels 123
```

This command uses the same `pr-log` label configuration as changelog generation, including custom `validLabels` and `ignoredLabels`.

## Options

### `--sloppy`

The `--sloppy` option defaults to false. When set, it allows `pr-log` to generate a changelog even when you are not on the default branch. This should not be used in production.

### `--trace`

When enabled this option outputs the stacktrace of an error additionally to the error message to `stderr`.

### `--stdout`

This option disables writing the changelog into the file `CHANGELOG.md`. Instead it prints the changelog to `stdout`.

### `--auto-version`

This option derives the release version from merged pull request labels since the latest stable semver tag.
It must not be combined with `--unreleased` or an explicit `version-number`.

You can customize the label-to-version mapping in `package.json`:

```json
{
    "pr-log": {
        "versionBumps": {
            "major": ["breaking"],
            "minor": ["feature"],
            "patch": ["bug", "documentation", "upgrade"]
        }
    }
}
```

## Correct usage makes a clean and complete changelog

If you want your changelog to be complete and clean you have to follow these rules:

1. Don't commit directly to `main`. If you do, your changes will not be covered in the changelog.
2. Use pull requests for your features that you want to be in your changelog.
3. Use the correct categories for your pull request. If you introduce a new feature that will be a breaking change, give it the according label `breaking`.

## GitHub Authentication

If you need to authenticate `pr-log`, for example to access a private repo, you can set the `GH_TOKEN` environment variable.
Generate a token value in your [GitHub settings](https://github.com/settings/tokens).

```sh
GH_TOKEN=xxxxxxxxx pr-log [options] <version-number>
```

## Reason for this project

Many projects have problems with their changelogs. Most of them try one of the following ways:

- manually write change logs, which is error-prone and often inconsistent
- generate them from commit messages, which can hide important changes because there are too many commits to read

Other challenges for good changelogs:

- Different categories, for example breaking changes.
- Only include changes starting from a certain tag.

### More complete example `CHANGELOG.md`

After working for some time with the tool and having two releases, the file content could look like this:

```markdown
## 2.0.0 (January 20, 2015)

### Breaking Changes

- Use new backwards incompatible version of module XYZ (#13)

### Features

- Add fancy feature (#2)

### Documentation

- Fix some spelling mistakes in documentation. (#22)

## 1.1.0 (November 3, 2014)
```
