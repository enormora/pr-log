import { determineLatestVersionTag } from './latest-version-tag.ts';

export type ChangelogBaseRef = {
    readonly ref: string;
};

export type LatestSemverTagBaseRefInput = {
    readonly tags: readonly string[];
};

export function resolveLatestSemverTagBaseRef(input: LatestSemverTagBaseRefInput): ChangelogBaseRef {
    return { ref: determineLatestVersionTag(input.tags) };
}
