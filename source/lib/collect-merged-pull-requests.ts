import { isError, isFiniteNumber, isUndefined } from '@sindresorhus/is';
import { splitByString } from './split.ts';

type PullRequestDataRequest = {
    readonly owner: string;
    readonly repo: string;
    readonly pull_number: number;
};

type GitHubLabel = {
    readonly name: string;
};

type GitHubPullRequestData = {
    readonly title: string;
    readonly merged: boolean;
    readonly merge_commit_sha: string | null;
    readonly labels: readonly GitHubLabel[];
};

type PullRequestDataResponse = {
    readonly data: GitHubPullRequestData;
};

export type PullRequestDataGitHubClient = {
    readonly pulls: {
        readonly get: (request: PullRequestDataRequest) => Promise<PullRequestDataResponse>;
    };
};

export type PullRequestData = {
    readonly title: string;
    readonly merged: boolean;
    readonly mergeCommitSha: string | null;
    readonly labels: readonly string[];
};

export type PullRequestDataReader = {
    readonly readPullRequestData: (
        githubRepo: string,
        pullRequestId: number
    ) => Promise<PullRequestData | undefined>;
    readonly readCachedPullRequestLabels: (
        githubRepo: string,
        pullRequestId: number
    ) => readonly string[] | undefined;
};

type GitHubClientError = {
    readonly status: number | undefined;
};

type ErrorStatusCarrier = Readonly<Record<'status', unknown>>;

const notFoundStatusCode = 404;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [ owner, repo ] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [ owner, repo ];
}

function createCacheKey(githubRepo: string, pullRequestId: number): string {
    return `${githubRepo}#${pullRequestId}`;
}

function hasErrorStatus(error: unknown): error is ErrorStatusCarrier {
    return isError(error) && Object.hasOwn(error, 'status');
}

function getGitHubClientError(error: unknown): GitHubClientError | undefined {
    if (!isError(error)) {
        return undefined;
    }

    const status = hasErrorStatus(error) ? error.status : undefined;
    return { status: isFiniteNumber(status) ? status : undefined };
}

function createPullRequestData(data: GitHubPullRequestData): PullRequestData {
    return {
        title: data.title,
        merged: data.merged,
        mergeCommitSha: data.merge_commit_sha,
        labels: data.labels.map(function (label) {
            return label.name;
        })
    };
}

async function fetchPullRequestData(
    githubClient: PullRequestDataGitHubClient,
    githubRepo: string,
    pullRequestId: number
): Promise<PullRequestData | undefined> {
    const [ owner, repo ] = determineRepoDetails(githubRepo);

    try {
        const { data } = await githubClient.pulls.get({
            owner,
            repo,
            pull_number: pullRequestId
        });
        return createPullRequestData(data);
    } catch (error) {
        const githubClientError = getGitHubClientError(error);
        if (githubClientError?.status === notFoundStatusCode) {
            return undefined;
        }

        throw error;
    }
}

export function createPullRequestDataReader(
    githubClient: PullRequestDataGitHubClient
): PullRequestDataReader {
    const resolvedPullRequestData = new Map<string, PullRequestData | undefined>();
    const pendingPullRequestData = new Map<string, Promise<PullRequestData | undefined>>();

    async function readUncachedPullRequestData(
        cacheKey: string,
        githubRepo: string,
        pullRequestId: number
    ): Promise<PullRequestData | undefined> {
        try {
            const pullRequestData = await fetchPullRequestData(githubClient, githubRepo, pullRequestId);
            resolvedPullRequestData.set(cacheKey, pullRequestData);
            return pullRequestData;
        } finally {
            pendingPullRequestData.delete(cacheKey);
        }
    }

    async function readPullRequestData(
        githubRepo: string,
        pullRequestId: number
    ): Promise<PullRequestData | undefined> {
        const cacheKey = createCacheKey(githubRepo, pullRequestId);
        if (resolvedPullRequestData.has(cacheKey)) {
            return resolvedPullRequestData.get(cacheKey);
        }

        const pendingData = pendingPullRequestData.get(cacheKey);
        if (pendingData !== undefined) {
            return pendingData;
        }

        const data = readUncachedPullRequestData(cacheKey, githubRepo, pullRequestId);
        pendingPullRequestData.set(cacheKey, data);

        return data;
    }

    function readCachedPullRequestLabels(
        githubRepo: string,
        pullRequestId: number
    ): readonly string[] | undefined {
        return resolvedPullRequestData.get(createCacheKey(githubRepo, pullRequestId))?.labels;
    }

    return { readPullRequestData, readCachedPullRequestLabels };
}

