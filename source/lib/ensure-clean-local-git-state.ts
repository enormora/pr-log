import { oneLine } from 'common-tags';
import type { FindRemoteAlias } from './find-remote-alias.ts';

export type LocalGitState = {
    getShortStatus(): Promise<string>;
    getCurrentBranchName(): Promise<string>;
    fetchRemote(remoteAlias: string): Promise<void>;
    getSymmetricDifferencesBetweenBranches(branchA: string, branchB: string): Promise<readonly string[]>;
};

type EnsureCleanLocalGitStateOptions = {
    readonly defaultBranch: string;
};

export type EnsureCleanLocalGitStateDependencies = {
    readonly localGitState: LocalGitState;
    readonly findRemoteAlias: FindRemoteAlias;
};

export type EnsureCleanLocalGitState = (githubRepo: string) => Promise<void>;

export function ensureCleanLocalGitStateFactory(
    dependencies: EnsureCleanLocalGitStateDependencies,
    options: EnsureCleanLocalGitStateOptions
): EnsureCleanLocalGitState {
    const { localGitState, findRemoteAlias } = dependencies;

    async function ensureCleanLocalCopy(): Promise<void> {
        const status = await localGitState.getShortStatus();
        if (status !== '') {
            throw new Error('Local copy is not clean');
        }
    }

    async function ensureDefaultBranch(): Promise<void> {
        const branchName = await localGitState.getCurrentBranchName();
        if (branchName !== options.defaultBranch) {
            throw new Error(`Not on ${options.defaultBranch} branch`);
        }
    }

    async function ensureLocalIsEqualToRemote(remoteAlias: string): Promise<void> {
        const remoteBranch = `${remoteAlias}/${options.defaultBranch}`;

        const commits = await localGitState.getSymmetricDifferencesBetweenBranches(options.defaultBranch, remoteBranch);
        let commitsAhead = 0;
        let commitsBehind = 0;

        commits.forEach((commit: string) => {
            if (commit.startsWith('>')) {
                commitsBehind += 1;
            } else {
                commitsAhead += 1;
            }
        });

        if (commitsAhead > 0 || commitsBehind > 0) {
            const errorMessage = oneLine`Local git ${options.defaultBranch} branch is ${commitsAhead} commits ahead
                and ${commitsBehind} commits behind of ${remoteBranch}`;

            throw new Error(errorMessage);
        }
    }

    return async function ensureCleanLocalGitState(githubRepo: string): Promise<void> {
        await ensureCleanLocalCopy();
        await ensureDefaultBranch();

        const remoteAlias = await findRemoteAlias(githubRepo);

        await localGitState.fetchRemote(remoteAlias);
        await ensureLocalIsEqualToRemote(remoteAlias);
    };
}
