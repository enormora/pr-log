import { setTimeout as waitForTimeout } from 'node:timers/promises';
import { Octokit } from '@octokit/rest';
import { execaCommand } from 'execa';
import { createGitHubPullRequestChangedFilesReader } from '../../lib/github-pull-request-changed-files.ts';
import { createGitCommandRunner, type GitCommandExecutor } from '../../lib/git-command-runner.ts';
import { getPullRequestLabels } from '../../lib/get-pull-request-label.ts';
import {
    defaultPrLogConfig as defaultPrLogConfigValue,
    type CollapseRule as CollapseRuleValue,
    type PrLogConfig as PrLogConfigValue
} from '../../lib/pr-log-config.ts';
import type {
    MissingChangelogBaseRefError as MissingChangelogBaseRefErrorValue,
    MissingChangelogBaseRefReason as MissingChangelogBaseRefReasonValue
} from '../../lib/changelog-base-ref.ts';
import { defaultValidLabels as defaultValidLabelsValue } from '../../lib/valid-labels.ts';
import {
    createPrLogEngineWithDependencies,
    type ChangelogBaseRef as ChangelogBaseRefValue,
    type CollectMergedPullRequestsOptions as CollectMergedPullRequestsOptionsValue,
    type ExtractChangelogReleaseSectionInput as ExtractChangelogReleaseSectionInputValue,
    type ExtractChangelogReleaseSectionResult as ExtractChangelogReleaseSectionResultValue,
    type FilterPullRequestsByTargetFilesInput as FilterPullRequestsByTargetFilesInputValue,
    type PackageChangelogBaseRefInput as PackageChangelogBaseRefInputValue,
    type PrLogEngine as PrLogEngineValue,
    type PullRequest as PullRequestValue,
    type PullRequestChangedFile as PullRequestChangedFileValue,
    type PullRequestWithLabel as PullRequestWithLabelValue,
    type ReadPullRequestChangedFilesOptions as ReadPullRequestChangedFilesOptionsValue,
    type ReadPullRequestLabelsOptions as ReadPullRequestLabelsOptionsValue,
    type RenderGroupedTargetChangelogMarkdownInput as RenderGroupedTargetChangelogMarkdownInputValue,
    type RenderChangelogMarkdownInput as RenderChangelogMarkdownInputValue,
    type RenderTargetChangelogMarkdownInput as RenderTargetChangelogMarkdownInputValue,
    type ReleaseSectionNotFound as ReleaseSectionNotFoundValue,
    type ResolveVersionNumberInput as ResolveVersionNumberInputValue,
    type ResolvePullRequestLabelsOptions as ResolvePullRequestLabelsOptionsValue,
    type TargetChangelogSection as TargetChangelogSectionValue,
    type UpdateChangelogInput as UpdateChangelogInputValue
} from '../../core/pr-log-engine.ts';

export type PrLogEngineOptions = {
    readonly githubToken: string | undefined;
    readonly workingDirectory: string;
    readonly config: PrLogConfigValue;
};

function createCurrentDate(): Readonly<Date> {
    return new Date();
}

function createGitHubClient(options: Readonly<PrLogEngineOptions>): Readonly<Octokit> {
    return new Octokit({ auth: options.githubToken });
}

export function createPrLogEngine(options: Readonly<PrLogEngineOptions>): PrLogEngineValue {
    const githubClient = createGitHubClient(options);
    const execute: GitCommandExecutor = async function (command) {
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
        config: options.config
    });
}

export const defaultValidLabels: ReadonlyMap<string, string> = new Map(defaultValidLabelsValue);
export const defaultPrLogConfig: PrLogConfigValue = defaultPrLogConfigValue;

export type ChangelogBaseRef = ChangelogBaseRefValue;
export type CollapseRule = CollapseRuleValue;
export type CollectMergedPullRequestsOptions = CollectMergedPullRequestsOptionsValue;
export type ExtractChangelogReleaseSectionInput = ExtractChangelogReleaseSectionInputValue;
export type ExtractChangelogReleaseSectionResult = ExtractChangelogReleaseSectionResultValue;
export type FilterPullRequestsByTargetFilesInput = FilterPullRequestsByTargetFilesInputValue;
export type MissingChangelogBaseRefError = MissingChangelogBaseRefErrorValue;
export type MissingChangelogBaseRefReason = MissingChangelogBaseRefReasonValue;
export type PackageChangelogBaseRefInput = PackageChangelogBaseRefInputValue;
export type PrLogEngine = PrLogEngineValue;
export type PrLogConfig = PrLogConfigValue;
export type PullRequest = PullRequestValue;
export type PullRequestChangedFile = PullRequestChangedFileValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;
export type ReadPullRequestChangedFilesOptions = ReadPullRequestChangedFilesOptionsValue;
export type ReadPullRequestLabelsOptions = ReadPullRequestLabelsOptionsValue;
export type RenderGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputValue;
export type RenderChangelogMarkdownInput = RenderChangelogMarkdownInputValue;
export type RenderTargetChangelogMarkdownInput = RenderTargetChangelogMarkdownInputValue;
export type ReleaseSectionNotFound = ReleaseSectionNotFoundValue;
export type ResolvePullRequestLabelsOptions = ResolvePullRequestLabelsOptionsValue;
export type ResolveVersionNumberInput = ResolveVersionNumberInputValue;
export type TargetChangelogSection = TargetChangelogSectionValue;
export type UpdateChangelogInput = UpdateChangelogInputValue;
