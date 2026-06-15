import semver from 'semver';
import { getVersionBumpConfig } from '../lib/version-bump-config.ts';
import { proposeVersionNumber } from '../lib/propose-version-number.ts';
import { filterPullRequestsByTargetFiles } from '../lib/filter-pull-requests-by-target-files.ts';
import type { PullRequest, PullRequestWithLabel } from '../core/pr-log-engine.ts';

export type PackageVersionTag = {
    readonly tagName: string;
    readonly version: string;
};

export type ReleaseTarget = {
    readonly packageName: string;
    readonly changelogPath: string;
    readonly sourcePathPrefixes: readonly string[];
    readonly sourceFilePaths: readonly string[];
    readonly ignoredAttributionPaths: readonly string[];
};

type ReleaseTargetInput = {
    readonly targetName: string;
    readonly targetSourceFiles: readonly string[];
    readonly ignoredAttributionPaths: readonly string[];
    readonly pullRequests: readonly PullRequest[];
    readonly changedFilesByPullRequest: ReadonlyMap<number, readonly string[]>;
};

function normalizeRepositoryPath(filePath: string): string {
    return filePath.replaceAll('\\', '/').replace(/^\.?\//u, '');
}

function isStableVersion(version: string): boolean {
    return semver.valid(version) !== null && semver.prerelease(version) === null;
}

function toPackageVersionTag(packageName: string, tagName: string): PackageVersionTag | undefined {
    const tagPrefix = `${packageName}@`;

    if (!tagName.startsWith(tagPrefix)) {
        return undefined;
    }

    const version = tagName.slice(tagPrefix.length);

    if (!isStableVersion(version)) {
        return undefined;
    }

    return { tagName, version };
}

function isPackageVersionTag(value: PackageVersionTag | undefined): value is PackageVersionTag {
    return value !== undefined;
}

export function formatPackageTag(packageName: string, version: string): string {
    return `${packageName}@${version}`;
}

export function determineLatestPackageVersionTag(tags: readonly string[], packageName: string): PackageVersionTag {
    const packageTags = tags
        .map((tagName) => {
            return toPackageVersionTag(packageName, tagName);
        })
        .filter(isPackageVersionTag)
        .toSorted((left, right) => {
            return semver.rcompare(left.version, right.version);
        });
    const latestPackageTag = packageTags[0];

    if (latestPackageTag === undefined) {
        throw new TypeError(`Failed to determine latest "${packageName}" git tag`);
    }

    return latestPackageTag;
}

export function selectNextPrLogVersion(input: {
    readonly latestVersion: string;
    readonly packageInfo: Record<string, unknown>;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly pullRequests: readonly PullRequestWithLabel[];
}): string {
    return proposeVersionNumber(
        input.latestVersion,
        input.pullRequests,
        getVersionBumpConfig(input.packageInfo, input.validLabels)
    );
}

export function selectNextPatchVersion(version: string): string {
    const nextVersion = semver.inc(version, 'patch');

    if (nextVersion === null) {
        throw new TypeError(`Failed to increment version "${version}"`);
    }

    return nextVersion;
}

export function selectReleaseTargetFiles(files: readonly string[], target: ReleaseTarget): readonly string[] {
    const sourceFilePaths = new Set(target.sourceFilePaths.map(normalizeRepositoryPath));
    const sourcePathPrefixes = target.sourcePathPrefixes.map(normalizeRepositoryPath);

    return files.filter((filePath) => {
        const normalizedFilePath = normalizeRepositoryPath(filePath);

        return (
            sourceFilePaths.has(normalizedFilePath) ||
            sourcePathPrefixes.some((sourcePathPrefix) => {
                return normalizedFilePath.startsWith(sourcePathPrefix);
            })
        );
    });
}

export function filterTargetChangelogPullRequests(input: ReleaseTargetInput): readonly PullRequest[] {
    return filterPullRequestsByTargetFiles({
        targetName: input.targetName,
        targetSourceFiles: input.targetSourceFiles,
        pullRequests: input.pullRequests,
        changedFilesByPullRequest: input.changedFilesByPullRequest,
        ignoredAttributionPaths: input.ignoredAttributionPaths
    });
}
