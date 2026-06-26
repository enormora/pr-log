import { determineLatestVersionTag } from './latest-version-tag.ts';

export type ChangelogBaseRef = {
    readonly ref: string;
};

export type GitRefReader = {
    hasRef: (ref: string) => Promise<boolean>;
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

export type MissingChangelogBaseRefError = Readonly<Error> & {
    readonly name: 'MissingChangelogBaseRefError';
    readonly packageName: string;
    readonly ref: string | undefined;
    readonly reason: MissingChangelogBaseRefReason;
};

type MissingChangelogBaseRefErrorOptions = {
    readonly packageName: string;
    readonly ref: string | undefined;
    readonly reason: MissingChangelogBaseRefReason;
};

function createMissingChangelogBaseRefError(
    message: string,
    options: MissingChangelogBaseRefErrorOptions
): Error {
    return Object.defineProperties(new Error(message), {
        name: { value: 'MissingChangelogBaseRefError' },
        packageName: { value: options.packageName },
        ref: { value: options.ref },
        reason: { value: options.reason }
    });
}

function throwMissingChangelogBaseRefError(options: MissingChangelogBaseRefErrorOptions): never {
    const { packageName, ref, reason } = options;
    const refDescription = ref === undefined ? 'No base ref could be determined' : `Base ref "${ref}" does not exist`;

    throw createMissingChangelogBaseRefError(`${refDescription} for package "${packageName}" using ${reason}`, options);
}

export function resolveLatestSemverTagBaseRef(input: LatestSemverTagBaseRefInput): ChangelogBaseRef {
    return { ref: determineLatestVersionTag(input.tags) };
}

export type PackageVersionTagInput = {
    readonly packageName: string;
    readonly version: string;
    readonly packageTagFormat: string | undefined;
};

export function formatPackageVersionTag(options: PackageVersionTagInput): string {
    const tagFormat = options.packageTagFormat ?? '{packageName}@{version}';

    return tagFormat.split('{packageName}').join(options.packageName).split('{version}').join(options.version);
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
