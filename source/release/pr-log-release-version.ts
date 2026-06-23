import type { PullRequest, PullRequestWithLabel } from '../core/pr-log-engine.ts';
import type { FilterPullRequestsByTargetFilesInput } from '../lib/filter-pull-requests-by-target-files.ts';
import {
    determineLatestPackageVersionTag,
    formatPackageTag,
    type PackageVersionTag,
    selectNextPrLogVersion
} from './release-plan.ts';

export type PrLogReleaseVersionInput = {
    readonly tags: readonly string[];
    readonly currentVersion: string | undefined;
    readonly packageInfo: Record<string, unknown>;
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly targetSourceFiles: readonly string[];
    readonly ignoredAttributionPaths: readonly string[];
    readonly collectMergedPullRequests: (input: {
        readonly githubRepo: string;
        readonly baseRef: string;
    }) => Promise<readonly PullRequest[]>;
    readonly readPullRequestChangedFiles: (input: {
        readonly githubRepo: string;
        readonly pullRequests: readonly PullRequest[];
    }) => Promise<ReadonlyMap<number, readonly string[]>>;
    readonly filterPullRequestsByTargetFiles: (input: FilterPullRequestsByTargetFilesInput) => readonly PullRequest[];
    readonly resolvePullRequestLabels: (input: {
        readonly githubRepo: string;
        readonly validLabels: ReadonlyMap<string, string>;
        readonly ignoredLabels: readonly string[];
        readonly pullRequests: readonly PullRequest[];
        readonly targetName: string | undefined;
        readonly targetScopedLabelPattern: string | undefined;
    }) => Promise<readonly PullRequestWithLabel[]>;
};

function determineReleaseBase(input: Pick<PrLogReleaseVersionInput, 'currentVersion' | 'tags'>): PackageVersionTag {
    if (input.currentVersion !== undefined) {
        return {
            tagName: formatPackageTag('pr-log', input.currentVersion),
            version: input.currentVersion
        };
    }

    return determineLatestPackageVersionTag(input.tags, 'pr-log');
}

export async function resolvePrLogReleaseVersion(input: PrLogReleaseVersionInput): Promise<string> {
    const latestTag = determineReleaseBase(input);
    const pullRequests = await input.collectMergedPullRequests({
        githubRepo: input.githubRepo,
        baseRef: latestTag.tagName
    });
    const changedFilesByPullRequest = await input.readPullRequestChangedFiles({
        githubRepo: input.githubRepo,
        pullRequests
    });
    const targetPullRequests = input.filterPullRequestsByTargetFiles({
        targetName: 'pr-log',
        targetSourceFiles: input.targetSourceFiles,
        pullRequests,
        changedFilesByPullRequest,
        ignoredAttributionPaths: input.ignoredAttributionPaths
    });
    const labeledPullRequests = await input.resolvePullRequestLabels({
        githubRepo: input.githubRepo,
        validLabels: input.validLabels,
        ignoredLabels: input.ignoredLabels,
        pullRequests: targetPullRequests,
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    if (labeledPullRequests.length === 0) {
        return latestTag.version;
    }

    return selectNextPrLogVersion({
        latestVersion: latestTag.version,
        packageInfo: input.packageInfo,
        validLabels: input.validLabels,
        pullRequests: labeledPullRequests
    });
}
