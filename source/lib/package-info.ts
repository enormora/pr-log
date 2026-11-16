import { isPlainObject, isString } from '@sindresorhus/is';
import { getGithubRepo } from './get-github-repo.ts';

type PackageInfo = Readonly<Record<string, unknown>>;

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
