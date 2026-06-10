import { setTimeout as waitForTimeout } from 'node:timers/promises';
import { Octokit } from '@octokit/rest';
import { execaCommand } from 'execa';
import { createGitHubPullRequestChangedFilesReader } from '../../lib/github-pull-request-changed-files.ts';
import { createGitCommandRunner, type GitCommandExecutor } from '../../lib/git-command-runner.ts';
import { getPullRequestLabels } from '../../lib/get-pull-request-label.ts';
import { defaultValidLabels as defaultValidLabelsValue } from '../../lib/valid-labels.ts';
import {
    createPrLogEngineWithDependencies,
    type ChangelogBaseRef as ChangelogBaseRefValue,
    type CollectMergedPullRequestsOptions as CollectMergedPullRequestsOptionsValue,
    type FilterPullRequestsByTargetFilesInput as FilterPullRequestsByTargetFilesInputValue,
    type PackageChangelogBaseRefInput as PackageChangelogBaseRefInputValue,
    type PrLogEngine as PrLogEngineValue,
    type PullRequest as PullRequestValue,
    type PullRequestWithLabel as PullRequestWithLabelValue,
    type ReadPullRequestChangedFilesOptions as ReadPullRequestChangedFilesOptionsValue,
    type ReadPullRequestLabelsOptions as ReadPullRequestLabelsOptionsValue,
    type RenderGroupedTargetChangelogMarkdownInput as RenderGroupedTargetChangelogMarkdownInputValue,
    type RenderChangelogMarkdownInput as RenderChangelogMarkdownInputValue,
    type RenderTargetChangelogMarkdownInput as RenderTargetChangelogMarkdownInputValue,
    type ResolvePullRequestLabelsOptions as ResolvePullRequestLabelsOptionsValue,
    type TargetChangelogSection as TargetChangelogSectionValue
} from '../../core/pr-log-engine.ts';

export type PrLogEngineOptions = {
    readonly githubToken: string | undefined;
    readonly workingDirectory: string;
    readonly labelLookupIntervalMilliseconds: number;
    readonly maximumRateLimitRetryCount: number;
};

function createCurrentDate(): Readonly<Date> {
    return new Date();
}

function createGitHubClient(options: Readonly<PrLogEngineOptions>): Readonly<Octokit> {
    return new Octokit({ auth: options.githubToken });
}

export function createPrLogEngine(options: Readonly<PrLogEngineOptions>): PrLogEngineValue {
    const githubClient = createGitHubClient(options);
    const execute: GitCommandExecutor = async (command) => {
        return execaCommand(command, { cwd: options.workingDirectory });
    };
    const gitCommandRunner = createGitCommandRunner({ execute });

    return createPrLogEngineWithDependencies({
        githubClient,
        gitCommandRunner,
        pullRequestChangedFilesReader: createGitHubPullRequestChangedFilesReader(githubClient),
        getPullRequestLabels,
        waitForMilliseconds: waitForTimeout,
        getCurrentDate: createCurrentDate,
        labelLookupIntervalMilliseconds: options.labelLookupIntervalMilliseconds,
        maximumRateLimitRetryCount: options.maximumRateLimitRetryCount
    });
}

export const defaultValidLabels: ReadonlyMap<string, string> = new Map(defaultValidLabelsValue);

export type ChangelogBaseRef = ChangelogBaseRefValue;
export type CollectMergedPullRequestsOptions = CollectMergedPullRequestsOptionsValue;
export type FilterPullRequestsByTargetFilesInput = FilterPullRequestsByTargetFilesInputValue;
export type PackageChangelogBaseRefInput = PackageChangelogBaseRefInputValue;
export type PrLogEngine = PrLogEngineValue;
export type PullRequest = PullRequestValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;
export type ReadPullRequestChangedFilesOptions = ReadPullRequestChangedFilesOptionsValue;
export type ReadPullRequestLabelsOptions = ReadPullRequestLabelsOptionsValue;
export type RenderGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputValue;
export type RenderChangelogMarkdownInput = RenderChangelogMarkdownInputValue;
export type RenderTargetChangelogMarkdownInput = RenderTargetChangelogMarkdownInputValue;
export type ResolvePullRequestLabelsOptions = ResolvePullRequestLabelsOptionsValue;
export type TargetChangelogSection = TargetChangelogSectionValue;
