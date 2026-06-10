import type { Octokit } from '@octokit/rest';
import { splitByString } from '../lib/split.ts';
import {
    resolveChangelogBaseRef as resolveChangelogBaseRefValue,
    resolveLatestSemverTagBaseRef as resolveLatestSemverTagBaseRefValue,
    type ChangelogBaseRef as ChangelogBaseRefValue,
    type PackageChangelogBaseRefInput as PackageChangelogBaseRefInputValue
} from '../lib/changelog-base-ref.ts';
import {
    collectMergedPullRequests as collectMergedPullRequestsValue,
    type GitRangeReader,
    type PullRequest as PullRequestValue,
    type PullRequestTitleReader
} from '../lib/collect-merged-pull-requests.ts';
import {
    filterPullRequestsByTargetFiles as filterPullRequestsByTargetFilesValue,
    type FilterPullRequestsByTargetFilesInput as FilterPullRequestsByTargetFilesInputValue
} from '../lib/filter-pull-requests-by-target-files.ts';
import type { GitCommandRunner } from '../lib/git-command-runner.ts';
import type { GetPullRequestLabels } from '../lib/get-pull-request-label.ts';
import {
    fetchPullRequestChangedFiles as fetchPullRequestChangedFilesValue,
    type PullRequestChangedFilesReader
} from '../lib/pull-request-changed-files.ts';
import {
    resolvePullRequestLabels as resolvePullRequestLabelsValue,
    type PullRequestWithLabel as PullRequestWithLabelValue
} from '../lib/resolve-pull-request-labels.ts';
import {
    renderChangelogMarkdown,
    type RenderChangelogMarkdownInput as RenderChangelogMarkdownInputValue
} from '../lib/render-changelog-markdown.ts';

export type CollectMergedPullRequestsOptions = {
    readonly githubRepo: string;
    readonly baseRef: string;
};

export type ReadPullRequestChangedFilesOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequestValue[];
};

export type ReadPullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequestValue[];
};

export type ResolvePullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly pullRequests: readonly PullRequestValue[];
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

export type PrLogEngine = {
    resolveLatestSemverChangelogBaseRef(): Promise<ChangelogBaseRefValue>;
    resolveChangelogBaseRef(input: PackageChangelogBaseRefInputValue): Promise<ChangelogBaseRefValue>;
    collectMergedPullRequests(input: CollectMergedPullRequestsOptions): Promise<readonly PullRequestValue[]>;
    readPullRequestChangedFiles(
        input: ReadPullRequestChangedFilesOptions
    ): Promise<ReadonlyMap<number, readonly string[]>>;
    readPullRequestLabels(input: ReadPullRequestLabelsOptions): Promise<ReadonlyMap<number, readonly string[]>>;
    filterPullRequestsByTargetFiles(input: FilterPullRequestsByTargetFilesInputValue): readonly PullRequestValue[];
    resolvePullRequestLabels(input: ResolvePullRequestLabelsOptions): Promise<readonly PullRequestWithLabelValue[]>;
    renderChangelog(input: RenderChangelogMarkdownInputValue): string;
};

type PullRequestData = Readonly<Awaited<ReturnType<Octokit['pulls']['get']>>['data']>;

export type PrLogEngineDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly githubClient: Octokit;
    readonly pullRequestChangedFilesReader: PullRequestChangedFilesReader;
    readonly getPullRequestLabels: GetPullRequestLabels;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly labelLookupIntervalMilliseconds: number;
    readonly maximumRateLimitRetryCount: number;
};

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = splitByString(githubRepo, '/');

    if (repo === undefined) {
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

function createPullRequestTitleReader(githubClient: Readonly<Octokit>): PullRequestTitleReader {
    return {
        async getTitle(githubRepo, pullRequestId) {
            return fetchPullRequestTitle(githubClient, githubRepo, pullRequestId);
        }
    };
}

type EnginePullRequestLabelReader = {
    getLabels(githubRepo: string, pullRequestId: number): Promise<readonly string[]>;
};

function createPullRequestLabelReader(dependencies: PrLogEngineDependencies): EnginePullRequestLabelReader {
    return {
        async getLabels(githubRepo: string, pullRequestId: number) {
            const labels = await dependencies.getPullRequestLabels(githubRepo, pullRequestId, dependencies);
            return labels;
        }
    };
}

async function waitBetweenLabelReads(dependencies: PrLogEngineDependencies, pullRequestIndex: number): Promise<void> {
    if (pullRequestIndex > 0 && dependencies.labelLookupIntervalMilliseconds > 0) {
        await dependencies.waitForMilliseconds(dependencies.labelLookupIntervalMilliseconds);
    }
}

async function readPullRequestLabels(
    dependencies: PrLogEngineDependencies,
    input: ReadPullRequestLabelsOptions
): Promise<ReadonlyMap<number, readonly string[]>> {
    const pullRequestLabels = new Map<number, readonly string[]>();
    const pullRequestLabelReader = createPullRequestLabelReader(dependencies);

    for (const [pullRequestIndex, pullRequest] of input.pullRequests.entries()) {
        await waitBetweenLabelReads(dependencies, pullRequestIndex);
        pullRequestLabels.set(pullRequest.id, await pullRequestLabelReader.getLabels(input.githubRepo, pullRequest.id));
    }

    return pullRequestLabels;
}

export function createPrLogEngineWithDependencies(dependencies: PrLogEngineDependencies): PrLogEngine {
    const { gitCommandRunner, githubClient, pullRequestChangedFilesReader } = dependencies;
    const gitRangeReader: GitRangeReader = gitCommandRunner;
    const pullRequestTitleReader = createPullRequestTitleReader(githubClient);

    return {
        async resolveLatestSemverChangelogBaseRef() {
            return resolveLatestSemverTagBaseRefValue({ tags: await gitCommandRunner.listTags() });
        },

        async resolveChangelogBaseRef(input) {
            return resolveChangelogBaseRefValue(input, gitCommandRunner);
        },

        async collectMergedPullRequests(input) {
            return collectMergedPullRequestsValue({
                githubRepo: input.githubRepo,
                baseRef: input.baseRef,
                git: gitRangeReader,
                pullRequestTitleReader
            });
        },

        async readPullRequestChangedFiles(input) {
            return fetchPullRequestChangedFilesValue({
                githubRepo: input.githubRepo,
                pullRequests: input.pullRequests,
                pullRequestChangedFilesReader
            });
        },

        async readPullRequestLabels(input) {
            return readPullRequestLabels(dependencies, input);
        },

        filterPullRequestsByTargetFiles: filterPullRequestsByTargetFilesValue,

        async resolvePullRequestLabels(input) {
            return resolvePullRequestLabelsValue({
                githubRepo: input.githubRepo,
                validLabels: input.validLabels,
                pullRequests: input.pullRequests,
                pullRequestLabelReader: createPullRequestLabelReader(dependencies),
                waitForMilliseconds: dependencies.waitForMilliseconds,
                labelLookupIntervalMilliseconds: dependencies.labelLookupIntervalMilliseconds,
                targetName: input.targetName,
                targetScopedLabelPattern: input.targetScopedLabelPattern
            });
        },

        renderChangelog: renderChangelogMarkdown
    };
}

export type ChangelogBaseRef = ChangelogBaseRefValue;
export type FilterPullRequestsByTargetFilesInput = FilterPullRequestsByTargetFilesInputValue;
export type PackageChangelogBaseRefInput = PackageChangelogBaseRefInputValue;
export type PullRequest = PullRequestValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;
export type RenderChangelogMarkdownInput = RenderChangelogMarkdownInputValue;
