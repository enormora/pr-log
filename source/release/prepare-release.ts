import type { PullRequest, PullRequestWithLabel } from '../core/pr-log-engine.ts';
import {
    determineLatestPackageVersionTag,
    filterTargetChangelogPullRequests,
    formatPackageTag,
    selectNextPatchVersion,
    selectNextPrLogVersion,
    selectReleaseTargetFiles,
    type ReleaseTarget
} from './release-plan.ts';

type CoreNoReleaseMetadata = {
    readonly type: 'no-release';
    readonly predictedVersion: '';
    readonly predictedTagName: '';
};

type CorePredictedReleaseMetadata = {
    readonly type: 'predicted-release';
    readonly predictedVersion: string;
    readonly predictedTagName: string;
};

export type CoreReleaseMetadata = CoreNoReleaseMetadata | CorePredictedReleaseMetadata;

export type ReleasePreparation = {
    readonly packageInfo: Record<string, unknown>;
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly currentDate: Readonly<Date>;
    readonly tags: readonly string[];
    readonly trackedFiles: readonly string[];
    readonly collectMergedPullRequests: (input: {
        readonly githubRepo: string;
        readonly baseRef: string;
    }) => Promise<readonly PullRequest[]>;
    readonly resolvePullRequestLabels: (input: {
        readonly githubRepo: string;
        readonly validLabels: ReadonlyMap<string, string>;
        readonly ignoredLabels: readonly string[];
        readonly pullRequests: readonly PullRequest[];
        readonly targetName: string | undefined;
        readonly targetScopedLabelPattern: string | undefined;
    }) => Promise<readonly PullRequestWithLabel[]>;
    readonly readPullRequestChangedFiles: (input: {
        readonly githubRepo: string;
        readonly pullRequests: readonly PullRequest[];
    }) => Promise<ReadonlyMap<number, readonly string[]>>;
    readonly renderChangelog: (input: {
        readonly packageInfo: Record<string, unknown>;
        readonly currentDate: Readonly<Date>;
        readonly validLabels: ReadonlyMap<string, string>;
        readonly githubRepo: string;
        readonly mergedPullRequests: readonly PullRequestWithLabel[];
        readonly unreleased: false;
        readonly versionNumber: string;
    }) => string;
    readonly prependChangelog: (changelogPath: string, changelog: string) => Promise<void>;
    readonly writePrLogVersion: (version: string) => Promise<void>;
    readonly writeCoreReleaseMetadata: (metadata: CoreReleaseMetadata) => Promise<void>;
};

export const cliReleaseTarget: ReleaseTarget = {
    packageName: 'pr-log',
    changelogPath: 'source/packages/command-line-interface/CHANGELOG.md',
    sourcePathPrefixes: [
        '.github/workflows/',
        'source/core/',
        'source/lib/',
        'source/packages/command-line-interface/'
    ],
    sourceFilePaths: [
        'README.md',
        'justfile',
        'package-lock.json',
        'package.json',
        'packages/pr-log/README.md',
        'packtory.config.js'
    ],
    ignoredAttributionPaths: ['source/packages/command-line-interface/CHANGELOG.md']
};

export const coreReleaseTarget: ReleaseTarget = {
    packageName: '@pr-log/core',
    changelogPath: 'source/packages/core/CHANGELOG.md',
    sourcePathPrefixes: ['.github/workflows/', 'source/core/', 'source/lib/', 'source/packages/core/'],
    sourceFilePaths: [
        'README.md',
        'justfile',
        'package-lock.json',
        'package.json',
        'packages/core/README.md',
        'packtory.config.js'
    ],
    ignoredAttributionPaths: ['source/packages/core/CHANGELOG.md']
};

