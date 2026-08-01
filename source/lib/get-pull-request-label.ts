import { isError, isFiniteNumber, isString } from '@sindresorhus/is';
import { of } from 'true-myth/maybe';
import { splitByString } from './split.ts';

type PullRequestLabelReader = {
    getLabels: (githubRepo: string, pullRequestId: number) => Promise<readonly string[]>;
};

export type GitHubPullRequestLabelReaderDependencies = {
    readonly githubClient: GitHubPullRequestLabelClient;
    readonly waitForMilliseconds: (durationMilliseconds: number) => Promise<void>;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly maximumRateLimitRetryCount: number;
};

export type GitHubPullRequestLabelClient = {
    readonly issues: {
        readonly listLabelsOnIssue: (options: GitHubPullRequestLabelRequest) => Promise<{
            readonly data: readonly Label[];
        }>;
    };
};

type GitHubPullRequestLabelRequest = {
    readonly owner: string;
    readonly repo: string;
    readonly issue_number: number;
};

export type GetPullRequestLabel = typeof getPullRequestLabel;
export type GetPullRequestLabels = typeof getPullRequestLabels;
type Headers = Readonly<Record<string, number | string | undefined>>;
type GitHubClientError = {
    readonly message: string;
    readonly status?: number;
    readonly response?: {
        readonly headers?: Headers;
    };
};
const millisecondsPerSecond = 1000;
const noDelayMilliseconds = 0;
const forbiddenStatusCode = 403;
const tooManyRequestsStatusCode = 429;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [ owner, repo ] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [ owner, repo ];
}

type Label = {
    readonly name: string;
};

async function fetchLabels(
    githubClient: GitHubPullRequestLabelClient,
    githubRepo: string,
    pullRequestId: number
): Promise<readonly Label[]> {
    const [ owner, repo ] = determineRepoDetails(githubRepo);
    const params = { owner, repo, issue_number: pullRequestId };
    const { data: labels } = await githubClient.issues.listLabelsOnIssue(params);

    return labels;
}

function getHeaderValue(headers: Headers, headerName: string): string | undefined {
    const value = headers[headerName];
    if (isString(value)) {
        return value;
    }

    if (isFiniteNumber(value)) {
        return String(value);
    }

    return undefined;
}

function parseDelaySeconds(value: string): number | undefined {
    const delaySeconds = Number(value);
    if (!isFiniteNumber(delaySeconds)) {
        return undefined;
    }

    return delaySeconds;
}

function determineRetryAfterDelayMilliseconds(headers: Headers): number | undefined {
    return of(getHeaderValue(headers, 'retry-after'))
        .andThen(function (retryAfterValue) {
            return of(parseDelaySeconds(retryAfterValue));
        })
        .map(function (retryAfterSeconds) {
            return retryAfterSeconds * millisecondsPerSecond;
        })
        .unwrapOr(undefined);
}

function determineRateLimitResetDelayMilliseconds(headers: Headers, currentDate: Readonly<Date>): number | undefined {
    return of(getHeaderValue(headers, 'x-ratelimit-reset'))
        .andThen(function (rateLimitResetValue) {
            return of(parseDelaySeconds(rateLimitResetValue));
        })
        .map(function (rateLimitResetSeconds) {
            const delayMilliseconds = rateLimitResetSeconds * millisecondsPerSecond - currentDate.getTime();
            return Math.max(delayMilliseconds, noDelayMilliseconds);
        })
        .unwrapOr(undefined);
}

function isGitHubRateLimitError(error: GitHubClientError): boolean {
    if (error.status !== forbiddenStatusCode && error.status !== tooManyRequestsStatusCode) {
        return false;
    }

    return error.message.toLowerCase().includes('rate limit');
}

function determineRateLimitDelayMilliseconds(
    error: GitHubClientError,
    currentDate: Readonly<Date>
): number | undefined {
    if (!isGitHubRateLimitError(error)) {
        return undefined;
    }

    const headers = error.response?.headers;
    if (headers === undefined) {
        return undefined;
    }

    const rateLimitResetDelayMilliseconds = determineRateLimitResetDelayMilliseconds(headers, currentDate);
    return determineRetryAfterDelayMilliseconds(headers) ?? rateLimitResetDelayMilliseconds;
}

function getGitHubClientError(error: unknown): GitHubClientError | undefined {
    if (!isError(error)) {
        return undefined;
    }

    return error;
}

type FetchLabelsWithRateLimitRetryOptions = {
    readonly githubRepo: string;
    readonly pullRequestId: number;
    readonly dependencies: GitHubPullRequestLabelReaderDependencies;
};

async function waitForRateLimitResetIfRetryable(
    error: unknown,
    dependencies: GitHubPullRequestLabelReaderDependencies,
    retryCount: number
): Promise<boolean> {
    const { waitForMilliseconds, getCurrentDate, maximumRateLimitRetryCount } = dependencies;
    const githubClientError = getGitHubClientError(error);
    if (githubClientError === undefined) {
        return false;
    }

    const delayMilliseconds = determineRateLimitDelayMilliseconds(githubClientError, getCurrentDate());
    if (delayMilliseconds === undefined || retryCount >= maximumRateLimitRetryCount) {
        return false;
    }

    await waitForMilliseconds(delayMilliseconds);
    return true;
}

async function fetchLabelsWithRateLimitRetry(
    options: Readonly<FetchLabelsWithRateLimitRetryOptions>,
    retryCount: number
): Promise<readonly Label[]> {
    const { githubRepo, pullRequestId, dependencies } = options;
    const { githubClient } = dependencies;

    try {
        return await fetchLabels(githubClient, githubRepo, pullRequestId);
    } catch (error) {
        const shouldRetry = await waitForRateLimitResetIfRetryable(error, dependencies, retryCount);
        if (!shouldRetry) {
            throw error;
        }

        return fetchLabelsWithRateLimitRetry(options, retryCount + 1);
    }
}

export async function getPullRequestLabel(
    githubRepo: string,
    validLabels: ReadonlyMap<string, string>,
    pullRequestId: number,
    dependencies: GitHubPullRequestLabelReaderDependencies
): Promise<string> {
    const validLabelNames = Array.from(validLabels.keys());

    const labels = await fetchLabelsWithRateLimitRetry(
        {
            githubRepo,
            pullRequestId,
            dependencies
        },
        0
    );

    const listOfLabels = validLabelNames.join(', ');
    const filteredLabels = labels.filter(function (label) {
        return validLabelNames.includes(label.name);
    });
    const [ firstLabel ] = filteredLabels;

    if (filteredLabels.length > 1) {
        throw new Error(`Pull Request #${pullRequestId} has multiple labels of ${listOfLabels}`);
    }
    if (firstLabel === undefined) {
        throw new TypeError(`Pull Request #${pullRequestId} has no label of ${listOfLabels}`);
    }

    return firstLabel.name;
}

export async function getPullRequestLabels(
    githubRepo: string,
    pullRequestId: number,
    dependencies: GitHubPullRequestLabelReaderDependencies
): Promise<readonly string[]> {
    const labels = await fetchLabelsWithRateLimitRetry(
        {
            githubRepo,
            pullRequestId,
            dependencies
        },
        0
    );

    return labels.map(function (label) {
        return label.name;
    });
}

export function createGitHubPullRequestLabelReader(
    dependencies: GitHubPullRequestLabelReaderDependencies
): PullRequestLabelReader {
    return {
        async getLabels(githubRepo, pullRequestId) {
            return getPullRequestLabels(githubRepo, pullRequestId, dependencies);
        }
    };
}
