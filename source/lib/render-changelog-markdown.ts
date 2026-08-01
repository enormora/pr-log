import { nothing } from 'true-myth/maybe';
import { err, ok, type Result } from 'true-myth/result';
import { createChangelogFactory, formatChangelogDate } from './create-changelog.ts';
import type { PrLogConfig } from './pr-log-config.ts';
import type { PullRequestWithLabel } from './resolve-pull-request-labels.ts';
import { createVersionNumber } from './version-number.ts';

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

export type UpdateChangelogMarkdownInput = {
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

export type ExtractChangelogReleaseSectionResult = Result<string, ReleaseSectionNotFound>;

type ChangelogReleaseHeading = {
    readonly startIndex: number;
    readonly endIndex: number;
    readonly markdown: string;
};

const releaseVersionPattern = String.raw`\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?`;
const releasePackagePattern = String.raw`(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*`;
const releaseHeadingPattern = new RegExp(
    String.raw`^## (?:${releaseVersionPattern}|${releasePackagePattern} ${releaseVersionPattern}) \(.+\)\s*$`,
    'gimu'
);

function createReleaseSectionNotFound(input: ExtractChangelogReleaseSectionInput): ReleaseSectionNotFound {
    return {
        reason: 'release-section-not-found',
        targetName: input.targetName,
        versionNumber: input.versionNumber
    };
}

function readReleaseHeadings(changelogMarkdown: string): readonly ChangelogReleaseHeading[] {
    return Array.from(changelogMarkdown.matchAll(releaseHeadingPattern), function (match) {
        return {
            startIndex: match.index,
            endIndex: match.index + match[0].length,
            markdown: match[0]
        };
    });
}

function isRequestedReleaseHeading(
    input: ExtractChangelogReleaseSectionInput,
    heading: ChangelogReleaseHeading
): boolean {
    const requestedHeadingStart = input.targetName === undefined
        ? `## ${input.versionNumber} (`
        : `## ${input.targetName} ${input.versionNumber} (`;

    return heading.markdown.trimEnd().startsWith(requestedHeadingStart);
}

function sectionEndIndex(
    changelogMarkdown: string,
    headings: readonly ChangelogReleaseHeading[],
    headingIndex: number
): number {
    return headings[headingIndex + 1]?.startIndex ?? changelogMarkdown.length;
}

function extractMatchingReleaseSection(
    input: ExtractChangelogReleaseSectionInput,
    releaseHeadings: readonly ChangelogReleaseHeading[],
    headingIndex: number,
    heading: ChangelogReleaseHeading
): string | undefined {
    if (!isRequestedReleaseHeading(input, heading)) {
        return undefined;
    }

    const endIndex = sectionEndIndex(input.changelogMarkdown, releaseHeadings, headingIndex);
    const sectionBody = input.changelogMarkdown.slice(heading.endIndex, endIndex);

    if (sectionBody.trim().length === 0) {
        return undefined;
    }

    return input.changelogMarkdown.slice(heading.startIndex, endIndex).trimEnd();
}

export function extractChangelogReleaseSection(
    input: ExtractChangelogReleaseSectionInput
): ExtractChangelogReleaseSectionResult {
    const releaseHeadings = readReleaseHeadings(input.changelogMarkdown);

    for (const [ headingIndex, heading ] of releaseHeadings.entries()) {
        const releaseSection = extractMatchingReleaseSection(input, releaseHeadings, headingIndex, heading);

        if (releaseSection !== undefined) {
            return ok(releaseSection);
        }
    }

    return err(createReleaseSectionNotFound(input));
}

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
