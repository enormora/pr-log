import { setTimeout as waitForTimeout } from 'node:timers/promises';
import { Octokit } from '@octokit/rest';
import { execa } from 'execa';
import { createGitHubPullRequestChangedFilesReader } from '../../lib/github-pull-request-changed-files.ts';
import { createCommandStringExecutor, createGitCommandRunner } from '../../lib/git-command-runner.ts';
import { getPullRequestLabels } from '../../lib/get-pull-request-label.ts';
import { defaultPrLogConfig as defaultPrLogConfigValue } from '../../lib/pr-log-config.ts';
import { defaultValidLabels as defaultValidLabelsValue } from '../../lib/valid-labels.ts';
import { createPrLogEngineWithDependencies } from '../../core/pr-log-engine.ts';
import { createGitHubClient } from './github-client.ts';

type GitHubClientOptions = {
    readonly githubToken: string | undefined;
    readonly githubApiBaseUrl?: string | undefined;
};

type VersionBumpLevel = 'major' | 'minor' | 'patch';
type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;

export type PrLogEngineOptions = GitHubClientOptions & {
    readonly workingDirectory: string;
    readonly config: PrLogConfig;
};

export type CollapseRule = {
    readonly label: string;
    readonly pattern: RegExp;
    readonly replace: string;
    readonly keyGroup: string;
    readonly fromGroup: string;
    readonly toGroup: string;
};

export type PrLogConfig = {
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly versionBumps: VersionBumpConfig;
    readonly dateFormat: string | undefined;
    readonly collapseRules: readonly CollapseRule[];
    readonly labelLookupIntervalMilliseconds: number;
    readonly maximumRateLimitRetryCount: number;
};

export type ChangelogBaseRef = {
    readonly ref: string;
};

export type MissingChangelogBaseRefReason = 'explicit-base-ref' | 'package-version-tag' | 'previous-git-head';

export type MissingChangelogBaseRefError = Readonly<Error> & {
    readonly name: 'MissingChangelogBaseRefError';
    readonly packageName: string;
    readonly ref: string | undefined;
    readonly reason: MissingChangelogBaseRefReason;
};

export type PackageChangelogBaseRefInput = {
    readonly packageName: string;
    readonly previousVersion: string | undefined;
    readonly previousGitHead: string | undefined;
    readonly packageTagFormat: string | undefined;
    readonly explicitBaseRef: string | undefined;
};

export type PullRequest = {
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

export type PullRequestWithLabel = PullRequest & {
    readonly label: string;
};

export type FilterPullRequestsByTargetFilesInput = {
    readonly targetName: string;
    readonly targetSourceFiles: readonly string[];
    readonly pullRequests: readonly PullRequest[];
    readonly changedFilesByPullRequest: ReadonlyMap<number, readonly PullRequestChangedFile[]>;
    readonly ignoredAttributionPaths: readonly string[];
};

export type CollectMergedPullRequestsOptions = {
    readonly githubRepo: string;
    readonly baseRef: string;
};

export type ReadPullRequestChangedFilesOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequest[];
};

export type ReadPullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequest[];
};

export type ResolvePullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly config: PrLogConfig;
    readonly pullRequests: readonly PullRequest[];
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

export type ResolveVersionNumberInput = {
    readonly latestVersionTag: string;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
    readonly config: PrLogConfig;
};

export type LinklessChangelogEntry = {
    readonly id: undefined;
    readonly title: string;
    readonly label: string;
};

export type ChangelogEntryInput = LinklessChangelogEntry | PullRequestWithLabel;

type RenderChangelogMarkdownInputBase = {
    readonly config: PrLogConfig;
    readonly currentDate: Readonly<Date>;
    readonly mergedPullRequests: readonly ChangelogEntryInput[];
    readonly githubRepo: string;
};

type RenderReleasedChangelogMarkdownInput = RenderChangelogMarkdownInputBase & {
    readonly unreleased: false;
    readonly versionNumber: string;
};

type RenderUnreleasedChangelogMarkdownInput = RenderChangelogMarkdownInputBase & {
    readonly unreleased: true;
    readonly versionNumber: undefined;
};

