import assert from 'node:assert';
import type { Octokit } from '@octokit/rest';
import { fake, spy, stub, type SinonSpy } from 'sinon';
import { defaultPrLogConfig } from './pr-log-config.ts';
import {
    getMergedPullRequestsFactory,
    type GetMergedPullRequests,
    type GetMergedPullRequestsDependencies
} from './get-merged-pull-requests.ts';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';
const expectedPullRequestLabelCallCount = 2;
const comparedArgumentCount = 2;
const secondPullRequestIdentifier = 2;

function assertSpyCalls(sinonSpy: SinonSpy, calls: readonly (readonly unknown[])[]): void {
    assert.deepStrictEqual({
        callCount: sinonSpy.callCount,
        calls: sinonSpy.getCalls().map(function (call): readonly unknown[] {
            return call.args as readonly unknown[];
        })
    }, {
        callCount: calls.length,
        calls
    });
}

type Overrides = {
    readonly listTags?: SinonSpy;
    readonly getFirstParentCommitLogs?: SinonSpy;
    readonly getPullRequestLabels?: SinonSpy;
    readonly githubClient?: Octokit;
    readonly waitForMilliseconds?: SinonSpy;
};

type FactoryDependencies = {
    readonly listTags: SinonSpy;
    readonly getFirstParentCommitLogs: SinonSpy;
    readonly getPullRequestLabels: SinonSpy;
    readonly githubClient: Octokit;
    readonly waitForMilliseconds: SinonSpy;
};

type ControlledLabelLookup = {
    readonly getPullRequestLabels: SinonSpy;
    readonly firstLabelLookupStarted: Promise<void>;
    resolveFirstLabelLookup: (labels: readonly string[]) => void;
};

function createDefaultFactoryDependencies(): FactoryDependencies {
    return {
        listTags: fake.resolves([ latestVersion ]),
        getFirstParentCommitLogs: fake.resolves([]),
        getPullRequestLabels: fake.resolves([ 'bug' ]),
        githubClient: {
            pulls: {
                get: fake.resolves({ data: { title: 'pull-request-title' } })
            }
        } as unknown as Octokit,
        waitForMilliseconds: fake.resolves(undefined)
    };
}

function factory(overrides: Overrides = {}): GetMergedPullRequests {
    const factoryDependencies = {
        ...createDefaultFactoryDependencies(),
        ...overrides
    };

    const dependencies = {
        getPullRequestLabels: factoryDependencies.getPullRequestLabels,
        githubClient: factoryDependencies.githubClient,
        gitCommandRunner: {
            listTags: factoryDependencies.listTags,
            getFirstParentCommitLogs: factoryDependencies.getFirstParentCommitLogs
        },
        waitForMilliseconds: factoryDependencies.waitForMilliseconds
    } as unknown as GetMergedPullRequestsDependencies;

    return getMergedPullRequestsFactory(dependencies);
}

function failUninitializedControlledLabelLookupResolver(): never {
    throw new Error('Controlled label lookup resolver was called before initialization');
}

function createControlledLabelLookup(): ControlledLabelLookup {
    let resolveFirstLabelLookup: (labels: readonly string[]) => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookup = new Promise<readonly string[]>(function (resolve) {
        resolveFirstLabelLookup = resolve;
    });
    let resolveFirstLabelLookupStarted: () => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookupStarted = new Promise<void>(function (resolve) {
        resolveFirstLabelLookupStarted = resolve;
    });
    const getPullRequestLabels = spy(async function (_githubRepo, pullRequestId: number): Promise<readonly string[]> {
        if (pullRequestId === 1) {
            resolveFirstLabelLookupStarted();
            return firstLabelLookup;
        }

        return [ 'documentation' ];
    });

    return { getPullRequestLabels, firstLabelLookupStarted, resolveFirstLabelLookup };
}

function assertFirstPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(comparedArguments, [ 'any/repo', 1 ]);
}

function assertSecondPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(comparedArguments, [ 'any/repo', expectedPullRequestLabelCallCount ]);
}

test('throws when there is no tag at all', async function () {
    const listTags = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultPrLogConfig), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('throws when there are only non-semver tags', async function () {
    const listTags = fake.resolves([ 'foo', 'bar' ]);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultPrLogConfig), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('ignores non-semver tag', async function () {
    const listTags = fake.resolves([ '0.0.1', 'foo', '0.0.2', '0.0.0.0.1' ]);
    const getFirstParentCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getFirstParentCommitLogs });

    await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assertSpyCalls(getFirstParentCommitLogs, [ [ '0.0.2' ] ]);
});

test('always uses the highest version', async function () {
    const listTags = fake.resolves([ '1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '0.5.0' ]);
    const getFirstParentCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getFirstParentCommitLogs });

    await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assertSpyCalls(getFirstParentCommitLogs, [ [ '2.0.0' ] ]);
});

test('ignores prerelease versions', async function () {
    const listTags = fake.resolves([ '1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '3.0.0-alpha.1' ]);
    const getFirstParentCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getFirstParentCommitLogs });

    await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assertSpyCalls(getFirstParentCommitLogs, [ [ '2.0.0' ] ]);
});

test('throws when the pull request cannot be extracted from the commit message', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request foo from branch',
            body: 'pr-1 message'
        }
    ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultPrLogConfig), {
        message: 'Failed to extract pull request id from merge commit log'
    });
});

test('falls back to the GitHub API when the commit log does not have a body', async function () {
    const get = fake.resolves({ data: { title: 'pull request title from github' } });
    const githubClient = { pulls: { get } } as unknown as Octokit;
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, githubClient });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assertSpyCalls(get, [ [ { owner: 'any', repo: 'repo', pull_number: 1 } ] ]);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'pull request title from github', label: 'bug' } ]);
});

test('throws when the title is missing in the commit log and the GitHub API request fails', async function () {
    const githubClient = {
        pulls: {
            get: stub().rejects(new Error('GitHub API failed'))
        }
    } as unknown as Octokit;
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, githubClient });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultPrLogConfig), {
        message: 'GitHub API failed'
    });
});

test('throws when the title is missing in the commit log and the repo is invalid', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs });

    await assert.rejects(getMergedPullRequests('invalid-repo', defaultPrLogConfig), {
        message: 'Could not find a repository'
    });
});

test('extracts id, title and label for merged pull requests', async function () {
    const firstExpectedPullRequest = { id: 1, title: 'pr-1 message', label: 'bug' };
    const secondExpectedPullRequest = { id: 2, title: 'pr-2 message', label: 'bug' };
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { hash: 'hash-2', subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assert.strictEqual(getPullRequestLabels.callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        firstExpectedPullRequest.id
    ]);
    assert.deepStrictEqual(getPullRequestLabels.secondCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        secondExpectedPullRequest.id
    ]);
    assert.deepStrictEqual(pullRequests, [ firstExpectedPullRequest, secondExpectedPullRequest ]);
});

test('looks up pull request labels sequentially', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { hash: 'hash-2', subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const { getPullRequestLabels, firstLabelLookupStarted, resolveFirstLabelLookup } = createControlledLabelLookup();
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels });
    const mergedPullRequests = getMergedPullRequests(anyRepo, defaultPrLogConfig);

    await firstLabelLookupStarted;

    assertFirstPullRequestLabelLookup(
        getPullRequestLabels.callCount,
        getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount)
    );

    resolveFirstLabelLookup([ 'bug' ]);
    const pullRequests = await mergedPullRequests;

    assertSecondPullRequestLabelLookup(
        getPullRequestLabels.callCount,
        getPullRequestLabels.secondCall.args.slice(0, comparedArgumentCount)
    );
    assert.deepStrictEqual(pullRequests, [
        { id: 1, title: 'pr-1 message', label: 'bug' },
        { id: 2, title: 'pr-2 message', label: 'documentation' }
    ]);
});