export type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type FirstParentCommitLogEntry = {
    readonly hash: string;
    readonly parents: readonly string[];
    readonly subject: string;
    readonly body: string | undefined;
};

export type GitRangeReader = {
    getFirstParentCommitLogs: (baseRef: string) => Promise<readonly FirstParentCommitLogEntry[]>;
};

export type CollectMergedPullRequestsInput = {
    readonly githubRepo: string;
    readonly baseRef: string;
    readonly git: GitRangeReader;
    readonly pullRequestDataReader: PullRequestDataReader;
};

type MergedPullRequestCommit = {
    readonly type: 'merge';
    readonly id: number;
    readonly title: string | undefined;
};

type RevertedPullRequestCommit = {
    readonly type: 'revert';
    readonly id: number;
};

type PullRequestSubjectCommit = {
    readonly type: 'pull-request-subject';
    readonly id: number;
    readonly title: string;
    readonly hash: string;
    readonly parentCount: number;
};

type PullRequestSubjectMatch = {
    readonly pullRequestIdentifier: string;
    readonly title: string;
};

type PullRequestCommit = MergedPullRequestCommit | PullRequestSubjectCommit | RevertedPullRequestCommit;

const singleParentCommitParentCount = 1;

function parsePullRequestId(value: string): number {
    return Number.parseInt(value, 10);
}

function extractPullRequestId(subject: string): number | undefined {
    const matches = /^Merge pull request #(?<id>\d+) from .*$/u.exec(subject);
    const pullRequestIdentifier = matches?.groups?.id;

    if (isUndefined(pullRequestIdentifier)) {
        if (subject.startsWith('Merge pull request ')) {
            throw new TypeError('Failed to extract pull request id from merge commit log');
        }

        return undefined;
    }

    return parsePullRequestId(pullRequestIdentifier);
}

function extractRevertedPullRequestId(subject: string): number | undefined {
    const matches = /^Revert "Merge pull request #(?<id>\d+) from .*"$/u.exec(subject);
    const pullRequestIdentifier = matches?.groups?.id;

    if (isUndefined(pullRequestIdentifier)) {
        if (subject.startsWith('Revert "Merge pull request ')) {
            throw new TypeError('Failed to extract pull request id from reverted merge commit log');
        }

        return undefined;
    }

    return parsePullRequestId(pullRequestIdentifier);
}

