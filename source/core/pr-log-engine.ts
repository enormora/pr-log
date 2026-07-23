import {
    resolveChangelogBaseRef as resolveChangelogBaseRefValue,
    resolveLatestSemverTagBaseRef as resolveLatestSemverTagBaseRefValue,
    type ChangelogBaseRef as ChangelogBaseRefValue,
    type MissingChangelogBaseRefError as MissingChangelogBaseRefErrorValue,
    type MissingChangelogBaseRefReason as MissingChangelogBaseRefReasonValue,
    type PackageChangelogBaseRefInput as PackageChangelogBaseRefInputValue
} from '../lib/changelog-base-ref.ts';
import {
    collectMergedPullRequests as collectMergedPullRequestsValue,
    createPullRequestDataReader,
    type GitRangeReader,
    type PullRequest as PullRequestValue,
    type PullRequestDataGitHubClient,
    type PullRequestDataReader
} from '../lib/collect-merged-pull-requests.ts';
import {
    filterPullRequestsByTargetFiles as filterPullRequestsByTargetFilesValue,
    type FilterPullRequestsByTargetFilesInput as FilterPullRequestsByTargetFilesInputValue
} from '../lib/filter-pull-requests-by-target-files.ts';
import type { GitCommandRunner } from '../lib/git-command-runner.ts';
import type { GetPullRequestLabels, GitHubPullRequestLabelClient } from '../lib/get-pull-request-label.ts';
import type { PrLogConfig as PrLogConfigValue } from '../lib/pr-log-config.ts';
import {
    fetchPullRequestChangedFiles as fetchPullRequestChangedFilesValue,
    type PullRequestChangedFile as PullRequestChangedFileValue,
    type PullRequestChangedFilesReader
} from '../lib/pull-request-changed-files.ts';
import { proposeVersionNumber as proposeVersionNumberValue } from '../lib/propose-version-number.ts';
import {
    resolvePullRequestLabels as resolvePullRequestLabelsValue,
    type PullRequestWithLabel as PullRequestWithLabelValue
} from '../lib/resolve-pull-request-labels.ts';
import {
    renderGroupedTargetChangelogMarkdown,
    renderChangelogMarkdown,
    renderTargetChangelogMarkdown,
    extractChangelogReleaseSection as extractChangelogReleaseSectionValue,
    type ChangelogEntryInput as ChangelogEntryInputValue,
    type ExtractChangelogReleaseSectionInput as ExtractChangelogReleaseSectionInputValue,
    type ExtractChangelogReleaseSectionResult as ExtractChangelogReleaseSectionResultValue,
    type LinklessChangelogEntry as LinklessChangelogEntryValue,
    type RenderChangelogMarkdownInput as RenderChangelogMarkdownInputValue,
    type RenderGroupedTargetChangelogMarkdownInput as RenderGroupedTargetChangelogMarkdownInputValue,
    type RenderTargetChangelogMarkdownInput as RenderTargetChangelogMarkdownInputValue,
    type ReleaseSectionNotFound as ReleaseSectionNotFoundValue,
    updateChangelogMarkdown,
    type TargetChangelogSection as TargetChangelogSectionValue,
    type UpdateChangelogMarkdownInput as UpdateChangelogMarkdownInputValue
} from '../lib/render-changelog-markdown.ts';

export type CollectMergedPullRequestsOptions = {
    readonly githubRepo: string;
    readonly baseRef: string;
};

export type MissingChangelogBaseRefError = MissingChangelogBaseRefErrorValue;
export type MissingChangelogBaseRefReason = MissingChangelogBaseRefReasonValue;

export type ReadPullRequestChangedFilesOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequestValue[];
};

export type ReadPullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly pullRequests: readonly PullRequestValue[];
};

