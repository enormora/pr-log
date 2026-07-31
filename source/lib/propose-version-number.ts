import semver from 'semver';

type VersionBumpLevel = 'major' | 'minor' | 'patch';
type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;
type PullRequestWithLabel = {
    readonly id: number | undefined;
    readonly title: string;
    readonly label: string;
};

const orderedVersionBumpLevels: readonly VersionBumpLevel[] = [ 'major', 'minor', 'patch' ];

function includesAnyLabel(labels: ReadonlySet<string>, candidates: readonly string[]): boolean {
    return candidates.some(function (candidate) {
        return labels.has(candidate);
    });
}

function determineVersionBumpLevel(
    pullRequests: readonly PullRequestWithLabel[],
    versionBumpConfig: VersionBumpConfig
): VersionBumpLevel {
    if (pullRequests.length === 0) {
        throw new Error('Failed to propose next version number because no merged pull requests were found');
    }

    const labels = new Set(
        pullRequests.map(function (pullRequest) {
            return pullRequest.label;
        })
    );

    for (const level of orderedVersionBumpLevels) {
        if (includesAnyLabel(labels, versionBumpConfig[level])) {
            return level;
        }
    }

    throw new Error('Failed to propose next version number because no merged pull request labels match version bumps');
}

export function proposeVersionNumber(
    latestVersionTag: string,
    pullRequests: readonly PullRequestWithLabel[],
    versionBumpConfig: VersionBumpConfig
): string {
    const versionBumpLevel = determineVersionBumpLevel(pullRequests, versionBumpConfig);
    const versionNumber = semver.inc(latestVersionTag, versionBumpLevel);

    if (versionNumber === null) {
        throw new Error('Failed to increment version number');
    }

    return versionNumber;
}
