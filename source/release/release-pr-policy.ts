const changelogLabels = new Set([
    'breaking',
    'bug',
    'feature',
    'enhancement',
    'documentation',
    'upgrade',
    'refactor',
    'build'
]);
const releaseLabel = 'release';
const releaseBranch = 'release/pr-log';
const releaseTitle = 'Prepare release';
const releaseCommitSubject = 'Release packages';
const allowedReleaseFiles = new Set([
    'source/packages/command-line-interface/CHANGELOG.md',
    'source/packages/core/CHANGELOG.md'
]);

export type PullRequestPolicyInput = {
    readonly labels: readonly string[];
    readonly author: string;
    readonly headRef: string;
    readonly title: string;
    readonly subject: string;
    readonly parentShas: readonly string[];
    readonly expectedBaseSha: string;
    readonly changedFiles: readonly string[];
};

export type MergeGroupPolicyInput = {
    readonly pullRequests: readonly PullRequestPolicyInput[];
};

function requirePolicy(condition: boolean, message: string): void {
    if (!condition) {
        throw new Error(message);
    }
}

function countChangelogLabels(labels: readonly string[]): number {
    return labels.filter((label) => {
        return changelogLabels.has(label);
    }).length;
}

function validateNormalPullRequest(input: PullRequestPolicyInput): void {
    requirePolicy(countChangelogLabels(input.labels) === 1, 'Pull requests must have exactly one changelog label');
}

function validateReleasePullRequestIdentity(input: PullRequestPolicyInput): void {
    requirePolicy(
        input.labels.length === 1 && input.labels[0] === releaseLabel,
        'Release PRs must only have the release label'
    );
    requirePolicy(countChangelogLabels(input.labels) === 0, 'Release PRs must not have changelog labels');
    requirePolicy(input.author === 'github-actions[bot]', 'Release PRs must be authored by github-actions[bot]');
    requirePolicy(input.headRef === releaseBranch, `Release PRs must use ${releaseBranch}`);
    requirePolicy(input.title === releaseTitle, `Release PR title must be ${releaseTitle}`);
    requirePolicy(input.subject === releaseCommitSubject, `Release PR commit subject must be ${releaseCommitSubject}`);
    requirePolicy(input.parentShas.length === 1, 'Release PR head must have exactly one parent');
    requirePolicy(input.parentShas[0] === input.expectedBaseSha, 'Release PR head must be based on expected main');
}

function validateReleasePullRequestFiles(input: PullRequestPolicyInput): void {
    requirePolicy(input.changedFiles.length > 0, 'Release PRs must change changelog files');

    for (const changedFile of input.changedFiles) {
        requirePolicy(allowedReleaseFiles.has(changedFile), `Unexpected release PR file change: ${changedFile}`);
    }
}

function validateReleasePullRequest(input: PullRequestPolicyInput): void {
    validateReleasePullRequestIdentity(input);
    validateReleasePullRequestFiles(input);
}

export function validatePullRequestPolicy(input: PullRequestPolicyInput): void {
    if (input.labels.includes(releaseLabel)) {
        validateReleasePullRequest(input);
    } else {
        validateNormalPullRequest(input);
    }
}

export function validateMergeGroupPolicy(input: MergeGroupPolicyInput): void {
    const releasePullRequests = input.pullRequests.filter((pullRequest) => {
        return pullRequest.labels.includes(releaseLabel);
    });

    if (releasePullRequests.length > 0 && input.pullRequests.length !== 1) {
        throw new Error('Release PRs must not be grouped with other pull requests');
    }

    for (const pullRequest of input.pullRequests) {
        validatePullRequestPolicy(pullRequest);
    }
}
