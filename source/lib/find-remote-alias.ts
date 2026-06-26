import parseGitUrl from 'git-url-parse';
import { isUndefined } from '@sindresorhus/is';

export type RemoteAlias = {
    readonly alias: string;
    readonly url: string;
};

export type RemoteAliasReader = {
    getRemoteAliases: () => Promise<readonly RemoteAlias[]>;
};

function isSameGitUrl(gitUrlA: string, gitUrlB: string): boolean {
    const parsedUrlA = parseGitUrl(gitUrlA);
    const parsedUrlB = parseGitUrl(gitUrlB);
    const pathA = parsedUrlA.pathname.replace(/\.git$/, '');
    const pathB = parsedUrlB.pathname.replace(/\.git$/, '');

    return parsedUrlA.resource === parsedUrlB.resource && pathA === pathB;
}

function getGitUrl(githubRepo: string): string {
    return `git://github.com/${githubRepo}.git`;
}

export type FindRemoteAliasDependencies = {
    readonly remoteAliasReader: RemoteAliasReader;
};

export type FindRemoteAlias = (githubRepo: string) => Promise<string>;

export function findRemoteAliasFactory(dependencies: FindRemoteAliasDependencies): FindRemoteAlias {
    const { remoteAliasReader } = dependencies;

    return async function findRemoteAlias(githubRepo: string) {
        const gitRemote = getGitUrl(githubRepo);

        const remotes = await remoteAliasReader.getRemoteAliases();
        const matchedRemote = remotes.find(function (remote) {
            return isSameGitUrl(gitRemote, remote.url);
        });

        if (isUndefined(matchedRemote)) {
            throw new TypeError(`This local git repository doesn’t have a remote pointing to ${gitRemote}`);
        }

        return matchedRemote.alias;
    };
}