function getPullRequestSubjectMatch(subject: string): PullRequestSubjectMatch | undefined {
    const groups = /^(?<title>.+) \(#(?<pullRequestIdentifier>\d+)\)$/u.exec(subject)?.groups;
    const pullRequestIdentifier = groups?.pullRequestIdentifier;
    const title = groups?.title;

    if (isUndefined(pullRequestIdentifier) || isUndefined(title)) {
        return undefined;
    }

    return { pullRequestIdentifier, title };
}

function extractPullRequestSubjectCommit(
    firstParentCommitLog: FirstParentCommitLogEntry
): PullRequestSubjectCommit | undefined {
    const match = getPullRequestSubjectMatch(firstParentCommitLog.subject);

    if (match === undefined) {
        return undefined;
    }

    return {
        type: 'pull-request-subject',
        id: parsePullRequestId(match.pullRequestIdentifier),
        title: match.title,
        hash: firstParentCommitLog.hash,
        parentCount: firstParentCommitLog.parents.length
    };
}

function extractRevertedCommitHash(commitBody: string | undefined): string | undefined {
    const matches = /^This reverts commit (?<hash>[0-9a-f]+)\./mu.exec(commitBody ?? '');
    return matches?.groups?.hash;
}

function collectActiveFirstParentCommitLogs(
    firstParentCommitLogs: readonly FirstParentCommitLogEntry[]
): readonly FirstParentCommitLogEntry[] {
    const firstParentCommitHashes = new Set(
        firstParentCommitLogs.map(function (firstParentCommitLog) {
            return firstParentCommitLog.hash;
        })
    );
    const revertedCommitHashes = new Set<string>();

    return firstParentCommitLogs.reduce<readonly FirstParentCommitLogEntry[]>(
        function (activeCommitLogs, firstParentCommitLog) {
            if (revertedCommitHashes.has(firstParentCommitLog.hash)) {
                return activeCommitLogs;
            }

            const revertedCommitHash = extractRevertedCommitHash(firstParentCommitLog.body);
            if (!isUndefined(revertedCommitHash) && firstParentCommitHashes.has(revertedCommitHash)) {
                revertedCommitHashes.add(revertedCommitHash);
                return activeCommitLogs;
            }

            return [ ...activeCommitLogs, firstParentCommitLog ];
        },
        []
    );
}

function createPullRequestCommit(firstParentCommitLog: FirstParentCommitLogEntry): PullRequestCommit | undefined {
    const pullRequestId = extractPullRequestId(firstParentCommitLog.subject);

    if (!isUndefined(pullRequestId)) {
        return { type: 'merge', id: pullRequestId, title: firstParentCommitLog.body };
    }

    const revertedPullRequestId = extractRevertedPullRequestId(firstParentCommitLog.subject);

    if (!isUndefined(revertedPullRequestId)) {
        return { type: 'revert', id: revertedPullRequestId };
    }

    return extractPullRequestSubjectCommit(firstParentCommitLog);
}

async function readPullRequestTitle(
    input: Pick<CollectMergedPullRequestsInput, 'githubRepo' | 'pullRequestDataReader'>,
    pullRequestId: number
): Promise<string> {
    const pullRequestData = await input.pullRequestDataReader.readPullRequestData(input.githubRepo, pullRequestId);
    if (pullRequestData === undefined) {
        throw new TypeError(`Pull Request #${pullRequestId} was not found`);
    }

    return pullRequestData.title;
}

async function createPullRequestFromSubjectCommit(
    input: Pick<
        CollectMergedPullRequestsInput,
        'githubRepo' | 'pullRequestDataReader'
    >,
    pullRequestCommit: PullRequestSubjectCommit
): Promise<PullRequest | undefined> {
    if (pullRequestCommit.parentCount !== singleParentCommitParentCount) {
        return undefined;
    }

    const pullRequestData = await input.pullRequestDataReader.readPullRequestData(
        input.githubRepo,
        pullRequestCommit.id
    );
    if (pullRequestData === undefined) {
        return undefined;
    }

    if (!pullRequestData.merged || pullRequestData.mergeCommitSha !== pullRequestCommit.hash) {
        return undefined;
    }

    return { id: pullRequestCommit.id, title: pullRequestCommit.title };
}

async function createPullRequest(
    input: Pick<CollectMergedPullRequestsInput, 'githubRepo' | 'pullRequestDataReader'>,
    firstParentCommitLog: FirstParentCommitLogEntry
): Promise<PullRequest | undefined> {
    const pullRequestCommit = createPullRequestCommit(firstParentCommitLog);

    if (isUndefined(pullRequestCommit)) {
        return undefined;
    }

    if (pullRequestCommit.type === 'revert') {
        const title = await readPullRequestTitle(input, pullRequestCommit.id);
        return { id: pullRequestCommit.id, title: `Revert "${title}"` };
    }

    if (pullRequestCommit.type === 'pull-request-subject') {
        return createPullRequestFromSubjectCommit(input, pullRequestCommit);
    }

    const title = pullRequestCommit.title ??
        await readPullRequestTitle(input, pullRequestCommit.id);

    return { id: pullRequestCommit.id, title };
}

function isPullRequest(pullRequest: PullRequest | undefined): pullRequest is PullRequest {
    return !isUndefined(pullRequest);
}

export async function collectMergedPullRequests(
    input: CollectMergedPullRequestsInput
): Promise<readonly PullRequest[]> {
    const firstParentCommitLogs = await input.git.getFirstParentCommitLogs(input.baseRef);
    const activeFirstParentCommitLogs = collectActiveFirstParentCommitLogs(firstParentCommitLogs);
    const pullRequests = await Promise.all(
        activeFirstParentCommitLogs.map(async function (log) {
            return createPullRequest(input, log);
        })
    );

    return pullRequests.filter(isPullRequest);
}
