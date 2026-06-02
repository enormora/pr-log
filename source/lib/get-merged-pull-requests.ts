import type { Octokit } from '@octokit/rest';
import type { GetPullRequestLabel } from './get-pull-request-label.ts';
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

export type PullRequest = PullRequestValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;

export type GetMergedPullRequestsDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly getPullRequestLabel: GetPullRequestLabel;
    readonly githubClient: Octokit;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly labelLookupIntervalMilliseconds: number;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly maximumRateLimitRetryCount: number;
};

export type GetMergedPullRequests = (
    repo: string,
    validLabels: ReadonlyMap<string, string>
) => Promise<readonly PullRequestWithLabel[]>;

type PullRequestData = Readonly<Awaited<ReturnType<Octokit['pulls']['get']>>['data']>;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = githubRepo.split('/');

    if (owner === undefined || repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [owner, repo];
}

async function fetchPullRequestTitle(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<string> {
    const [owner, repo] = determineRepoDetails(githubRepo);
    const { data: pullRequest } = await githubClient.pulls.get({
        owner,
        repo,
        pull_number: pullRequestId
    });

    return (pullRequest as PullRequestData).title;
}

export function getMergedPullRequestsFactory(dependencies: GetMergedPullRequestsDependencies): GetMergedPullRequests {
    const {
        gitCommandRunner,
        getPullRequestLabel,
        githubClient,
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    } = dependencies;

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

    return async function getMergedPullRequests(githubRepo: string, validLabels: ReadonlyMap<string, string>) {
        const latestVersionTag = await getLatestVersionTag();
        const pullRequests = await getPullRequests(latestVersionTag, githubRepo);
        const pullRequestsWithLabels = await resolvePullRequestLabels({
            githubRepo,
            validLabels,
            pullRequests,
            waitForMilliseconds,
            labelLookupIntervalMilliseconds,
            pullRequestLabelReader: {
                async getLabel(repo, labels, pullRequestId) {
                    return getPullRequestLabel(repo, labels, pullRequestId, dependencies);
                }
            }
        });

        return pullRequestsWithLabels;
    };
}
