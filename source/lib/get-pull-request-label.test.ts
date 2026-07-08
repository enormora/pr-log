import assert from 'node:assert';
import { fake, stub, type SinonSpy } from 'sinon';
import { oneLine } from 'common-tags';
import type { Octokit } from '@octokit/rest';
import {
    createGitHubPullRequestLabelReader,
    getPullRequestLabel,
    getPullRequestLabels
} from './get-pull-request-label.ts';
import { defaultValidLabels } from './valid-labels.ts';

type Overrides = {
    readonly listLabelsOnIssue?: SinonSpy;
    readonly waitForMilliseconds?: SinonSpy;
    readonly getCurrentDate?: SinonSpy;
    readonly maximumRateLimitRetryCount?: number;
};

type TestDependencies = {
    readonly githubClient: Readonly<Octokit>;
    readonly waitForMilliseconds: SinonSpy;
    readonly getCurrentDate: SinonSpy;
    readonly maximumRateLimitRetryCount: number;
};

type GitHubRateLimitError = {
    readonly message: string;
    readonly status: number;
    readonly response: {
        readonly headers: Readonly<Record<string, number | string>>;
    };
};
type GitHubErrorWithStatus = {
    readonly message: string;
    readonly status: number;
};

type GitHubRateLimitErrorWithoutHeaders = {
    readonly message: string;
    readonly status: number;
    readonly response: Readonly<Record<string, never>>;
};

const currentTimeMilliseconds = 1000;
const currentDate = new Date(currentTimeMilliseconds);
const millisecondsPerSecond = 1000;
const retryAfterSeconds = 60;
const internalServerErrorStatus = 500;
const expectedRequestAttemptCount = 2;
const expectedRetryAfterDelayMilliseconds = retryAfterSeconds * millisecondsPerSecond;
const expectedRateLimitResetDelayMilliseconds = 4000;
const rateLimitResetSeconds = (currentTimeMilliseconds + expectedRateLimitResetDelayMilliseconds) /
    millisecondsPerSecond;

function createGitHubRateLimitError(
    message: string,
    headers: Readonly<Record<string, number | string>>
): GitHubRateLimitError {
    return Object.assign(new Error(message), {
        status: 403,
        response: { headers }
    });
}

function createGitHubErrorWithStatus(status: number, message: string): GitHubErrorWithStatus {
    return Object.assign(new Error(message), { status });
}

function createGitHubRateLimitErrorWithoutHeaders(message: string): GitHubRateLimitErrorWithoutHeaders {
    return Object.assign(new Error(message), {
        status: 403,
        response: {}
    });
}

function createDependencies(overrides: Overrides = {}): TestDependencies {
    const { listLabelsOnIssue = fake.resolves({ data: [] }) } = overrides;
    const { waitForMilliseconds = fake.resolves(undefined) } = overrides;
    const { getCurrentDate = fake.returns(currentDate) } = overrides;
    const { maximumRateLimitRetryCount = 1 } = overrides;
    const githubClient = {
        issues: { listLabelsOnIssue }
    } as unknown as Octokit;

    return { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount };
}

const anyRepo = 'any/repo';
const anyPullRequestId = 123;

test('throws when the given repo doesn’t have a "/"', async function () {
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies();

    await assert.rejects(
        getPullRequestLabel('foo', defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: 'Could not find a repository'
        }
    );
});

test('requests the labels for the correct repo and pull request', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'bug' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
        githubClient,
        waitForMilliseconds,
        getCurrentDate,
        maximumRateLimitRetryCount
    });

    assert.partialDeepStrictEqual(listLabelsOnIssue, {
        callCount: 1,
        firstCall: { args: [ { owner: 'any', repo: 'repo', issue_number: 123 } ] }
    });
});

test('fulfills with the correct label name', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'bug' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    const expectedLabelName = 'bug';

    assert.strictEqual(
        await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        expectedLabelName
    );
});

test('fulfills with all label names', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'bug' }, { name: 'docs' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    assert.deepStrictEqual(
        await getPullRequestLabels(anyRepo, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        [ 'bug', 'docs' ]
    );
});

test('creates a GitHub pull request label reader', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'bug' } ] });
    const dependencies = createDependencies({ listLabelsOnIssue });
    const pullRequestLabelReader = createGitHubPullRequestLabelReader(dependencies);

    assert.deepStrictEqual(await pullRequestLabelReader.getLabels(anyRepo, anyPullRequestId), [ 'bug' ]);
});

test('uses custom labels when provided', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'addons' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    const expectedLabelName = 'addons';
    const customValidLabels = new Map([ [ 'addons', 'Addons' ] ]);

    assert.strictEqual(
        await getPullRequestLabel(anyRepo, customValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        expectedLabelName
    );
});

