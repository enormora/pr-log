import { isArray, isPlainObject, isString } from '@sindresorhus/is';

export const versionBumpLevels = [ 'major', 'minor', 'patch' ] as const;

export type VersionBumpLevel = (typeof versionBumpLevels)[number];

export type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;

type PackageInfo = Readonly<Record<string, unknown>>;

function hasDuplicateLabels(labels: readonly string[]): boolean {
    const uniqueLabels = new Set(labels);
    return uniqueLabels.size !== labels.length;
}

function isVersionBumpLevel(value: string): value is VersionBumpLevel {
    const supportedVersionBumpLevels: readonly string[] = versionBumpLevels;
    return supportedVersionBumpLevels.includes(value);
}

export function createDefaultVersionBumpConfig(validLabels: ReadonlyMap<string, string>): VersionBumpConfig {
    const allLabels = Array.from(validLabels.keys());

    return {
        major: [ 'breaking' ],
        minor: [ 'feature' ],
        patch: allLabels.filter(function (label) {
            return label !== 'breaking' && label !== 'feature';
        })
    };
}

function assertValidConfiguredLabels(
    versionBumps: Readonly<Partial<Record<VersionBumpLevel, readonly string[]>>>,
    validLabels: ReadonlyMap<string, string>
): void {
    const configuredLabels = Object.values(versionBumps).flat();

    for (const label of configuredLabels) {
        if (!validLabels.has(label)) {
            throw new TypeError(`Configured version bump label "${label}" is not a valid label`);
        }
    }

    if (hasDuplicateLabels(configuredLabels)) {
        throw new TypeError('Configured version bump labels must not appear in multiple bump levels');
    }
}

function parseVersionBumpLabels(
    versionBumps: Readonly<Record<string, unknown>>,
    level: VersionBumpLevel
): readonly string[] | undefined {
    if (!Object.hasOwn(versionBumps, level)) {
        return undefined;
    }

    const value = versionBumps[level];
    if (!isArray(value) || !value.every(isString)) {
        throw new TypeError(`Configured version bump "${level}" must be an array of labels`);
    }

    return value;
}

function parseConfiguredVersionBumps(versionBumps: Readonly<Record<string, unknown>>): VersionBumpConfig {
    return {
        major: parseVersionBumpLabels(versionBumps, 'major') ?? [],
        minor: parseVersionBumpLabels(versionBumps, 'minor') ?? [],
        patch: parseVersionBumpLabels(versionBumps, 'patch') ?? []
    };
}

function assertSupportedVersionBumpLevels(versionBumps: Readonly<Record<string, unknown>>): void {
    for (const key of Object.keys(versionBumps)) {
        if (!isVersionBumpLevel(key)) {
            throw new TypeError(`Configured version bump level "${key}" is not supported`);
        }
    }
}

export function parseVersionBumpConfig(
    versionBumps: Readonly<Record<string, unknown>>,
    validLabels: ReadonlyMap<string, string>
): VersionBumpConfig {
    assertSupportedVersionBumpLevels(versionBumps);

    const parsedVersionBumps = parseConfiguredVersionBumps(versionBumps);

    assertValidConfiguredLabels(parsedVersionBumps, validLabels);

    return parsedVersionBumps;
}

export function getVersionBumpConfig(
    packageInfo: PackageInfo,
    validLabels: ReadonlyMap<string, string>
): VersionBumpConfig {
    const prLogConfig = packageInfo['pr-log'];

    if (!isPlainObject(prLogConfig) || !Object.hasOwn(prLogConfig, 'versionBumps')) {
        return createDefaultVersionBumpConfig(validLabels);
    }

    const { versionBumps } = prLogConfig;

    if (!isPlainObject(versionBumps)) {
        throw new TypeError('Configured version bumps must be an object');
    }

    return parseVersionBumpConfig(versionBumps, validLabels);
}
