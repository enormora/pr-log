import type { Octokit } from '@octokit/rest';
import type { GetPullRequestLabels } from './get-pull-request-label.ts';
import type { GitCommandRunner } from './git-command-runner.ts';
import { resolveLatestSemverTagBaseRef } from './changelog-base-ref.ts';
import {
    collectMergedPullRequests,
    createPullRequestDataReader,
    type PullRequestDataReader,
    type PullRequest as PullRequestValue
} from './collect-merged-pull-requests.ts';
import {
    resolvePullRequestLabels,
    type PullRequestWithLabel as PullRequestWithLabelValue
} from './resolve-pull-request-labels.ts';
import type { PrLogConfig } from './pr-log-config.ts';

export type PullRequest = PullRequestValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;

export type GetMergedPullRequestsDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly getPullRequestLabels: GetPullRequestLabels;
    readonly githubClient: Octokit;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly getCurrentDate: () => Readonly<Date>;
};

export type GetMergedPullRequests = (
    repo: string,
    config: PrLogConfig
) => Promise<readonly PullRequestWithLabel[]>;

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const { gitCommandRunner, getPullRequestLabels, githubClient, waitForMilliseconds } = dependencies;
    const pullRequestDataReader = createPullRequestDataReader(githubClient);

    async function getLatestVersionTag(): Promise<string> {
        const tags = await gitCommandRunner.listTags();
        return resolveLatestSemverTagBaseRef({ tags }).ref;
    }

    async function getPullRequests(fromTag: string, githubRepo: string): Promise<readonly PullRequest[]> {
        return collectMergedPullRequests({
            githubRepo,
            baseRef: fromTag,
            git: gitCommandRunner,
            pullRequestDataReader
        });
    }

    async function readLabels(
        config: PrLogConfig,
        githubRepo: string,
        pullRequestId: number,
        reader: PullRequestDataReader
    ): Promise<readonly string[]> {
        const cachedLabels = reader.readCachedPullRequestLabels(githubRepo, pullRequestId);
        if (cachedLabels !== undefined) {
            return cachedLabels;
        }

        return getPullRequestLabels(githubRepo, pullRequestId, {
            ...dependencies,
            maximumRateLimitRetryCount: config.maximumRateLimitRetryCount
        });
    }

    return async function getMergedPullRequests(
        githubRepo: string,
        config: PrLogConfig
    ) {
        const latestVersionTag = await getLatestVersionTag();
        const pullRequests = await getPullRequests(latestVersionTag, githubRepo);
        const pullRequestsWithLabels = await resolvePullRequestLabels({
            githubRepo,
            validLabels: config.validLabels,
            ignoredLabels: config.ignoredLabels,
            pullRequests,
            waitForMilliseconds,
            labelLookupIntervalMilliseconds: config.labelLookupIntervalMilliseconds,
            targetName: undefined,
            targetScopedLabelPattern: undefined,
            pullRequestLabelReader: {
                async getLabels(repo, pullRequestId) {
                    return readLabels(config, repo, pullRequestId, pullRequestDataReader);
                }
            }
        });

        return pullRequestsWithLabels;
    };
}
