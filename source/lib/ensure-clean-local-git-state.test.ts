import assert from 'node:assert';
import { fake, type SinonSpy } from 'sinon';
import {
    ensureCleanLocalGitStateFactory,
    type EnsureCleanLocalGitState,
    type EnsureCleanLocalGitStateDependencies
} from './ensure-clean-local-git-state.ts';

const githubRepo = 'foo/bar';

type Overrides = {
    readonly getShortStatus?: SinonSpy;
    readonly getCurrentBranchName?: SinonSpy;
    readonly getSymmetricDifferencesBetweenBranches?: SinonSpy;
    readonly fetchRemote?: SinonSpy;
    readonly findRemoteAlias?: SinonSpy;
};

function factory(overrides: Overrides = {}): EnsureCleanLocalGitState {
    const {
        getShortStatus = fake.resolves(''),
        getCurrentBranchName = fake.resolves('master'),
        getSymmetricDifferencesBetweenBranches = fake.resolves([]),
        fetchRemote = fake.resolves(undefined),
        findRemoteAlias = fake.resolves('origin')
    } = overrides;
    const fakeDependencies = {
        localGitState: {
            getShortStatus,
            getCurrentBranchName,
            getSymmetricDifferencesBetweenBranches,
            fetchRemote
        },
        findRemoteAlias
    } as unknown as EnsureCleanLocalGitStateDependencies;

    return ensureCleanLocalGitStateFactory(fakeDependencies, { defaultBranch: 'master' });
}

test('rejects if git status is not empty', async () => {
    const ensureCleanLocalGitState = factory({ getShortStatus: fake.resolves('M foobar') });

    await assert.rejects(ensureCleanLocalGitState(githubRepo), { message: 'Local copy is not clean' });
});

test('rejects if current branch is not default branch', async () => {
    const ensureCleanLocalGitState = factory({ getCurrentBranchName: fake.resolves('feature-foo') });

    await assert.rejects(ensureCleanLocalGitState(githubRepo), { message: 'Not on master branch' });
});

test('rejects if the local branch is ahead of the remote', async () => {
    const ensureCleanLocalGitState = factory({
        getSymmetricDifferencesBetweenBranches: fake.resolves(['<commit-sha1'])
    });
    const expectedMessage = 'Local git master branch is 1 commits ahead and 0 commits behind of origin/master';

    await assert.rejects(ensureCleanLocalGitState(githubRepo), { message: expectedMessage });
});

test('rejects if the local branch is behind the remote', async () => {
    const ensureCleanLocalGitState = factory({
        getSymmetricDifferencesBetweenBranches: fake.resolves(['>commit-sha1'])
    });
    const expectedMessage = 'Local git master branch is 0 commits ahead and 1 commits behind of origin/master';

    await assert.rejects(ensureCleanLocalGitState(githubRepo), { message: expectedMessage });
});

test('fetches the remote repository', async () => {
    const fetchRemote = fake.resolves(undefined);
    const ensureCleanLocalGitState = factory({ fetchRemote });

    await ensureCleanLocalGitState(githubRepo);

    assert.strictEqual(fetchRemote.callCount, 1);
    assert.deepStrictEqual(fetchRemote.firstCall.args, ['origin']);
});

test('fulfills if the local git state is clean', async () => {
    const ensureCleanLocalGitState = factory();

    await ensureCleanLocalGitState(githubRepo);

    assert.ok(true);
});
