import assert from 'node:assert';
import { fake, stub } from 'sinon';
import { createPullRequestDataReader } from './collect-merged-pull-requests.ts';

type GitHubPullRequestDataOverrides = {
    readonly title: string;
    readonly merged: boolean;
    readonly mergeCommitSha: string | null;
    readonly labels: readonly string[];
};

type GitHubPullRequestData = {
    readonly title: string;
    readonly merged: boolean;
    readonly merge_commit_sha: string | null;
    readonly labels: readonly { readonly name: string; }[];
};

type GitHubPullRequestDataResponse = {
    readonly data: GitHubPullRequestData;
};

type ResolveGitHubPullRequestData = (response: GitHubPullRequestDataResponse) => void;

type RejectGitHubPullRequestData = (reason: unknown) => void;

type GitHubPullRequestDataThenable = {
    readonly then: (
        resolve: ResolveGitHubPullRequestData,
        reject: RejectGitHubPullRequestData
    ) => void;
};

function createGitHubPullRequestData(overrides: GitHubPullRequestDataOverrides): GitHubPullRequestData {
    return {
        title: overrides.title,
        merged: overrides.merged,
        merge_commit_sha: overrides.mergeCommitSha,
        labels: overrides.labels.map(function (label) {
            return { name: label };
        })
    };
}

function failUninitializedPullRequestDataResolution(): never {
    throw new Error('Pull request data resolution was called before initialization');
}

test('reads pull request data from GitHub', async function () {
    const get = fake.resolves({
        data: createGitHubPullRequestData({
            title: 'Open the starlit gate',
            merged: true,
            mergeCommitSha: 'quest-hash',
            labels: [ 'feature', 'enchanted' ]
        })
    });
    const reader = createPullRequestDataReader({ pulls: { get } });

    assert.deepStrictEqual(await reader.readPullRequestData('owner/repo', 731), {
        title: 'Open the starlit gate',
        merged: true,
        mergeCommitSha: 'quest-hash',
        labels: [ 'feature', 'enchanted' ]
    });
    assert.deepStrictEqual(get.firstCall.args, [ { owner: 'owner', repo: 'repo', pull_number: 731 } ]);
});

test('returns undefined when GitHub returns not found', async function () {
    const get = stub().rejects(Object.assign(new Error('Not Found'), { status: 404 }));
    const reader = createPullRequestDataReader({ pulls: { get } });

    assert.strictEqual(await reader.readPullRequestData('owner/repo', 618), undefined);
});

test('throws when GitHub returns an error other than not found', async function () {
    const get = stub().rejects(Object.assign(new Error('GitHub failed'), { status: 500 }));
    const reader = createPullRequestDataReader({ pulls: { get } });

    await assert.rejects(reader.readPullRequestData('owner/repo', 942), { message: 'GitHub failed' });
});

test('throws when GitHub returns a non-error rejection', async function () {
    const rejectedPullRequestData: GitHubPullRequestDataThenable = {
        then(_resolve, reject) {
            reject({ message: 'GitHub failed' });
        }
    };
    const get = fake(async function (): Promise<GitHubPullRequestDataResponse> {
        return rejectedPullRequestData as unknown as GitHubPullRequestDataResponse;
    });
    const reader = createPullRequestDataReader({ pulls: { get } });

    await assert.rejects(
        reader.readPullRequestData('owner/repo', 853),
        { message: 'GitHub failed' }
    );
});

test('reuses cached pull request data', async function () {
    const get = fake.resolves({
        data: createGitHubPullRequestData({
            title: 'Summon the silver beacon',
            merged: true,
            mergeCommitSha: 'beacon-hash',
            labels: [ 'bug' ]
        })
    });
    const reader = createPullRequestDataReader({ pulls: { get } });

    await reader.readPullRequestData('owner/repo', 386);
    await reader.readPullRequestData('owner/repo', 386);

    assert.strictEqual(get.callCount, 1);
    assert.deepStrictEqual(reader.readCachedPullRequestLabels('owner/repo', 386), [ 'bug' ]);
});

test('reuses pending pull request data reads', async function () {
    let resolvePullRequestData: (response: GitHubPullRequestDataResponse) => void =
        failUninitializedPullRequestDataResolution;
    const pullRequestData = new Promise<GitHubPullRequestDataResponse>(function (resolve) {
        resolvePullRequestData = resolve;
    });
    const get = fake.returns(pullRequestData);
    const reader = createPullRequestDataReader({ pulls: { get } });

    const firstRead = reader.readPullRequestData('owner/repo', 274);
    const secondRead = reader.readPullRequestData('owner/repo', 274);
    resolvePullRequestData({
        data: createGitHubPullRequestData({
            title: 'Chart the hidden realm',
            merged: true,
            mergeCommitSha: 'realm-hash',
            labels: [ 'feature' ]
        })
    });

    assert.deepStrictEqual(await firstRead, await secondRead);
    assert.strictEqual(get.callCount, 1);
});