test('waits between pull request label lookups', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'hash-1',
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { hash: 'hash-2', subject: 'Merge pull request #2 from other', body: 'pr-2 message' },
        { hash: 'hash-3', subject: 'Merge pull request #3 from third', body: 'pr-3 message' }
    ]);
    const waitForMilliseconds = fake.resolves(undefined);
    const labelLookupIntervalMilliseconds = 123;
    const getMergedPullRequests = factory({
        getFirstParentCommitLogs,
        waitForMilliseconds
    });

    await getMergedPullRequests(anyRepo, { ...defaultPrLogConfig, labelLookupIntervalMilliseconds });

    assertSpyCalls(waitForMilliseconds, [
        [ labelLookupIntervalMilliseconds ],
        [ labelLookupIntervalMilliseconds ]
    ]);
});

test('ignores first-parent commits that are not merge commits', async function () {
    const getFirstParentCommitLogs = fake.resolves([
        { hash: 'hash-2', subject: 'chore: prepare release', body: 'release housekeeping' },
        { hash: 'hash-1', subject: 'Merge pull request #1 from branch', body: 'pr-1 message' }
    ]);
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assert.strictEqual(getPullRequestLabels.callCount, 1);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'pr-1 message', label: 'bug' } ]);
});

test('ignores merge commits that were reverted later', async function () {
    const revertedMergeCommitHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'cccccccccccccccccccccccccccccccccccccccc',
            subject: 'Revert "Merge pull request #1 from branch"',
            body: `This reverts commit ${revertedMergeCommitHash}.`
        },
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            subject: 'Merge pull request #2 from other',
            body: 'pr-2 message'
        },
        { hash: revertedMergeCommitHash, subject: 'Merge pull request #1 from branch', body: 'pr-1 message' }
    ]);
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assert.strictEqual(getPullRequestLabels.callCount, 1);
    assert.deepStrictEqual(getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        secondPullRequestIdentifier
    ]);
    assert.deepStrictEqual(pullRequests, [ { id: secondPullRequestIdentifier, title: 'pr-2 message', label: 'bug' } ]);
});

test('includes a merge commit again when its revert was reverted later', async function () {
    const revertedMergeCommitHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const revertCommitHash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'cccccccccccccccccccccccccccccccccccccccc',
            subject: 'Revert "Revert \\"Merge pull request #1 from branch\\""',
            body: `This reverts commit ${revertCommitHash}.`
        },
        {
            hash: revertCommitHash,
            subject: 'Revert "Merge pull request #1 from branch"',
            body: `This reverts commit ${revertedMergeCommitHash}.`
        },
        { hash: revertedMergeCommitHash, subject: 'Merge pull request #1 from branch', body: 'pr-1 message' }
    ]);
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assert.strictEqual(getPullRequestLabels.callCount, 1);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'pr-1 message', label: 'bug' } ]);
});

test('includes a revert commit when the reverted merge was already released', async function () {
    const get = fake.resolves({ data: { title: 'pr-1 message' } });
    const githubClient = { pulls: { get } } as unknown as Octokit;
    const getFirstParentCommitLogs = fake.resolves([
        {
            hash: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            subject: 'Revert "Merge pull request #1 from branch"',
            body: 'This reverts commit aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.'
        }
    ]);
    const getPullRequestLabels = fake.resolves([ 'bug' ]);
    const getMergedPullRequests = factory({ getFirstParentCommitLogs, getPullRequestLabels, githubClient });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultPrLogConfig);

    assert.deepStrictEqual(get.firstCall.args, [ { owner: 'any', repo: 'repo', pull_number: 1 } ]);
    assert.strictEqual(getPullRequestLabels.callCount, 1);
    assert.deepStrictEqual(getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount), [ 'any/repo', 1 ]);
    assert.deepStrictEqual(pullRequests, [ { id: 1, title: 'Revert "pr-1 message"', label: 'bug' } ]);
});
