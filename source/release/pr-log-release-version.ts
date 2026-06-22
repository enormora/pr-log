import type { PullRequest, PullRequestWithLabel } from '../core/pr-log-engine.ts';
import { determineLatestPackageVersionTag, selectNextPrLogVersion } from './release-plan.ts';

export type PrLogReleaseVersionInput = {
    readonly tags: readonly string[];
    readonly packageInfo: Record<string, unknown>;
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
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
};

export async function resolvePrLogReleaseVersion(input: PrLogReleaseVersionInput): Promise<string> {
    const latestTag = determineLatestPackageVersionTag(input.tags, 'pr-log');
    const pullRequests = await input.collectMergedPullRequests({
        githubRepo: input.githubRepo,
        baseRef: latestTag.tagName
    });
    const labeledPullRequests = await input.resolvePullRequestLabels({
        githubRepo: input.githubRepo,
        validLabels: input.validLabels,
        ignoredLabels: input.ignoredLabels,
        pullRequests,
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