export type ResolvePullRequestLabelsOptions = {
    readonly githubRepo: string;
    readonly config: PrLogConfigValue;
    readonly pullRequests: readonly PullRequestValue[];
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

export type ResolveVersionNumberInput = {
    readonly latestVersionTag: string;
    readonly mergedPullRequests: readonly PullRequestWithLabelValue[];
    readonly config: PrLogConfigValue;
};

export type PrLogEngine = {
    resolveLatestSemverChangelogBaseRef: () => Promise<ChangelogBaseRefValue>;
    resolveChangelogBaseRef: (input: PackageChangelogBaseRefInputValue) => Promise<ChangelogBaseRefValue>;
    collectMergedPullRequests: (input: CollectMergedPullRequestsOptions) => Promise<readonly PullRequestValue[]>;
    readPullRequestChangedFiles: (
        input: ReadPullRequestChangedFilesOptions
    ) => Promise<ReadonlyMap<number, readonly PullRequestChangedFileValue[]>>;
    readPullRequestLabels: (input: ReadPullRequestLabelsOptions) => Promise<ReadonlyMap<number, readonly string[]>>;
    filterPullRequestsByTargetFiles: (input: FilterPullRequestsByTargetFilesInputValue) => readonly PullRequestValue[];
    resolvePullRequestLabels: (input: ResolvePullRequestLabelsOptions) => Promise<readonly PullRequestWithLabelValue[]>;
    resolveVersionNumber: (input: ResolveVersionNumberInput) => string;
    extractChangelogReleaseSection: (
        input: ExtractChangelogReleaseSectionInputValue
    ) => ExtractChangelogReleaseSectionResultValue;
    renderChangelog: (input: RenderChangelogMarkdownInputValue) => string;
    renderTargetChangelog: (input: RenderTargetChangelogMarkdownInputValue) => string;
    renderGroupedTargetChangelog: (input: RenderGroupedTargetChangelogMarkdownInputValue) => string;
    updateChangelog: (input: UpdateChangelogMarkdownInputValue) => string;
};

export type PrLogEngineDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
    readonly githubClient: GitHubPullRequestLabelClient & PullRequestDataGitHubClient;
    readonly pullRequestChangedFilesReader: PullRequestChangedFilesReader;
    readonly getPullRequestLabels: GetPullRequestLabels;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly config: PrLogConfigValue;
};

type EnginePullRequestLabelReader = {
    getLabels: (githubRepo: string, pullRequestId: number) => Promise<readonly string[]>;
};

function createPullRequestLabelReader(
    dependencies: PrLogEngineDependencies,
    config: PrLogConfigValue,
    pullRequestDataReader: PullRequestDataReader
): EnginePullRequestLabelReader {
    return {
        async getLabels(githubRepo: string, pullRequestId: number) {
            const cachedLabels = pullRequestDataReader.readCachedPullRequestLabels(githubRepo, pullRequestId);
            if (cachedLabels !== undefined) {
                return cachedLabels;
            }

            const labels = await dependencies.getPullRequestLabels(githubRepo, pullRequestId, {
                githubClient: dependencies.githubClient,
                waitForMilliseconds: dependencies.waitForMilliseconds,
                getCurrentDate: dependencies.getCurrentDate,
                maximumRateLimitRetryCount: config.maximumRateLimitRetryCount
            });
            return labels;
        }
    };
}

async function waitBetweenLabelReads(dependencies: PrLogEngineDependencies, pullRequestIndex: number): Promise<void> {
    const { labelLookupIntervalMilliseconds } = dependencies.config;

    if (pullRequestIndex > 0 && labelLookupIntervalMilliseconds > 0) {
        await dependencies.waitForMilliseconds(labelLookupIntervalMilliseconds);
    }
}

async function readPullRequestLabels(
    dependencies: PrLogEngineDependencies,
    pullRequestDataReader: PullRequestDataReader,
    input: ReadPullRequestLabelsOptions
): Promise<ReadonlyMap<number, readonly string[]>> {
    const pullRequestLabels = new Map<number, readonly string[]>();
    const pullRequestLabelReader = createPullRequestLabelReader(
        dependencies,
        dependencies.config,
        pullRequestDataReader
    );

    for (const [ pullRequestIndex, pullRequest ] of input.pullRequests.entries()) {
        await waitBetweenLabelReads(dependencies, pullRequestIndex);
        pullRequestLabels.set(pullRequest.id, await pullRequestLabelReader.getLabels(input.githubRepo, pullRequest.id));
    }

    return pullRequestLabels;
}

