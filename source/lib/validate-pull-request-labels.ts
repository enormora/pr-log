import type { PullRequest } from './collect-merged-pull-requests.ts';
import { getGithubRepoFromPackageInfo, getIgnoredLabels, getValidLabels } from './package-info.ts';
import type { PullRequestWithLabel } from './resolve-pull-request-labels.ts';

type ResolvePullRequestLabels = (input: {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly pullRequests: readonly PullRequest[];
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
}) => Promise<readonly PullRequestWithLabel[]>;

export type PullRequestLabelValidatorDependencies = {
    readonly defaultValidLabels: ReadonlyMap<string, string>;
    readonly packageInfo: Record<string, unknown>;
    readonly resolvePullRequestLabels: ResolvePullRequestLabels;
};

export type PullRequestLabelValidator = {
    validate(pullRequestId: number): Promise<void>;
};

export function createPullRequestLabelValidator(
    dependencies: PullRequestLabelValidatorDependencies
): PullRequestLabelValidator {
    const { defaultValidLabels, packageInfo, resolvePullRequestLabels } = dependencies;

    return {
        async validate(pullRequestId) {
            const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
            const validLabels = getValidLabels(packageInfo, defaultValidLabels);
            const ignoredLabels = getIgnoredLabels(packageInfo);

            await resolvePullRequestLabels({
                githubRepo,
                validLabels,
                ignoredLabels,
                pullRequests: [{ id: pullRequestId, title: '' }],
                targetName: undefined,
                targetScopedLabelPattern: undefined
            });
        }
    };
}
