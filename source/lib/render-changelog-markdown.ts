import { nothing } from 'true-myth/maybe';
import { createChangelogFactory, formatChangelogDate } from './create-changelog.ts';
import type { PrLogConfig } from './pr-log-config.ts';
import type { PullRequestWithLabel } from './resolve-pull-request-labels.ts';
import { createVersionNumber } from './version-number.ts';

type RenderChangelogMarkdownInputBase = {
    readonly config: PrLogConfig;
    readonly currentDate: Readonly<Date>;
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
    readonly config: PrLogConfig;
    readonly currentDate: Readonly<Date>;
    readonly githubRepo: string;
    readonly targets: readonly TargetChangelogSection[];
};

export type RenderTargetChangelogMarkdownInput = RenderChangelogMarkdownInputBase & TargetChangelogSection;

export type UpdateChangelogMarkdownInput = {
    readonly existingChangelogMarkdown: string;
    readonly generatedChangelogMarkdown: string;
};

export function renderChangelogMarkdown(input: RenderChangelogMarkdownInput): string {
    const createChangelog = createChangelogFactory({
        config: input.config,
        getCurrentDate() {
            return input.currentDate;
        }
    });

    if (input.unreleased) {
        return createChangelog({
            mergedPullRequests: input.mergedPullRequests,
            githubRepo: input.githubRepo,
            unreleased: true,
            versionNumber: nothing()
        });
    }

    return createChangelog({
        mergedPullRequests: input.mergedPullRequests,
        githubRepo: input.githubRepo,
        unreleased: false,
        versionNumber: createVersionNumber(input.versionNumber)
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

    const date = formatChangelogDate(input.config.dateFormat, input.currentDate);
    return `## ${target.targetName} ${target.versionNumber} (${date})`;
}

function renderTargetSection(input: RenderGroupedTargetChangelogMarkdownInput, target: TargetChangelogSection): string {
    if (target.mergedPullRequests.length === 0) {
        return '';
    }

    const targetBody = renderChangelogMarkdown({
        config: input.config,
        currentDate: input.currentDate,
        mergedPullRequests: target.mergedPullRequests,
        githubRepo: input.githubRepo,
        unreleased: true,
        versionNumber: undefined
    });

    return `${renderTargetSectionTitle(input, target)}\n\n${targetBody}`;
}

export function renderGroupedTargetChangelogMarkdown(input: RenderGroupedTargetChangelogMarkdownInput): string {
    const sections = input
        .targets
        .map(function (target) {
            return renderTargetSection(input, target);
        })
        .join('');

    return sections;
}

export function updateChangelogMarkdown(input: UpdateChangelogMarkdownInput): string {
    const generatedChangelogMarkdown = input.generatedChangelogMarkdown.trim();

    return `${generatedChangelogMarkdown}\n\n${input.existingChangelogMarkdown}`;
}
