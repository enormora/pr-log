import { resolveLatestSemverTagBaseRef } from './changelog-base-ref.ts';
import {
    collectMergedPullRequests,
    createPullRequestDataReader,
    type PullRequestDataReader
} from './collect-merged-pull-requests.ts';
import { resolvePullRequestLabels } from './resolve-pull-request-labels.ts';

type GitHubLabel = {
    readonly name: string;
};

type PullRequestDataRequest = {
    readonly owner: string;
    readonly repo: string;
    readonly pull_number: number;
};

type PullRequestLabelRequest = {
    readonly owner: string;
    readonly repo: string;
    readonly issue_number: number;
};

type GitHubPullRequestData = {
    readonly title: string;
    readonly merged: boolean;
    readonly merge_commit_sha: string | null;
    readonly labels: readonly GitHubLabel[];
};

type GitHubClient = {
    readonly pulls: {
        readonly get: (request: PullRequestDataRequest) => Promise<{
            readonly data: GitHubPullRequestData;
        }>;
    };
    readonly issues: {
        readonly listLabelsOnIssue: (request: PullRequestLabelRequest) => Promise<{
            readonly data: readonly GitHubLabel[];
        }>;
    };
};

type GitCommandRunner = {
    listTags: () => Promise<readonly string[]>;
    getFirstParentCommitLogs: (from: string) => Promise<readonly FirstParentCommitLogEntry[]>;
};

type FirstParentCommitLogEntry = {
    readonly hash: string;
    readonly parents: readonly string[];
    readonly subject: string;
    readonly body: string | undefined;
};

type GetPullRequestLabelsDependencies = {
    readonly githubClient: GitHubClient;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly maximumRateLimitRetryCount: number;
};

type GetPullRequestLabels = (
    githubRepo: string,
    pullRequestId: number,
    dependencies: GetPullRequestLabelsDependencies
) => Promise<readonly string[]>;

type VersionBumpLevel = 'major' | 'minor' | 'patch';
type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;
type CollapseRule = {
    readonly label: string;
    readonly pattern: RegExp;
    readonly replace: string;
    readonly keyGroup: string;
    readonly fromGroup: string;
    readonly toGroup: string;
};

type PrLogConfig = {
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly versionBumps: VersionBumpConfig;
    readonly dateFormat: string | undefined;
    readonly collapseRules: readonly CollapseRule[];
    readonly labelLookupIntervalMilliseconds: number;
    readonly maximumRateLimitRetryCount: number;
};

export type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type PullRequestWithLabel = PullRequest & {
    readonly label: string;
};

export type GetMergedPullRequestsDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly getPullRequestLabels: GetPullRequestLabels;
    readonly githubClient: GitHubClient;
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