async function preparePrLogRelease(dependencies: ReleasePreparation): Promise<boolean> {
    const latestCliTag = determineLatestPackageVersionTag(dependencies.tags, cliReleaseTarget.packageName);
    const cliPullRequests = await dependencies.collectMergedPullRequests({
        githubRepo: dependencies.githubRepo,
        baseRef: latestCliTag.tagName
    });
    const labeledCliPullRequests = await dependencies.resolvePullRequestLabels({
        githubRepo: dependencies.githubRepo,
        validLabels: dependencies.validLabels,
        ignoredLabels: dependencies.ignoredLabels,
        pullRequests: cliPullRequests,
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    if (labeledCliPullRequests.length === 0) {
        return false;
    }

    const nextPrLogVersion = selectNextPrLogVersion({
        latestVersion: latestCliTag.version,
        packageInfo: dependencies.packageInfo,
        validLabels: dependencies.validLabels,
        pullRequests: labeledCliPullRequests
    });

    await dependencies.prependChangelog(
        cliReleaseTarget.changelogPath,
        dependencies.renderChangelog({
            packageInfo: dependencies.packageInfo,
            currentDate: dependencies.currentDate,
            validLabels: dependencies.validLabels,
            githubRepo: dependencies.githubRepo,
            mergedPullRequests: labeledCliPullRequests,
            unreleased: false,
            versionNumber: nextPrLogVersion
        })
    );
    await dependencies.writePrLogVersion(nextPrLogVersion);

    return true;
}

async function readCoreTargetPullRequests(dependencies: ReleasePreparation): Promise<{
    readonly latestCoreVersion: string;
    readonly pullRequests: readonly PullRequest[];
}> {
    const latestCoreTag = determineLatestPackageVersionTag(dependencies.tags, coreReleaseTarget.packageName);
    const corePullRequests = await dependencies.collectMergedPullRequests({
        githubRepo: dependencies.githubRepo,
        baseRef: latestCoreTag.tagName
    });
    const changedFilesByPullRequest = await dependencies.readPullRequestChangedFiles({
        githubRepo: dependencies.githubRepo,
        pullRequests: corePullRequests
    });
    const coreTargetPullRequests = filterTargetChangelogPullRequests({
        targetName: coreReleaseTarget.packageName,
        targetSourceFiles: selectReleaseTargetFiles(dependencies.trackedFiles, coreReleaseTarget),
        ignoredAttributionPaths: coreReleaseTarget.ignoredAttributionPaths,
        pullRequests: corePullRequests,
        changedFilesByPullRequest
    });

    return { latestCoreVersion: latestCoreTag.version, pullRequests: coreTargetPullRequests };
}

async function prepareCoreRelease(dependencies: ReleasePreparation): Promise<void> {
    const coreTargetPullRequests = await readCoreTargetPullRequests(dependencies);

    if (coreTargetPullRequests.pullRequests.length === 0) {
        await dependencies.writeCoreReleaseMetadata({
            type: 'no-release',
            predictedVersion: '',
            predictedTagName: ''
        });
        return;
    }

    const labeledCorePullRequests = await dependencies.resolvePullRequestLabels({
        githubRepo: dependencies.githubRepo,
        validLabels: dependencies.validLabels,
        ignoredLabels: dependencies.ignoredLabels,
        pullRequests: coreTargetPullRequests.pullRequests,
        targetName: coreReleaseTarget.packageName,
        targetScopedLabelPattern: undefined
    });
    const predictedCoreVersion = selectNextPatchVersion(coreTargetPullRequests.latestCoreVersion);

    await dependencies.prependChangelog(
        coreReleaseTarget.changelogPath,
        dependencies.renderChangelog({
            packageInfo: dependencies.packageInfo,
            currentDate: dependencies.currentDate,
            validLabels: dependencies.validLabels,
            githubRepo: dependencies.githubRepo,
            mergedPullRequests: labeledCorePullRequests,
            unreleased: false,
            versionNumber: predictedCoreVersion
        })
    );
    await dependencies.writeCoreReleaseMetadata({
        type: 'predicted-release',
        predictedVersion: predictedCoreVersion,
        predictedTagName: formatPackageTag(coreReleaseTarget.packageName, predictedCoreVersion)
    });
}

export async function prepareRelease(dependencies: ReleasePreparation): Promise<void> {
    if (!(await preparePrLogRelease(dependencies))) {
        await dependencies.writeCoreReleaseMetadata({
            type: 'no-release',
            predictedVersion: '',
            predictedTagName: ''
        });
        return;
    }

    await prepareCoreRelease(dependencies);
}
