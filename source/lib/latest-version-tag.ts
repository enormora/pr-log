import semver from 'semver';
import { isUndefined } from '@sindresorhus/is';

export function determineLatestVersionTag(tags: readonly string[]): string {
    const versionTags = tags.filter(function (tag: string) {
        return semver.valid(tag) !== null && semver.prerelease(tag) === null;
    });
    const orderedVersionTags = versionTags.toSorted(semver.rcompare);
    const latestTag = orderedVersionTags[0];

    if (isUndefined(latestTag)) {
        throw new TypeError('Failed to determine latest version number git tag');
    }

    return latestTag;
}
