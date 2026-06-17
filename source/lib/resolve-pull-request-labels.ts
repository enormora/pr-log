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
    readonly ignoredLabels: readonly string[];
    readonly pullRequests: readonly PullRequest[];
    readonly pullRequestLabelReader: PullRequestLabelReader;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly labelLookupIntervalMilliseconds: number;
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

const defaultTargetScopedLabelPattern = '{targetName}:{label}';

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

function escapeRegExp(value: string): string {
    return value.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);
}

function createTargetScopedLabelRegExp(targetName: string, pattern: string): Readonly<RegExp> {
    const escapedPattern = escapeRegExp(pattern);
    const source = escapedPattern
        .replaceAll(escapeRegExp('{targetName}'), escapeRegExp(targetName))
        .replaceAll(escapeRegExp('{label}'), '(?<label>.+)');

    return new RegExp(`^${source}$`, 'u');
}

function resolveTargetScopedLabel(options: {
    readonly validLabels: ReadonlyMap<string, string>;
    readonly pullRequestId: number;
    readonly labels: readonly string[];
    readonly targetName: string;
    readonly targetScopedLabelPattern: string;
}): string | undefined {
    const { validLabels, pullRequestId, labels, targetName, targetScopedLabelPattern } = options;
    const targetScopedLabelRegExp = createTargetScopedLabelRegExp(targetName, targetScopedLabelPattern);
    const targetScopedLabels = labels.flatMap((label) => {
        const match = targetScopedLabelRegExp.exec(label);
        const targetLabel = match?.groups?.label;

        if (targetLabel === undefined) {
            return [];
        }

        if (!validLabels.has(targetLabel)) {
            throw new TypeError(`Pull Request #${pullRequestId} has unknown label "${label}"`);
        }

        return [targetLabel];
    });
    const [targetScopedLabel] = targetScopedLabels;

    if (targetScopedLabels.length > 1) {
        throw new Error(`Pull Request #${pullRequestId} has multiple scoped labels for "${targetName}"`);
    }

    return targetScopedLabel;
}

function resolveLabel(
    input: ResolvePullRequestLabelsInput,
    pullRequest: PullRequest,
    labels: readonly string[]
): string {
    const pullRequestLevelLabel = resolvePullRequestLevelLabel(input.validLabels, pullRequest.id, labels);

    if (input.targetName === undefined) {
        return pullRequestLevelLabel;
    }

    return (
        resolveTargetScopedLabel({
            validLabels: input.validLabels,
            pullRequestId: pullRequest.id,
            labels,
            targetName: input.targetName,
            targetScopedLabelPattern: input.targetScopedLabelPattern ?? defaultTargetScopedLabelPattern
        }) ?? pullRequestLevelLabel
    );
}

function hasIgnoredLabel(labels: readonly string[], ignoredLabels: ReadonlySet<string>): boolean {
    return labels.some((label) => {
        return ignoredLabels.has(label);
    });
}

async function resolvePullRequestLabel(
    input: ResolvePullRequestLabelsInput,
    ignoredLabels: ReadonlySet<string>,
    pullRequest: PullRequest
): Promise<PullRequestWithLabel | undefined> {
    const labels = await input.pullRequestLabelReader.getLabels(input.githubRepo, pullRequest.id);

    if (hasIgnoredLabel(labels, ignoredLabels)) {
        return undefined;
    }

    return {
        id: pullRequest.id,
        title: pullRequest.title,
        label: resolveLabel(input, pullRequest, labels)
    };
}

export async function resolvePullRequestLabels(
    input: ResolvePullRequestLabelsInput
): Promise<readonly PullRequestWithLabel[]> {
    const pullRequestsWithLabels: PullRequestWithLabel[] = [];
    const ignoredLabels = new Set(input.ignoredLabels);

    for (const [pullRequestIndex, pullRequest] of input.pullRequests.entries()) {
        if (pullRequestIndex > 0 && input.labelLookupIntervalMilliseconds > 0) {
            await input.waitForMilliseconds(input.labelLookupIntervalMilliseconds);
        }

        const pullRequestWithLabel = await resolvePullRequestLabel(input, ignoredLabels, pullRequest);

        if (pullRequestWithLabel !== undefined) {
            pullRequestsWithLabels.push(pullRequestWithLabel);
        }
    }

    return pullRequestsWithLabels;
}
