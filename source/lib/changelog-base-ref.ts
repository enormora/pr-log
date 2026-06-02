import { determineLatestVersionTag } from './latest-version-tag.ts';

export type ChangelogBaseRef = {
    readonly ref: string;
};

export type GitRefReader = {
    hasRef(ref: string): Promise<boolean>;
};

export type LatestSemverTagBaseRefInput = {
    readonly tags: readonly string[];
};

export type PackageChangelogBaseRefInput = {
    readonly packageName: string;
    readonly previousVersion: string | undefined;
    readonly previousGitHead: string | undefined;
    readonly packageTagFormat: string | undefined;
    readonly explicitBaseRef: string | undefined;
};

export type MissingChangelogBaseRefReason = 'explicit-base-ref' | 'package-version-tag' | 'previous-git-head';

export type MissingChangelogBaseRefError = {
    readonly name: 'MissingChangelogBaseRefError';
    readonly message: string;
    readonly packageName: string;
    readonly ref: string | undefined;
    readonly reason: MissingChangelogBaseRefReason;
    readonly stack: string | undefined;
};

function throwMissingChangelogBaseRefError(options: {
    readonly packageName: string;
    readonly ref: string | undefined;
    readonly reason: MissingChangelogBaseRefReason;
}): never {
    const { packageName, ref, reason } = options;
    const refDescription = ref === undefined ? 'No base ref could be determined' : `Base ref "${ref}" does not exist`;
    const error: Error = Object.assign(new Error(`${refDescription} for package "${packageName}" using ${reason}`), {
        name: 'MissingChangelogBaseRefError',
        packageName,
        ref,
        reason
    });

    throw error;
}

export function resolveLatestSemverTagBaseRef(input: LatestSemverTagBaseRefInput): ChangelogBaseRef {
    return { ref: determineLatestVersionTag(input.tags) };
}

export function formatPackageVersionTag(options: {
    readonly packageName: string;
    readonly version: string;
    readonly packageTagFormat: string | undefined;
}): string {
    const tagFormat = options.packageTagFormat ?? '{packageName}@{version}';

    return tagFormat.replaceAll('{packageName}', options.packageName).replaceAll('{version}', options.version);
}

async function requireExistingBaseRef(
    gitRefReader: GitRefReader,
    packageName: string,
    ref: string,
    reason: MissingChangelogBaseRefReason
): Promise<ChangelogBaseRef> {
    if (await gitRefReader.hasRef(ref)) {
        return { ref };
    }

    return throwMissingChangelogBaseRefError({ packageName, ref, reason });
}

export async function resolveChangelogBaseRef(
    input: PackageChangelogBaseRefInput,
    gitRefReader: GitRefReader
): Promise<ChangelogBaseRef> {
    const { packageName, explicitBaseRef, previousGitHead, previousVersion, packageTagFormat } = input;

    if (explicitBaseRef !== undefined) {
        return requireExistingBaseRef(gitRefReader, packageName, explicitBaseRef, 'explicit-base-ref');
    }

    if (previousGitHead !== undefined) {
        return requireExistingBaseRef(gitRefReader, packageName, previousGitHead, 'previous-git-head');
    }

    if (previousVersion !== undefined) {
        return requireExistingBaseRef(
            gitRefReader,
            packageName,
            formatPackageVersionTag({ packageName, version: previousVersion, packageTagFormat }),
            'package-version-tag'
        );
    }

    return throwMissingChangelogBaseRefError({ packageName, ref: undefined, reason: 'package-version-tag' });
}
