import type { PullRequestWithLabel } from './get-merged-pull-requests.ts';
import type { PrLogConfig } from './pr-log-config.ts';
import { proposeVersionNumber } from './propose-version-number.ts';
import { createVersionNumber, type VersionNumber } from './version-number.ts';

export type GetLatestVersionTag = () => Promise<string>;

export async function resolveReleasedVersionNumber(
    config: PrLogConfig,
    getLatestVersionTag: GetLatestVersionTag,
    mergedPullRequests: readonly PullRequestWithLabel[]
): Promise<VersionNumber> {
    const versionNumber = proposeVersionNumber(
        await getLatestVersionTag(),
        mergedPullRequests,
        config.versionBumps
    );

    return createVersionNumber(versionNumber);
}
