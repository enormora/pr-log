// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';
import { execaCommand } from 'execa';
import { createPrLogEngine, defaultValidLabels } from './source/packages/core/core.entry-point.ts';
import { getGithubRepoFromPackageInfo, getIgnoredLabels, getValidLabels } from './source/lib/package-info.ts';
import { splitByString } from './source/lib/split.ts';
import { resolvePrLogReleaseVersion } from './source/release/pr-log-release-version.ts';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/packtory/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const coreReadmePath = path.join(projectFolder, 'packages/core/README.md');
const cliReadmePath = path.join(projectFolder, 'packages/pr-log/README.md');
const labelLookupIntervalMilliseconds = 250;
const maximumRateLimitRetryCount = 3;

async function readPackageInfo() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    return JSON.parse(packageJsonContent);
}

function sharedPackageAttributes(packageInfo) {
    return {
        author: packageInfo.author,
        contributors: packageInfo.contributors,
        license: packageInfo.license,
        repository: packageInfo.repository,
        engines: packageInfo.engines
    };
}

function commonPackageSettings(packageInfo) {
    return {
        sourcesFolder,
        mainPackageJson: { type: 'module', dependencies: packageInfo.dependencies },
        additionalFiles: [{ sourceFilePath: licensePath, targetFilePath: 'LICENSE' }],
        deadCodeElimination: { enabled: true },
        publishSettings: {
            access: 'public',
            provenance: { type: 'auto' }
        }
    };
}

function registrySettings() {
    return {
        auth: { type: 'npm-oidc', provider: 'github-actions' }
    };
}

function splitLines(value) {
    return splitByString(value, '\n').filter((line) => {
        return line !== '';
    });
}

async function listTags() {
    const { stdout } = await execaCommand('git tag --list');
    return splitLines(stdout);
}

async function readPrLogVersion(packageInfo, versionInput) {
    const environment = globalThis.process.env;
    const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
    const validLabels = getValidLabels(packageInfo, defaultValidLabels);
    const ignoredLabels = getIgnoredLabels(packageInfo);
    const prLogEngine = createPrLogEngine({
        githubToken: environment.GH_TOKEN ?? environment.GITHUB_TOKEN,
        workingDirectory: projectFolder,
        labelLookupIntervalMilliseconds,
        maximumRateLimitRetryCount
    });

    return resolvePrLogReleaseVersion({
        tags: await listTags(),
        currentVersion: versionInput.currentVersion,
        packageInfo,
        githubRepo,
        validLabels,
        ignoredLabels,
        targetSourceFiles: versionInput.targetSourceFiles,
        ignoredAttributionPaths: versionInput.ignoredAttributionPaths,
        collectMergedPullRequests(input) {
            return prLogEngine.collectMergedPullRequests(input);
        },
        readPullRequestChangedFiles(input) {
            return prLogEngine.readPullRequestChangedFiles(input);
        },
        filterPullRequestsByTargetFiles(input) {
            return prLogEngine.filterPullRequestsByTargetFiles(input);
        },
        resolvePullRequestLabels(input) {
            return prLogEngine.resolvePullRequestLabels(input);
        }
    });
}

function corePackage(sharedAttributes) {
    return {
        name: '@pr-log/core',
        versioning: { automatic: true, minimumVersion: '0.0.1' },
        additionalFiles: [{ sourceFilePath: coreReadmePath, targetFilePath: 'README.md' }],
        roots: {
            main: {
                js: 'packages/core/core.entry-point.js',
                declarationFile: 'packages/core/core.entry-point.d.ts'
            }
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: 'Library API for changelog generation from GitHub pull requests',
            keywords: ['pr-log', 'changelog', 'github', 'pull-request', 'release-plan']
        }
    };
}

function cliPackage(packageInfo, sharedAttributes) {
    return {
        name: 'pr-log',
        versioning: {
            automatic: false,
            provideVersion(input) {
                return readPrLogVersion(packageInfo, input);
            }
        },
        additionalFiles: [{ sourceFilePath: cliReadmePath, targetFilePath: 'README.md' }],
        roots: {
            cli: {
                js: 'packages/command-line-interface/bin.entry-point.js'
            }
        },
        packageInterface: {
            bins: [{ root: 'cli', name: 'pr-log' }]
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: packageInfo.description,
            keywords: packageInfo.keywords
        },
        bundleDependencies: ['@pr-log/core']
    };
}

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageInfo = await readPackageInfo();
    const sharedAttributes = sharedPackageAttributes(packageInfo);

    return {
        registrySettings: registrySettings(),
        changelog: {
            packageTagFormat: '{packageName}@{version}',
            outputs: [
                {
                    kind: 'package-file',
                    paths: {
                        '@pr-log/core': 'source/packages/core/CHANGELOG.md',
                        'pr-log': 'source/packages/command-line-interface/CHANGELOG.md'
                    }
                },
                { kind: 'github-release' }
            ]
        },
        commonPackageSettings: commonPackageSettings(packageInfo),
        checks: {
            areTheTypesWrong: { enabled: true, profile: 'esm-only' },
            noDuplicatedFiles: { enabled: true, allowList: [licensePath] },
            requiredFiles: { enabled: true, files: ['LICENSE', 'README.md'] },
            maxBundleSize: { enabled: true },
            noUnusedBundleDependencies: { enabled: true },
            noDevDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noSideEffects: { enabled: false }
        },
        packages: [corePackage(sharedAttributes), cliPackage(packageInfo, sharedAttributes)]
    };
}
