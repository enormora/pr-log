import type { Octokit } from '@octokit/rest';
import type { GetPullRequestLabels } from './get-pull-request-label.ts';
import type { GitCommandRunner } from './git-command-runner.ts';
import { resolveLatestSemverTagBaseRef } from './changelog-base-ref.ts';
import {
    collectMergedPullRequests,
    type PullRequest as PullRequestValue,
    type PullRequestTitleReader
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

type PullRequestData = Readonly<Awaited<ReturnType<Octokit['pulls']['get']>>['data']>;

const repositoryPathPartLimit = 2;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [ owner, repo ] = githubRepo.split('/', repositoryPathPartLimit);

    if (owner === undefined || repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [ owner, repo ];
}

async function fetchPullRequestTitle(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<string> {
    const [ owner, repo ] = determineRepoDetails(githubRepo);
    const { data: pullRequest } = await githubClient.pulls.get({
        owner,
        repo,
        pull_number: pullRequestId
    });

    return (pullRequest as PullRequestData).title;
}

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const { gitCommandRunner, getPullRequestLabels, githubClient, waitForMilliseconds } = dependencies;

    async function getLatestVersionTag(): Promise<string> {
        const tags = await gitCommandRunner.listTags();
        return resolveLatestSemverTagBaseRef({ tags }).ref;
    }

    async function getPullRequests(fromTag: string, githubRepo: string): Promise<readonly PullRequest[]> {
        const pullRequestTitleReader: PullRequestTitleReader = {
            async getTitle(repo, pullRequestId) {
                return fetchPullRequestTitle(githubClient, repo, pullRequestId);
            }
        };

        return collectMergedPullRequests({
            githubRepo,
            baseRef: fromTag,
            git: gitCommandRunner,
            pullRequestTitleReader
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
                    return getPullRequestLabels(repo, pullRequestId, {
                        ...dependencies,
                        maximumRateLimitRetryCount: config.maximumRateLimitRetryCount
                    });
                }
            }
        });

        return pullRequestsWithLabels;
    };
}
