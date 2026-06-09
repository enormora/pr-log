import type { PullRequest } from './collect-merged-pull-requests.ts';

export type PullRequestWithLabel = PullRequest & {
    readonly label: string;
};

export type PullRequestLabelReader = {
    getLabels(githubRepo: string, pullRequestId: number): Promise<readonly string[]>;
};

export type ResolvePullRequestLabelsInput = {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly pullRequests: readonly PullRequest[];
    readonly pullRequestLabelReader: PullRequestLabelReader;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly labelLookupIntervalMilliseconds: number;
};

function formatLabelList(validLabels: ReadonlyMap<string, string>): string {
    return Array.from(validLabels.keys()).join(', ');
}

function resolvePullRequestLevelLabel(
    validLabels: ReadonlyMap<string, string>,
    pullRequestId: number,
    labels: readonly string[]
): string {
    const validLabelNames = new Set(validLabels.keys());
    const matchingLabels = labels.filter((label) => {
        return validLabelNames.has(label);
    });
    const [label] = matchingLabels;
    const listOfLabels = formatLabelList(validLabels);

    if (matchingLabels.length > 1) {
        throw new Error(`Pull Request #${pullRequestId} has multiple labels of ${listOfLabels}`);
    }

    if (label === undefined) {
        throw new TypeError(`Pull Request #${pullRequestId} has no label of ${listOfLabels}`);
    }

    return label;
}

export async function resolvePullRequestLabels(
    input: ResolvePullRequestLabelsInput
): Promise<readonly PullRequestWithLabel[]> {
    const pullRequestsWithLabels: PullRequestWithLabel[] = [];

    for (const [pullRequestIndex, pullRequest] of input.pullRequests.entries()) {
        if (pullRequestIndex > 0 && input.labelLookupIntervalMilliseconds > 0) {
            await input.waitForMilliseconds(input.labelLookupIntervalMilliseconds);
        }

        const labels = await input.pullRequestLabelReader.getLabels(input.githubRepo, pullRequest.id);
        const label = resolvePullRequestLevelLabel(input.validLabels, pullRequest.id, labels);

        pullRequestsWithLabels.push({
            id: pullRequest.id,
            title: pullRequest.title,
            label
        });
    }

    return pullRequestsWithLabels;
}
