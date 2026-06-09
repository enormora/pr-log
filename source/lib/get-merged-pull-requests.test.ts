import assert from 'node:assert';
import type { Octokit } from '@octokit/rest';
import { fake, spy, stub, type SinonSpy } from 'sinon';
import { defaultValidLabels } from './valid-labels.ts';
import {
    getMergedPullRequestsFactory,
    type GetMergedPullRequests,
    type GetMergedPullRequestsDependencies
} from './get-merged-pull-requests.ts';

const anyRepo = 'any/repo';
const latestVersion = '1.2.3';
const expectedPullRequestLabelCallCount = 2;
const expectedWaitForMillisecondsCallCount = 2;
const comparedArgumentCount = 2;

type Overrides = {
    readonly listTags?: SinonSpy;
    readonly getMergeCommitLogs?: SinonSpy;
    readonly getPullRequestLabels?: SinonSpy;
    readonly githubClient?: Octokit;
    readonly waitForMilliseconds?: SinonSpy;
    readonly labelLookupIntervalMilliseconds?: number;
};

type ControlledLabelLookup = {
    readonly getPullRequestLabels: SinonSpy;
    readonly firstLabelLookupStarted: Promise<void>;
    resolveFirstLabelLookup(labels: readonly string[]): void;
};

function factory(overrides: Overrides = {}): GetMergedPullRequests {
    const {
        listTags = fake.resolves([latestVersion]),
        getMergeCommitLogs = fake.resolves([]),
        getPullRequestLabels = fake.resolves(['bug']),
        githubClient = {
            pulls: {
                get: fake.resolves({ data: { title: 'pull-request-title' } })
            }
        } as unknown as Octokit,
        waitForMilliseconds = fake.resolves(undefined),
        labelLookupIntervalMilliseconds
    } = overrides;

    const dependencies = {
        getPullRequestLabels,
        githubClient,
        gitCommandRunner: { listTags, getMergeCommitLogs },
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    } as unknown as GetMergedPullRequestsDependencies;

    return getMergedPullRequestsFactory(dependencies);
}

function failUninitializedControlledLabelLookupResolver(): never {
    throw new Error('Controlled label lookup resolver was called before initialization');
}

function createControlledLabelLookup(): ControlledLabelLookup {
    let resolveFirstLabelLookup: (labels: readonly string[]) => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookup = new Promise<readonly string[]>((resolve) => {
        resolveFirstLabelLookup = resolve;
    });
    let resolveFirstLabelLookupStarted: () => void = failUninitializedControlledLabelLookupResolver;
    const firstLabelLookupStarted = new Promise<void>((resolve) => {
        resolveFirstLabelLookupStarted = resolve;
    });
    const getPullRequestLabels = spy(async (_githubRepo, pullRequestId: number): Promise<readonly string[]> => {
        if (pullRequestId === 1) {
            resolveFirstLabelLookupStarted();
            return firstLabelLookup;
        }

        return ['documentation'];
    });

    return { getPullRequestLabels, firstLabelLookupStarted, resolveFirstLabelLookup };
}

function assertFirstPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(comparedArguments, ['any/repo', 1]);
}

function assertSecondPullRequestLabelLookup(callCount: number, comparedArguments: readonly unknown[]): void {
    assert.strictEqual(callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(comparedArguments, ['any/repo', expectedPullRequestLabelCallCount]);
}

test('throws when there is no tag at all', async () => {
    const listTags = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('throws when there are only non-semver tags', async () => {
    const listTags = fake.resolves(['foo', 'bar']);
    const getMergedPullRequests = factory({ listTags });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to determine latest version number git tag'
    });
});

test('ignores non-semver tag', async () => {
    const listTags = fake.resolves(['0.0.1', 'foo', '0.0.2', '0.0.0.0.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['0.0.2']);
});

test('always uses the highest version', async () => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '0.5.0']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('ignores prerelease versions', async () => {
    const listTags = fake.resolves(['1.0.0', '0.0.0', '0.7.5', '2.0.0', '0.2.5', '3.0.0-alpha.1']);
    const getMergeCommitLogs = fake.resolves([]);
    const getMergedPullRequests = factory({ listTags, getMergeCommitLogs });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getMergeCommitLogs.callCount, 1);
    assert.deepStrictEqual(getMergeCommitLogs.firstCall.args, ['2.0.0']);
});

test('throws when the pull request cannot be extracted from the commit message', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request foo from branch',
            body: 'pr-1 message'
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'Failed to extract pull request id from merge commit log'
    });
});