test('rejects if the pull request doesn’t have one valid label', async function () {
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies();

    const expectedErrorMessage = oneLine`Pull Request #123 has no label of breaking, bug,
        feature, enhancement, documentation, upgrade, refactor, build`;

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: expectedErrorMessage
        }
    );
});

test('rejects if the pull request has more than one valid label', async function () {
    const listLabelsOnIssue = fake.resolves({ data: [ { name: 'bug' }, { name: 'documentation' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });
    const expectedErrorMessage = oneLine`Pull Request #123 has multiple labels of breaking,
        bug, feature, enhancement, documentation, upgrade, refactor, build`;

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: expectedErrorMessage
        }
    );
});

test('retries using the retry-after header', async function () {
    const listLabelsOnIssue = stub()
        .onFirstCall()
        .rejects(
            createGitHubRateLimitError('You have exceeded a secondary rate limit.', {
                'retry-after': retryAfterSeconds
            })
        );
    listLabelsOnIssue.onSecondCall().resolves({ data: [ { name: 'bug' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    const labelName = await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
        githubClient,
        waitForMilliseconds,
        getCurrentDate,
        maximumRateLimitRetryCount
    });

    assert.strictEqual(labelName, 'bug');
    assert.strictEqual(listLabelsOnIssue.callCount, expectedRequestAttemptCount);
    assert.partialDeepStrictEqual(waitForMilliseconds, {
        callCount: 1,
        firstCall: { args: [ expectedRetryAfterDelayMilliseconds ] }
    });
});

test('retries using the rate limit reset header when retry-after is missing', async function () {
    const listLabelsOnIssue = stub()
        .onFirstCall()
        .rejects(
            createGitHubRateLimitError('API rate limit exceeded.', {
                'x-ratelimit-reset': rateLimitResetSeconds
            })
        );
    listLabelsOnIssue.onSecondCall().resolves({ data: [ { name: 'bug' } ] });
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    const labelName = await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
        githubClient,
        waitForMilliseconds,
        getCurrentDate,
        maximumRateLimitRetryCount
    });

    assert.strictEqual(labelName, 'bug');
    assert.strictEqual(listLabelsOnIssue.callCount, expectedRequestAttemptCount);
    assert.partialDeepStrictEqual(waitForMilliseconds, {
        callCount: 1,
        firstCall: { args: [ expectedRateLimitResetDelayMilliseconds ] }
    });
});

test('rejects immediately when a non-error value was thrown', async function () {
    const rejectedValue = { boom: true };
    const listLabelsOnIssue = stub().rejects(rejectedValue);
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await assert.rejects(
        async function () {
            await getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
                githubClient,
                waitForMilliseconds,
                getCurrentDate,
                maximumRateLimitRetryCount
            });
        },
        function (error: unknown) {
            assert.deepStrictEqual(error, rejectedValue);
            return true;
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});

test('rejects immediately when the error is not a rate limit error', async function () {
    const listLabelsOnIssue = stub().rejects(
        createGitHubErrorWithStatus(internalServerErrorStatus, 'Internal Server Error')
    );
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: 'Internal Server Error'
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});

test('rejects immediately when a rate limit error does not include retry headers', async function () {
    const listLabelsOnIssue = stub().rejects(createGitHubRateLimitError('API rate limit exceeded.', {}));
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: 'API rate limit exceeded.'
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});

test('rejects immediately when a rate limit error does not include a headers object', async function () {
    const listLabelsOnIssue = stub().rejects(createGitHubRateLimitErrorWithoutHeaders('API rate limit exceeded.'));
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: 'API rate limit exceeded.'
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});

test('rejects immediately when retry headers are not numeric', async function () {
    const listLabelsOnIssue = stub().rejects(
        createGitHubRateLimitError('API rate limit exceeded.', { 'retry-after': 'not-a-number' })
    );
    const { githubClient, waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = createDependencies({
        listLabelsOnIssue
    });

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount
        }),
        {
            message: 'API rate limit exceeded.'
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});

test('rejects immediately when the retry budget is exhausted', async function () {
    const listLabelsOnIssue = stub().rejects(
        createGitHubRateLimitError('You have exceeded a secondary rate limit.', {
            'retry-after': retryAfterSeconds
        })
    );
    const { githubClient, waitForMilliseconds, getCurrentDate } = createDependencies({
        listLabelsOnIssue,
        maximumRateLimitRetryCount: 0
    });

    await assert.rejects(
        getPullRequestLabel(anyRepo, defaultValidLabels, anyPullRequestId, {
            githubClient,
            waitForMilliseconds,
            getCurrentDate,
            maximumRateLimitRetryCount: 0
        }),
        {
            message: 'You have exceeded a secondary rate limit.'
        }
    );

    assert.strictEqual(waitForMilliseconds.callCount, 0);
});
