import Maybe, { type Just } from 'true-myth/maybe';
import { createChangelogFactory } from './create-changelog.ts';
import type { PullRequestWithLabel } from './resolve-pull-request-labels.ts';

type RenderChangelogMarkdownInputBase = {
    readonly packageInfo: Record<string, unknown>;
    readonly currentDate: Readonly<Date>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
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

export function renderChangelogMarkdown(input: RenderChangelogMarkdownInput): string {
    const createChangelog = createChangelogFactory({
        packageInfo: input.packageInfo,
        getCurrentDate: () => {
            return input.currentDate;
        }
    });

    if (input.unreleased) {
        return createChangelog({
            validLabels: input.validLabels,
            mergedPullRequests: input.mergedPullRequests,
            githubRepo: input.githubRepo,
            unreleased: true,
            versionNumber: Maybe.nothing()
        });
    }

    return createChangelog({
        validLabels: input.validLabels,
        mergedPullRequests: input.mergedPullRequests,
        githubRepo: input.githubRepo,
        unreleased: false,
        versionNumber: Maybe.just(input.versionNumber) as Just<string>
    });
}
