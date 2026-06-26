import type { PullRequest } from './collect-merged-pull-requests.ts';

export type PullRequestChangedFilesReader = {
    getChangedFiles: (githubRepo: string, pullRequestId: number) => Promise<readonly string[]>;
};

export type FetchPullRequestChangedFilesInput = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequest[];
    readonly pullRequestChangedFilesReader: PullRequestChangedFilesReader;
};

export async function fetchPullRequestChangedFiles(
    input: FetchPullRequestChangedFilesInput
): Promise<ReadonlyMap<number, readonly string[]>> {
    const filesByPullRequest = new Map<number, readonly string[]>();

    for (const pullRequest of input.pullRequests) {
        filesByPullRequest.set(
            pullRequest.id,
            await input.pullRequestChangedFilesReader.getChangedFiles(input.githubRepo, pullRequest.id)
        );
    }

    return filesByPullRequest;
}
