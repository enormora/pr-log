import Maybe, { type Just } from 'true-myth/maybe';
import { createChangelogFactory, formatChangelogDate } from './create-changelog.ts';
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

type TargetChangelogSectionBase = {
    readonly targetName: string;
    readonly mergedPullRequests: readonly PullRequestWithLabel[];
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
    readonly packageInfo: Record<string, unknown>;
    readonly currentDate: Readonly<Date>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly githubRepo: string;
    readonly targets: readonly TargetChangelogSection[];
};

export type RenderTargetChangelogMarkdownInput = RenderChangelogMarkdownInputBase & TargetChangelogSection;

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

export const renderTargetChangelogMarkdown: (input: RenderTargetChangelogMarkdownInput) => string =
    renderChangelogMarkdown;

function renderTargetSectionTitle(
    input: RenderGroupedTargetChangelogMarkdownInput,
    target: TargetChangelogSection
): string {
    if (target.unreleased) {
        return `## ${target.targetName}`;
    }

    const date = formatChangelogDate(input.packageInfo, input.currentDate);
    return `## ${target.targetName} ${target.versionNumber} (${date})`;
}

function renderTargetSection(input: RenderGroupedTargetChangelogMarkdownInput, target: TargetChangelogSection): string {
    if (target.mergedPullRequests.length === 0) {
        return '';
    }

    const targetBody = renderChangelogMarkdown({
        packageInfo: input.packageInfo,
        currentDate: input.currentDate,
        validLabels: input.validLabels,
        mergedPullRequests: target.mergedPullRequests,
        githubRepo: input.githubRepo,
        unreleased: true,
        versionNumber: undefined
    });

    return `${renderTargetSectionTitle(input, target)}\n\n${targetBody}`;
}

export function renderGroupedTargetChangelogMarkdown(input: RenderGroupedTargetChangelogMarkdownInput): string {
    const sections = input.targets
        .map((target) => {
            return renderTargetSection(input, target);
        })
        .join('');

    return sections;
}
