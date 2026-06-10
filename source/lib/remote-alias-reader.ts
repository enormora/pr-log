import type { RemoteAliasReader } from './find-remote-alias.ts';
import type { GitCommandRunner } from './git-command-runner.ts';

export type RemoteAliasReaderDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
};

export function createRemoteAliasReader(dependencies: RemoteAliasReaderDependencies): RemoteAliasReader {
    const { gitCommandRunner } = dependencies;

    return {
        async getRemoteAliases() {
            return gitCommandRunner.getRemoteAliases();
        }
    };
}
