import assert from 'node:assert';
import { fake, type SinonSpy } from 'sinon';
import { createLocalGitState, type LocalGitStateDependencies } from './local-git-state.ts';

type FactoryResult = {
    readonly dependencies: LocalGitStateDependencies;
    readonly fetchRemote: SinonSpy;
    readonly getSymmetricDifferencesBetweenBranches: SinonSpy;
};

function createDependencies(): FactoryResult {
    const fetchRemote = fake.resolves(undefined);
    const getSymmetricDifferencesBetweenBranches = fake.resolves(['>commit']);

    return {
        dependencies: {
            gitCommandRunner: {
                getShortStatus: fake.resolves('short-status'),
                getCurrentBranchName: fake.resolves('main'),
                fetchRemote,
                getSymmetricDifferencesBetweenBranches,
                getRemoteAliases: fake.resolves([]),
                listTags: fake.resolves([]),
                hasRef: fake.resolves(false),
                getMergeCommitLogs: fake.resolves([]),
                getFirstParentCommitLogs: fake.resolves([])
            }
        },
        fetchRemote,
        getSymmetricDifferencesBetweenBranches
    };
}

test('createLocalGitState() reads the short status through the git command runner', async () => {
    const { dependencies } = createDependencies();
    const localGitState = createLocalGitState(dependencies);

    assert.strictEqual(await localGitState.getShortStatus(), 'short-status');
});

test('createLocalGitState() reads the current branch through the git command runner', async () => {
    const { dependencies } = createDependencies();
    const localGitState = createLocalGitState(dependencies);

    assert.strictEqual(await localGitState.getCurrentBranchName(), 'main');
});

test('createLocalGitState() fetches a remote through the git command runner', async () => {
    const { dependencies, fetchRemote } = createDependencies();
    const localGitState = createLocalGitState(dependencies);

    await localGitState.fetchRemote('origin');

    assert.deepStrictEqual(fetchRemote.firstCall.args, ['origin']);
});

test('createLocalGitState() reads branch differences through the git command runner', async () => {
    const { dependencies, getSymmetricDifferencesBetweenBranches } = createDependencies();
    const localGitState = createLocalGitState(dependencies);

    const result = await localGitState.getSymmetricDifferencesBetweenBranches('main', 'origin/main');

    assert.deepStrictEqual(result, ['>commit']);
    assert.deepStrictEqual(getSymmetricDifferencesBetweenBranches.firstCall.args, ['main', 'origin/main']);
});