export function createPrLogEngineWithDependencies(dependencies: PrLogEngineDependencies): PrLogEngine {
    const { gitCommandRunner, githubClient, pullRequestChangedFilesReader } = dependencies;
    const gitRangeReader: GitRangeReader = gitCommandRunner;
    const pullRequestDataReader = createPullRequestDataReader(githubClient);

    return {
        async resolveLatestSemverChangelogBaseRef() {
            return resolveLatestSemverTagBaseRefValue({ tags: await gitCommandRunner.listTags() });
        },

        async resolveChangelogBaseRef(input) {
            return resolveChangelogBaseRefValue(input, gitCommandRunner);
        },

        async collectMergedPullRequests(input) {
            return collectMergedPullRequestsValue({
                githubRepo: input.githubRepo,
                baseRef: input.baseRef,
                git: gitRangeReader,
                pullRequestDataReader
            });
        },

        async readPullRequestChangedFiles(input) {
            return fetchPullRequestChangedFilesValue({
                githubRepo: input.githubRepo,
                pullRequests: input.pullRequests,
                pullRequestChangedFilesReader
            });
        },

        async readPullRequestLabels(input) {
            return readPullRequestLabels(dependencies, pullRequestDataReader, input);
        },

        filterPullRequestsByTargetFiles: filterPullRequestsByTargetFilesValue,

        async resolvePullRequestLabels(input) {
            return resolvePullRequestLabelsValue({
                githubRepo: input.githubRepo,
                validLabels: input.config.validLabels,
                ignoredLabels: input.config.ignoredLabels,
                pullRequests: input.pullRequests,
                pullRequestLabelReader: createPullRequestLabelReader(
                    dependencies,
                    input.config,
                    pullRequestDataReader
                ),
                waitForMilliseconds: dependencies.waitForMilliseconds,
                labelLookupIntervalMilliseconds: input.config.labelLookupIntervalMilliseconds,
                targetName: input.targetName,
                targetScopedLabelPattern: input.targetScopedLabelPattern
            });
        },

        resolveVersionNumber(input) {
            return proposeVersionNumberValue(
                input.latestVersionTag,
                input.mergedPullRequests,
                input.config.versionBumps
            );
        },

        extractChangelogReleaseSection: extractChangelogReleaseSectionValue,
        renderChangelog: renderChangelogMarkdown,
        renderTargetChangelog: renderTargetChangelogMarkdown,
        renderGroupedTargetChangelog: renderGroupedTargetChangelogMarkdown,
        updateChangelog: updateChangelogMarkdown
    };
}

export type ChangelogBaseRef = ChangelogBaseRefValue;
export type ExtractChangelogReleaseSectionInput = ExtractChangelogReleaseSectionInputValue;
export type ExtractChangelogReleaseSectionResult = ExtractChangelogReleaseSectionResultValue;
export type FilterPullRequestsByTargetFilesInput = FilterPullRequestsByTargetFilesInputValue;
export type ChangelogEntryInput = ChangelogEntryInputValue;
export type LinklessChangelogEntry = LinklessChangelogEntryValue;
export type PackageChangelogBaseRefInput = PackageChangelogBaseRefInputValue;
export type PullRequest = PullRequestValue;
export type PullRequestChangedFile = PullRequestChangedFileValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;
export type PrLogConfig = PrLogConfigValue;
export type RenderGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputValue;
export type RenderChangelogMarkdownInput = RenderChangelogMarkdownInputValue;
export type RenderTargetChangelogMarkdownInput = RenderTargetChangelogMarkdownInputValue;
export type ReleaseSectionNotFound = ReleaseSectionNotFoundValue;
export type TargetChangelogSection = TargetChangelogSectionValue;
export type UpdateChangelogInput = UpdateChangelogMarkdownInputValue;
