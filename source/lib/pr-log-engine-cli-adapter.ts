import type { PrLogEngine } from '../core/pr-log-engine.ts';
import type { GetMergedPullRequests } from './get-merged-pull-requests.ts';
import type { renderChangelogMarkdown } from './render-changelog-markdown.ts';
import type { GetLatestVersionTag } from './resolve-version-number.ts';

type MergedPullRequestReaderOptions = {
    readonly targetName: string | undefined;
    readonly targetScopedLabelPattern: string | undefined;
};

type MergedPullRequestReaderEngine = Pick<
    PrLogEngine,
    'collectMergedPullRequests' | 'resolveLatestSemverChangelogBaseRef' | 'resolvePullRequestLabels'
>;

export function createLatestVersionTagReader(
    prLogEngine: Pick<PrLogEngine, 'resolveLatestSemverChangelogBaseRef'>
): GetLatestVersionTag {
    return async function getLatestVersionTag() {
        const baseRef = await prLogEngine.resolveLatestSemverChangelogBaseRef();
        return baseRef.ref;
    };
}

export function createMergedPullRequestReader(
    prLogEngine: MergedPullRequestReaderEngine,
    options: MergedPullRequestReaderOptions
): GetMergedPullRequests {
    return async function getMergedPullRequests(githubRepo, validLabels) {
        const baseRef = await prLogEngine.resolveLatestSemverChangelogBaseRef();
        const pullRequests = await prLogEngine.collectMergedPullRequests({ githubRepo, baseRef: baseRef.ref });

        return prLogEngine.resolvePullRequestLabels({
            githubRepo,
            validLabels,
            pullRequests,
            targetName: options.targetName,
            targetScopedLabelPattern: options.targetScopedLabelPattern
        });
    };
}

export function createChangelogMarkdownRenderer(
    prLogEngine: Pick<PrLogEngine, 'renderChangelog'>
): typeof renderChangelogMarkdown {
    return function renderChangelogMarkdown(input) {
        return prLogEngine.renderChangelog(input);
    };
}
