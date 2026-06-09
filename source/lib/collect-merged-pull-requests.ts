import { isUndefined } from '@sindresorhus/is';

export type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type FirstParentCommitLogEntry = {
    readonly hash: string;
    readonly subject: string;
    readonly body: string | undefined;
};

export type GitRangeReader = {
    getFirstParentCommitLogs(baseRef: string): Promise<readonly FirstParentCommitLogEntry[]>;
};

export type PullRequestTitleReader = {
    getTitle(githubRepo: string, pullRequestId: number): Promise<string>;
};

export type CollectMergedPullRequestsInput = {
    readonly githubRepo: string;
    readonly baseRef: string;
    readonly git: GitRangeReader;
    readonly pullRequestTitleReader: PullRequestTitleReader;
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

type PullRequestCommit = MergedPullRequestCommit | RevertedPullRequestCommit;

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

function extractRevertedCommitHash(commitBody: string | undefined): string | undefined {
    const matches = /^This reverts commit (?<hash>[0-9a-f]+)\./mu.exec(commitBody ?? '');
    return matches?.groups?.hash;
}

function collectActiveFirstParentCommitLogs(
    firstParentCommitLogs: readonly FirstParentCommitLogEntry[]
): readonly FirstParentCommitLogEntry[] {
    const firstParentCommitHashes = new Set(
        firstParentCommitLogs.map((firstParentCommitLog) => {
            return firstParentCommitLog.hash;
        })
    );
    const revertedCommitHashes = new Set<string>();

    return firstParentCommitLogs.reduce<readonly FirstParentCommitLogEntry[]>(
        (activeCommitLogs, firstParentCommitLog) => {
            if (revertedCommitHashes.has(firstParentCommitLog.hash)) {
                return activeCommitLogs;
            }

            const revertedCommitHash = extractRevertedCommitHash(firstParentCommitLog.body);
            if (!isUndefined(revertedCommitHash) && firstParentCommitHashes.has(revertedCommitHash)) {
                revertedCommitHashes.add(revertedCommitHash);
                return activeCommitLogs;
            }

            return [...activeCommitLogs, firstParentCommitLog];
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

    return undefined;
}

async function createPullRequest(
    input: Pick<CollectMergedPullRequestsInput, 'githubRepo' | 'pullRequestTitleReader'>,
    firstParentCommitLog: FirstParentCommitLogEntry
): Promise<PullRequest | undefined> {
    const pullRequestCommit = createPullRequestCommit(firstParentCommitLog);

    if (isUndefined(pullRequestCommit)) {
        return undefined;
    }

    if (pullRequestCommit.type === 'revert') {
        const title = await input.pullRequestTitleReader.getTitle(input.githubRepo, pullRequestCommit.id);
        return { id: pullRequestCommit.id, title: `Revert "${title}"` };
    }

    const title =
        pullRequestCommit.title ??
        (await input.pullRequestTitleReader.getTitle(input.githubRepo, pullRequestCommit.id));

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
        activeFirstParentCommitLogs.map(async (log) => {
            return createPullRequest(input, log);
        })
    );

    return pullRequests.filter(isPullRequest);
}
