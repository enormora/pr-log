type PullRequest = {
    readonly id: number;
    readonly title: string;
};

export type PullRequestChangedFile = {
    readonly path: string;
    readonly previousPath: string | undefined;
    readonly status: string;
    readonly additions: number;
    readonly deletions: number;
    readonly changes: number;
};

export type PullRequestChangedFilesReader = {
    getChangedFiles: (githubRepo: string, pullRequestId: number) => Promise<readonly PullRequestChangedFile[]>;
};

export type FetchPullRequestChangedFilesInput = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequest[];
    readonly pullRequestChangedFilesReader: PullRequestChangedFilesReader;
};

export async function fetchPullRequestChangedFiles(
    input: FetchPullRequestChangedFilesInput
): Promise<ReadonlyMap<number, readonly PullRequestChangedFile[]>> {
    const filesByPullRequest = new Map<number, readonly PullRequestChangedFile[]>();

    for (const pullRequest of input.pullRequests) {
        filesByPullRequest.set(
            pullRequest.id,
            await input.pullRequestChangedFilesReader.getChangedFiles(input.githubRepo, pullRequest.id)
        );
    }

    return filesByPullRequest;
}
