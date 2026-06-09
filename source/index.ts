import {
    formatPackageVersionTag as formatPackageVersionTagValue,
    resolveChangelogBaseRef as resolveChangelogBaseRefValue,
    resolveLatestSemverTagBaseRef as resolveLatestSemverTagBaseRefValue,
    type ChangelogBaseRef as ChangelogBaseRefValue,
    type GitRefReader as GitRefReaderValue,
    type LatestSemverTagBaseRefInput as LatestSemverTagBaseRefInputValue,
    type MissingChangelogBaseRefError as MissingChangelogBaseRefErrorValue,
    type MissingChangelogBaseRefReason as MissingChangelogBaseRefReasonValue,
    type PackageChangelogBaseRefInput as PackageChangelogBaseRefInputValue
} from './lib/changelog-base-ref.ts';
import {
    collectMergedPullRequests as collectMergedPullRequestsValue,
    type CollectMergedPullRequestsInput as CollectMergedPullRequestsInputValue,
    type GitRangeReader as GitRangeReaderValue,
    type MergeCommitLogEntry as MergeCommitLogEntryValue,
    type PullRequest as PullRequestValue,
    type PullRequestTitleReader as PullRequestTitleReaderValue
} from './lib/collect-merged-pull-requests.ts';
import * as githubChangedFiles from './lib/github-pull-request-changed-files.ts';
import {
    createGitHubPullRequestLabelReader as createGitHubPullRequestLabelReaderValue,
    getPullRequestLabels as getPullRequestLabelsValue,
    type GitHubPullRequestLabelReaderDependencies as GitHubPullRequestLabelReaderDependenciesValue
} from './lib/get-pull-request-label.ts';
import {
    filterPullRequestsByTargetFiles as filterPullRequestsByTargetFilesValue,
    type FilterPullRequestsByTargetFilesInput as FilterPullRequestsByTargetFilesInputValue
} from './lib/filter-pull-requests-by-target-files.ts';
import {
    fetchPullRequestChangedFiles as fetchPullRequestChangedFilesValue,
    type FetchPullRequestChangedFilesInput as FetchPullRequestChangedFilesInputValue,
    type PullRequestChangedFilesReader as PullRequestChangedFilesReaderValue
} from './lib/pull-request-changed-files.ts';
import {
    resolvePullRequestLabels as resolvePullRequestLabelsValue,
    type PullRequestLabelReader as PullRequestLabelReaderValue,
    type PullRequestWithLabel as PullRequestWithLabelValue,
    type ResolvePullRequestLabelsInput as ResolvePullRequestLabelsInputValue
} from './lib/resolve-pull-request-labels.ts';
import {
    renderGroupedTargetChangelogMarkdown as renderGroupedTargetChangelogMarkdownValue,
    renderChangelogMarkdown as renderChangelogMarkdownValue,
    renderTargetChangelogMarkdown as renderTargetChangelogMarkdownValue,
    type RenderGroupedTargetChangelogMarkdownInput as RenderGroupedTargetChangelogMarkdownInputValue,
    type RenderChangelogMarkdownInput as RenderChangelogMarkdownInputValue
} from './lib/render-changelog-markdown.ts';
import { defaultValidLabels as defaultValidLabelsValue } from './lib/valid-labels.ts';

export async function collectMergedPullRequests(
    input: CollectMergedPullRequestsInputValue
): Promise<readonly PullRequestValue[]> {
    const pullRequests = await collectMergedPullRequestsValue(input);
    return pullRequests;
}

export function createGitHubPullRequestChangedFilesReader(
    githubClient: Parameters<typeof githubChangedFiles.createGitHubPullRequestChangedFilesReader>[0]
): PullRequestChangedFilesReaderValue {
    const changedFilesReader = githubChangedFiles.createGitHubPullRequestChangedFilesReader(githubClient);
    return changedFilesReader;
}

export function createGitHubPullRequestLabelReader(
    dependencies: GitHubPullRequestLabelReaderDependenciesValue
): PullRequestLabelReaderValue {
    const pullRequestLabelReader = createGitHubPullRequestLabelReaderValue(dependencies);
    return pullRequestLabelReader;
}

export async function fetchPullRequestChangedFiles(
    input: FetchPullRequestChangedFilesInputValue
): Promise<ReadonlyMap<number, readonly string[]>> {
    const changedFiles = await fetchPullRequestChangedFilesValue(input);
    return changedFiles;
}

