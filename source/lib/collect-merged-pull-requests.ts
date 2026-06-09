import { isUndefined } from '@sindresorhus/is';

export type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type MergeCommitLogEntry = {
    readonly subject: string;
    readonly body: string | undefined;
};

export type GitRangeReader = {
    getMergeCommitLogs(baseRef: string): Promise<readonly MergeCommitLogEntry[]>;
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

function extractPullRequestId(subject: string): number {
    const matches = /^Merge pull request #(?<id>\d+) from .*$/u.exec(subject);
    const pullRequestIdentifier = matches?.groups?.id;

    if (isUndefined(pullRequestIdentifier)) {
        throw new TypeError('Failed to extract pull request id from merge commit log');
    }

    return Number.parseInt(pullRequestIdentifier, 10);
}

async function createPullRequest(
    input: Pick<CollectMergedPullRequestsInput, 'githubRepo' | 'pullRequestTitleReader'>,
    mergeCommitLog: MergeCommitLogEntry
): Promise<PullRequest> {
    const pullRequestId = extractPullRequestId(mergeCommitLog.subject);
    const title = mergeCommitLog.body ?? (await input.pullRequestTitleReader.getTitle(input.githubRepo, pullRequestId));

    return { id: pullRequestId, title };
}

export async function collectMergedPullRequests(
    input: CollectMergedPullRequestsInput
): Promise<readonly PullRequest[]> {
    const mergeCommits = await input.git.getMergeCommitLogs(input.baseRef);

    return Promise.all(
        mergeCommits.map(async (log) => {
            return createPullRequest(input, log);
        })
    );
}
