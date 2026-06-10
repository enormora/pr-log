import { isPlainObject, isString } from '@sindresorhus/is';
import { getGithubRepo } from './get-github-repo.ts';

type PackageInfo = Record<string, unknown>;

export function getGithubRepoFromPackageInfo(packageInfo: PackageInfo): string {
    const { repository } = packageInfo;

    if (!isPlainObject(repository)) {
        throw new Error('Repository information missing in package.json');
    }

    if (!isString(repository.url)) {
        throw new TypeError('Repository url is not a string in package.json');
    }

    return getGithubRepo(repository.url);
}

export function getValidLabels(
    packageInfo: PackageInfo,
    defaultValidLabels: ReadonlyMap<string, string>
): ReadonlyMap<string, string> {
    const prLogConfig = packageInfo['pr-log'];

    if (isPlainObject(prLogConfig) && Array.isArray(prLogConfig.validLabels)) {
        return new Map(prLogConfig.validLabels);
    }

    return defaultValidLabels;
}
