import type { Just } from 'true-myth/maybe';
import type { PullRequestWithLabel } from './get-merged-pull-requests.ts';
import { proposeVersionNumber } from './propose-version-number.ts';
import { createVersionNumber } from './version-number.ts';
import { getVersionBumpConfig } from './version-bump-config.ts';

export type GetLatestVersionTag = () => Promise<string>;

export async function resolveReleasedVersionNumber(
    packageInfo: Readonly<Record<string, unknown>>,
    validLabels: ReadonlyMap<string, string>,
    getLatestVersionTag: GetLatestVersionTag,
    mergedPullRequests: readonly PullRequestWithLabel[]
): Promise<Just<string>> {
    const versionNumber = proposeVersionNumber(
        await getLatestVersionTag(),
        mergedPullRequests,
        getVersionBumpConfig(packageInfo, validLabels)
    );

    return createVersionNumber(versionNumber);
}
