import type { PullRequest } from './collect-merged-pull-requests.ts';

export type PullRequestWithLabel = PullRequest & {
    readonly label: string;
};

export type PullRequestLabelReader = {
    getLabel(githubRepo: string, validLabels: ReadonlyMap<string, string>, pullRequestId: number): Promise<string>;
};

export type ResolvePullRequestLabelsInput = {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly pullRequests: readonly PullRequest[];
    readonly pullRequestLabelReader: PullRequestLabelReader;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly labelLookupIntervalMilliseconds: number;
};

export async function resolvePullRequestLabels(
    input: ResolvePullRequestLabelsInput
): Promise<readonly PullRequestWithLabel[]> {
    const pullRequestsWithLabels: PullRequestWithLabel[] = [];

    for (const [pullRequestIndex, pullRequest] of input.pullRequests.entries()) {
        if (pullRequestIndex > 0 && input.labelLookupIntervalMilliseconds > 0) {
            await input.waitForMilliseconds(input.labelLookupIntervalMilliseconds);
        }

        const label = await input.pullRequestLabelReader.getLabel(input.githubRepo, input.validLabels, pullRequest.id);

        pullRequestsWithLabels.push({
            id: pullRequest.id,
            title: pullRequest.title,
            label
        });
    }

    return pullRequestsWithLabels;
}