export function filterPullRequestsByTargetFiles(
    input: FilterPullRequestsByTargetFilesInputValue
): readonly PullRequestValue[] {
    const pullRequests = filterPullRequestsByTargetFilesValue(input);
    return pullRequests;
}

export function formatPackageVersionTag(options: {
    readonly packageName: string;
    readonly version: string;
    readonly packageTagFormat: string | undefined;
}): string {
    const packageVersionTag = formatPackageVersionTagValue(options);
    return packageVersionTag;
}

export function renderChangelogMarkdown(input: RenderChangelogMarkdownInputValue): string {
    const changelog = renderChangelogMarkdownValue(input);
    return changelog;
}

export function renderGroupedTargetChangelogMarkdown(input: RenderGroupedTargetChangelogMarkdownInputValue): string {
    const changelog = renderGroupedTargetChangelogMarkdownValue(input);
    return changelog;
}

export function renderTargetChangelogMarkdown(input: RenderChangelogMarkdownInputValue): string {
    const changelog = renderTargetChangelogMarkdownValue(input);
    return changelog;
}

export async function resolveChangelogBaseRef(
    input: PackageChangelogBaseRefInputValue,
    gitRefReader: GitRefReaderValue
): Promise<ChangelogBaseRefValue> {
    const baseRef = await resolveChangelogBaseRefValue(input, gitRefReader);
    return baseRef;
}

export function resolveLatestSemverTagBaseRef(input: LatestSemverTagBaseRefInputValue): ChangelogBaseRefValue {
    const baseRef = resolveLatestSemverTagBaseRefValue(input);
    return baseRef;
}

export async function resolvePullRequestLabels(
    input: ResolvePullRequestLabelsInputValue
): Promise<readonly PullRequestWithLabelValue[]> {
    const pullRequests = await resolvePullRequestLabelsValue(input);
    return pullRequests;
}

export async function getPullRequestLabels(
    githubRepo: string,
    pullRequestId: number,
    dependencies: GitHubPullRequestLabelReaderDependenciesValue
): Promise<readonly string[]> {
    const labels = await getPullRequestLabelsValue(githubRepo, pullRequestId, dependencies);
    return labels;
}

export type ChangelogBaseRef = ChangelogBaseRefValue;
export type CollectMergedPullRequestsInput = CollectMergedPullRequestsInputValue;
export const defaultValidLabels: ReadonlyMap<string, string> = new Map(defaultValidLabelsValue);
export type FetchPullRequestChangedFilesInput = FetchPullRequestChangedFilesInputValue;
export type FilterPullRequestsByTargetFilesInput = FilterPullRequestsByTargetFilesInputValue;
export type GitRangeReader = GitRangeReaderValue;
export type GitRefReader = GitRefReaderValue;
export type GitHubPullRequestLabelReaderDependencies = GitHubPullRequestLabelReaderDependenciesValue;
export type LatestSemverTagBaseRefInput = LatestSemverTagBaseRefInputValue;
export type MergeCommitLogEntry = MergeCommitLogEntryValue;
export type MissingChangelogBaseRefError = MissingChangelogBaseRefErrorValue;
export type MissingChangelogBaseRefReason = MissingChangelogBaseRefReasonValue;
export type PackageChangelogBaseRefInput = PackageChangelogBaseRefInputValue;
export type PullRequest = PullRequestValue;
export type PullRequestChangedFilesReader = PullRequestChangedFilesReaderValue;
export type PullRequestLabelReader = PullRequestLabelReaderValue;
export type PullRequestTitleReader = PullRequestTitleReaderValue;
export type PullRequestWithLabel = PullRequestWithLabelValue;
export type ReleasePlanPackage = {
    readonly name: string;
    readonly previousVersion: string | undefined;
    readonly nextVersion: string;
    readonly changed: boolean;
    readonly previousGitHead: string | undefined;
    readonly currentGitHead: string | undefined;
    readonly sourceFiles: readonly string[];
    readonly changedArtifactFiles: readonly string[];
};
export type RenderChangelogMarkdownInput = RenderChangelogMarkdownInputValue;
export type RenderGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputValue;
export type ResolvePullRequestLabelsInput = ResolvePullRequestLabelsInputValue;
