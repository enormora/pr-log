import { isArray, isPlainObject, isString } from '@sindresorhus/is';
import { defaultValidLabels } from './valid-labels.ts';
import {
    createDefaultVersionBumpConfig,
    parseVersionBumpConfig
} from './version-bump-config.ts';

type PackageInfo = Readonly<Record<string, unknown>>;
type VersionBumpLevel = 'major' | 'minor' | 'patch';
type VersionBumpConfig = Readonly<Record<VersionBumpLevel, readonly string[]>>;

export type CollapseRule = {
    readonly label: string;
    readonly pattern: RegExp;
    readonly replace: string;
    readonly keyGroup: string;
    readonly fromGroup: string;
    readonly toGroup: string;
};

export type PrLogConfig = {
    readonly validLabels: ReadonlyMap<string, string>;
    readonly ignoredLabels: readonly string[];
    readonly versionBumps: VersionBumpConfig;
    readonly dateFormat: string | undefined;
    readonly collapseRules: readonly CollapseRule[];
    readonly labelLookupIntervalMilliseconds: number;
    readonly maximumRateLimitRetryCount: number;
};

export const defaultPrLogConfig: PrLogConfig = {
    validLabels: defaultValidLabels,
    ignoredLabels: [],
    versionBumps: createDefaultVersionBumpConfig(defaultValidLabels),
    dateFormat: undefined,
    collapseRules: [],
    labelLookupIntervalMilliseconds: 250,
    maximumRateLimitRetryCount: 3
};

function readStringArrayConfig(packageInfo: PackageInfo, fieldName: string): readonly string[] {
    const prLogConfig = packageInfo['pr-log'];

    if (!isPlainObject(prLogConfig) || prLogConfig[fieldName] === undefined) {
        return [];
    }

    const value = prLogConfig[fieldName];

    if (!isArray(value)) {
        throw new TypeError(`pr-log.${fieldName} must be an array of strings`);
    }

    return value.map(function (entry) {
        if (!isString(entry)) {
            throw new TypeError(`pr-log.${fieldName} must be an array of strings`);
        }

        return entry;
    });
}

function getValidLabels(
    packageInfo: PackageInfo,
    fallbackValidLabels: ReadonlyMap<string, string>
): ReadonlyMap<string, string> {
    const prLogConfig = packageInfo['pr-log'];

    if (isPlainObject(prLogConfig) && Array.isArray(prLogConfig.validLabels)) {
        return new Map(prLogConfig.validLabels);
    }

    return fallbackValidLabels;
}

function getDateFormat(packageInfo: PackageInfo): string | undefined {
    const prLogConfig = packageInfo['pr-log'];

    if (!isPlainObject(prLogConfig)) {
        return undefined;
    }

    const { dateFormat } = prLogConfig;
    if (isString(dateFormat)) {
        return dateFormat;
    }

    return undefined;
}

function getRequiredStringField(rule: Readonly<Record<string, unknown>>, fieldName: string): string {
    const value = rule[fieldName];

    if (!isString(value)) {
        throw new TypeError(`pr-log.collapseRules[].${fieldName} must be a string`);
    }

    return value;
}

function createCollapseRule(rule: Readonly<Record<string, unknown>>): CollapseRule {
    const customKeyGroup = rule.keyGroup;
    const customFromGroup = rule.fromGroup;
    const customToGroup = rule.toGroup;

    return {
        label: getRequiredStringField(rule, 'label'),
        pattern: new RegExp(getRequiredStringField(rule, 'pattern'), 'u'),
        replace: getRequiredStringField(rule, 'replace'),
        keyGroup: isString(customKeyGroup) ? customKeyGroup : 'dependency',
        fromGroup: isString(customFromGroup) ? customFromGroup : 'from',
        toGroup: isString(customToGroup) ? customToGroup : 'to'
    };
}

function getCollapseRules(packageInfo: PackageInfo): readonly CollapseRule[] {
    const prLogConfig = packageInfo['pr-log'];

    if (!isPlainObject(prLogConfig) || !isArray(prLogConfig.collapseRules)) {
        return [];
    }

    return prLogConfig.collapseRules.map(function (rule) {
        if (!isPlainObject(rule)) {
            throw new TypeError('pr-log.collapseRules[] entries must be objects');
        }

        return createCollapseRule(rule);
    });
}

function getVersionBumps(packageInfo: PackageInfo, validLabels: ReadonlyMap<string, string>): VersionBumpConfig {
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

export function createPrLogConfigFromPackageInfo(
    packageInfo: PackageInfo,
    fallbackConfig: PrLogConfig = defaultPrLogConfig
): PrLogConfig {
    const validLabels = getValidLabels(packageInfo, fallbackConfig.validLabels);

    return {
        validLabels,
        ignoredLabels: readStringArrayConfig(packageInfo, 'ignoredLabels'),
        versionBumps: getVersionBumps(packageInfo, validLabels),
        dateFormat: getDateFormat(packageInfo),
        collapseRules: getCollapseRules(packageInfo),
        labelLookupIntervalMilliseconds: fallbackConfig.labelLookupIntervalMilliseconds,
        maximumRateLimitRetryCount: fallbackConfig.maximumRateLimitRetryCount
    };
}