test('falls back to the GitHub API when the commit log doesn’t have a body', async () => {
    const get = fake.resolves({ data: { title: 'pull request title from github' } });
    const githubClient = { pulls: { get } } as unknown as Octokit;
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs, githubClient });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(get.callCount, 1);
    assert.deepStrictEqual(get.firstCall.args, [{ owner: 'any', repo: 'repo', pull_number: 1 }]);
    assert.deepStrictEqual(pullRequests, [{ id: 1, title: 'pull request title from github', label: 'bug' }]);
});

test('throws when the title is missing in the commit log and the GitHub API request fails', async () => {
    const githubClient = {
        pulls: {
            get: stub().rejects(new Error('GitHub API failed'))
        }
    } as unknown as Octokit;
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs, githubClient });

    await assert.rejects(getMergedPullRequests(anyRepo, defaultValidLabels), {
        message: 'GitHub API failed'
    });
});

test('throws when the title is missing in the commit log and the repo is invalid', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: undefined
        }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs });

    await assert.rejects(getMergedPullRequests('invalid-repo', defaultValidLabels), {
        message: 'Could not find a repository'
    });
});

test('extracts id, title and label for merged pull requests', async () => {
    const firstExpectedPullRequest = { id: 1, title: 'pr-1 message', label: 'bug' };
    const secondExpectedPullRequest = { id: 2, title: 'pr-2 message', label: 'bug' };
    const getPullRequestLabels = fake.resolves(['bug']);
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const getMergedPullRequests = factory({ getMergeCommitLogs, getPullRequestLabels });

    const pullRequests = await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(getPullRequestLabels.callCount, expectedPullRequestLabelCallCount);
    assert.deepStrictEqual(getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        firstExpectedPullRequest.id
    ]);
    assert.deepStrictEqual(getPullRequestLabels.secondCall.args.slice(0, comparedArgumentCount), [
        'any/repo',
        secondExpectedPullRequest.id
    ]);

    assert.deepStrictEqual(pullRequests, [firstExpectedPullRequest, secondExpectedPullRequest]);
});

test('looks up pull request labels sequentially', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' }
    ]);
    const { getPullRequestLabels, firstLabelLookupStarted, resolveFirstLabelLookup } = createControlledLabelLookup();
    const getMergedPullRequests = factory({ getMergeCommitLogs, getPullRequestLabels });
    const mergedPullRequests = getMergedPullRequests(anyRepo, defaultValidLabels);

    await firstLabelLookupStarted;

    assertFirstPullRequestLabelLookup(
        getPullRequestLabels.callCount,
        getPullRequestLabels.firstCall.args.slice(0, comparedArgumentCount)
    );

    resolveFirstLabelLookup(['bug']);
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

test('waits between pull request label lookups', async () => {
    const getMergeCommitLogs = fake.resolves([
        {
            subject: 'Merge pull request #1 from branch',
            body: 'pr-1 message'
        },
        { subject: 'Merge pull request #2 from other', body: 'pr-2 message' },
        { subject: 'Merge pull request #3 from third', body: 'pr-3 message' }
    ]);
    const waitForMilliseconds = fake.resolves(undefined);
    const labelLookupIntervalMilliseconds = 123;
    const getMergedPullRequests = factory({
        getMergeCommitLogs,
        waitForMilliseconds,
        labelLookupIntervalMilliseconds
    });

    await getMergedPullRequests(anyRepo, defaultValidLabels);

    assert.strictEqual(waitForMilliseconds.callCount, expectedWaitForMillisecondsCallCount);
    assert.deepStrictEqual(waitForMilliseconds.firstCall.args, [labelLookupIntervalMilliseconds]);
    assert.deepStrictEqual(waitForMilliseconds.secondCall.args, [labelLookupIntervalMilliseconds]);
});
