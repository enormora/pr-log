import type { LocalGitState } from './ensure-clean-local-git-state.ts';
import type { GitCommandRunner } from './git-command-runner.ts';

export type LocalGitStateDependencies = {
    readonly gitCommandRunner: GitCommandRunner;
};

export function createLocalGitState(dependencies: LocalGitStateDependencies): LocalGitState {
    const { gitCommandRunner } = dependencies;

    return {
        async getShortStatus() {
            return gitCommandRunner.getShortStatus();
        },

        async getCurrentBranchName() {
            return gitCommandRunner.getCurrentBranchName();
        },

        async fetchRemote(remoteAlias) {
            return gitCommandRunner.fetchRemote(remoteAlias);
        },

        async getSymmetricDifferencesBetweenBranches(branchA, branchB) {
            return gitCommandRunner.getSymmetricDifferencesBetweenBranches(branchA, branchB);
        }
    };
}
