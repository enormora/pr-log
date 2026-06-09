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

export type TargetChangelogEntries = {
    readonly targetName: string;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
};

type RenderGroupedTargetChangelogMarkdownInputBase = {
    readonly packageInfo: Record<string, unknown>;
    readonly currentDate: Readonly<Date>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly githubRepo: string;
    readonly targets: readonly TargetChangelogEntries[];
};

type RenderReleasedGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputBase & {
    readonly unreleased: false;
    readonly versionNumber: string;
};

type RenderUnreleasedGroupedTargetChangelogMarkdownInput = RenderGroupedTargetChangelogMarkdownInputBase & {
    readonly unreleased: true;
    readonly versionNumber: undefined;
};

export type RenderGroupedTargetChangelogMarkdownInput =
    | RenderReleasedGroupedTargetChangelogMarkdownInput
    | RenderUnreleasedGroupedTargetChangelogMarkdownInput;

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

export const renderTargetChangelogMarkdown = renderChangelogMarkdown;

function demoteLabelHeadings(changelog: string): string {
    return changelog.replaceAll(/^### /gmu, '#### ');
}

function renderGroupedChangelogTitle(input: RenderGroupedTargetChangelogMarkdownInput): string {
    if (input.unreleased) {
        return '';
    }

    return renderChangelogMarkdown({
        packageInfo: input.packageInfo,
        currentDate: input.currentDate,
        validLabels: input.validLabels,
        mergedPullRequests: [],
        githubRepo: input.githubRepo,
        unreleased: false,
        versionNumber: input.versionNumber
    });
}

function renderTargetSection(input: RenderGroupedTargetChangelogMarkdownInput, target: TargetChangelogEntries): string {
    if (target.mergedPullRequests.length === 0) {
        return '';
    }

    const targetBody = demoteLabelHeadings(
        renderChangelogMarkdown({
            packageInfo: input.packageInfo,
            currentDate: input.currentDate,
            validLabels: input.validLabels,
            mergedPullRequests: target.mergedPullRequests,
            githubRepo: input.githubRepo,
            unreleased: true,
            versionNumber: undefined
        })
    );

    return `### ${target.targetName}\n\n${targetBody}`;
}

export function renderGroupedTargetChangelogMarkdown(input: RenderGroupedTargetChangelogMarkdownInput): string {
    const title = renderGroupedChangelogTitle(input);
    const sections = input.targets
        .map((target) => {
            return renderTargetSection(input, target);
        })
        .join('');

    return `${title}${sections}`;
}