export type RenderChangelogMarkdownInput =
    | RenderReleasedChangelogMarkdownInput
    | RenderUnreleasedChangelogMarkdownInput;

type TargetChangelogSectionBase = {
    readonly targetName: string;
    readonly mergedPullRequests: readonly ChangelogEntryInput[];
};

type ReleasedTargetChangelogSection = TargetChangelogSectionBase & {
    readonly unreleased: false;
    readonly versionNumber: string;
};

type UnreleasedTargetChangelogSection = TargetChangelogSectionBase & {
    readonly unreleased: true;
    readonly versionNumber: undefined;
};

export type TargetChangelogSection = ReleasedTargetChangelogSection | UnreleasedTargetChangelogSection;

export type RenderGroupedTargetChangelogMarkdownInput = {
    readonly config: PrLogConfig;
    readonly currentDate: Readonly<Date>;
    readonly githubRepo: string;
    readonly targets: readonly TargetChangelogSection[];
};

export type RenderTargetChangelogMarkdownInput = RenderChangelogMarkdownInputBase & TargetChangelogSection;

export type UpdateChangelogInput = {
    readonly existingChangelogMarkdown: string;
    readonly generatedChangelogMarkdown: string;
};

export type ExtractChangelogReleaseSectionInput = {
    readonly changelogMarkdown: string;
    readonly targetName: string | undefined;
    readonly versionNumber: string;
};

export type ReleaseSectionNotFound = {
    readonly reason: 'release-section-not-found';
    readonly targetName: string | undefined;
    readonly versionNumber: string;
};

type SuccessfulResult<Value> = {
    readonly isOk: true;
    readonly isErr: false;
    readonly value: Value;
};

type FailedResult<ErrorValue> = {
    readonly isOk: false;
    readonly isErr: true;
    readonly error: ErrorValue;
};

export type ExtractChangelogReleaseSectionResult =
    | FailedResult<ReleaseSectionNotFound>
    | SuccessfulResult<string>;

export type PrLogEngine = {
    resolveLatestSemverChangelogBaseRef: () => Promise<ChangelogBaseRef>;
    resolveChangelogBaseRef: (input: PackageChangelogBaseRefInput) => Promise<ChangelogBaseRef>;
    collectMergedPullRequests: (input: CollectMergedPullRequestsOptions) => Promise<readonly PullRequest[]>;
    readPullRequestChangedFiles: (
        input: ReadPullRequestChangedFilesOptions
    ) => Promise<ReadonlyMap<number, readonly PullRequestChangedFile[]>>;
    readPullRequestLabels: (input: ReadPullRequestLabelsOptions) => Promise<ReadonlyMap<number, readonly string[]>>;
    filterPullRequestsByTargetFiles: (input: FilterPullRequestsByTargetFilesInput) => readonly PullRequest[];
    resolvePullRequestLabels: (input: ResolvePullRequestLabelsOptions) => Promise<readonly PullRequestWithLabel[]>;
    resolveVersionNumber: (input: ResolveVersionNumberInput) => string;
    extractChangelogReleaseSection: (
        input: ExtractChangelogReleaseSectionInput
    ) => ExtractChangelogReleaseSectionResult;
    renderChangelog: (input: RenderChangelogMarkdownInput) => string;
    renderTargetChangelog: (input: RenderTargetChangelogMarkdownInput) => string;
    renderGroupedTargetChangelog: (input: RenderGroupedTargetChangelogMarkdownInput) => string;
    updateChangelog: (input: UpdateChangelogInput) => string;
};

function createCurrentDate(): Readonly<Date> {
    return new Date();
}

const gitHubClientDependencies = { Octokit };

export function createPrLogEngine(options: Readonly<PrLogEngineOptions>): PrLogEngine {
    const githubClient = createGitHubClient(gitHubClientDependencies, options);
    const execute = createCommandStringExecutor({ executeFile: execa, workingDirectory: options.workingDirectory });
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
export const defaultPrLogConfig: PrLogConfig = defaultPrLogConfigValue;
