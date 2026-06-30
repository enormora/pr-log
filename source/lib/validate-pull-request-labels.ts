import type { PullRequest } from './collect-merged-pull-requests.ts';
import { getGithubRepoFromPackageInfo } from './package-info.ts';
import {
    createPrLogConfigFromPackageInfo,
    type PrLogConfig
} from './pr-log-config.ts';
import type { PullRequestWithLabel } from './resolve-pull-request-labels.ts';

type ResolvePullRequestLabelsInput = {
    readonly githubRepo: string;
    readonly config: PrLogConfig;
    readonly pullRequests: readonly PullRequest[];
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

type ResolvePullRequestLabels = (input: ResolvePullRequestLabelsInput) => Promise<readonly PullRequestWithLabel[]>;

export type PullRequestLabelValidatorDependencies = {
    readonly defaultPrLogConfig: PrLogConfig;
    readonly packageInfo: Readonly<Record<string, unknown>>;
    readonly resolvePullRequestLabels: ResolvePullRequestLabels;
};

export type PullRequestLabelValidator = {
    validate: (pullRequestId: number) => Promise<void>;
};

export function createPullRequestLabelValidator(
    dependencies: PullRequestLabelValidatorDependencies
): PullRequestLabelValidator {
    const { defaultPrLogConfig, packageInfo, resolvePullRequestLabels } = dependencies;

    return {
        async validate(pullRequestId) {
            const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
            const config = createPrLogConfigFromPackageInfo(packageInfo, defaultPrLogConfig);

            await resolvePullRequestLabels({
                githubRepo,
                config,
                pullRequests: [ { id: pullRequestId, title: '' } ],
                targetName: undefined,
                targetScopedLabelPattern: undefined
            });
        }
    };
}
