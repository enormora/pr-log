import assert from 'node:assert';
import {
    validateMergeGroupPolicy,
    validatePullRequestPolicy,
    type PullRequestPolicyInput
} from './release-pr-policy.ts';

const validReleasePullRequest: PullRequestPolicyInput = {
    labels: ['release'],
    author: 'github-actions[bot]',
    headRef: 'release/pr-log',
    title: 'Prepare release',
    subject: 'Release packages',
    parentShas: ['main-sha'],
    expectedBaseSha: 'main-sha',
    changedFiles: ['source/packages/command-line-interface/CHANGELOG.md']
};

const validNormalPullRequest: PullRequestPolicyInput = {
    labels: ['bug'],
    author: 'maintainer',
    headRef: 'feature/fix',
    title: 'Fix bug',
    subject: 'Fix bug',
    parentShas: [],
    expectedBaseSha: 'main-sha',
    changedFiles: ['source/lib/cli.ts']
};

test('validatePullRequestPolicy() accepts a valid release pull request', () => {
    assert.doesNotThrow(() => {
        validatePullRequestPolicy(validReleasePullRequest);
    });
});

test('validatePullRequestPolicy() accepts a normal pull request with one changelog label', () => {
    assert.doesNotThrow(() => {
        validatePullRequestPolicy(validNormalPullRequest);
    });
});

test('validatePullRequestPolicy() rejects a release pull request with a stale parent', () => {
    assert.throws(
        () => {
            validatePullRequestPolicy({
                ...validReleasePullRequest,
                parentShas: ['old-main-sha']
            });
        },
        { message: 'Release PR head must be based on expected main' }
    );
});

test('validatePullRequestPolicy() rejects a release pull request from the wrong branch', () => {
    assert.throws(
        () => {
            validatePullRequestPolicy({
                ...validReleasePullRequest,
                headRef: 'feature/release'
            });
        },
        { message: 'Release PRs must use release/pr-log' }
    );
});

test('validatePullRequestPolicy() rejects unexpected release pull request files', () => {
    assert.throws(
        () => {
            validatePullRequestPolicy({
                ...validReleasePullRequest,
                changedFiles: ['package.json']
            });
        },
        { message: 'Unexpected release PR file change: package.json' }
    );
});

test('validatePullRequestPolicy() rejects a release pull request with the wrong label set', () => {
    assert.throws(
        () => {
            validatePullRequestPolicy({
                ...validReleasePullRequest,
                labels: ['release', 'bug']
            });
        },
        { message: 'Release PRs must only have the release label' }
    );
});

test('validatePullRequestPolicy() rejects a release pull request from the wrong author', () => {
    assert.throws(
        () => {
            validatePullRequestPolicy({
                ...validReleasePullRequest,
                author: 'maintainer'
            });
        },
        { message: 'Release PRs must be authored by github-actions[bot]' }
    );
});

test('validateMergeGroupPolicy() accepts a normal pull request', () => {
    assert.doesNotThrow(() => {
        validateMergeGroupPolicy({
            pullRequests: [validNormalPullRequest]
        });
    });
});

test('validateMergeGroupPolicy() accepts a single release pull request', () => {
    assert.doesNotThrow(() => {
        validateMergeGroupPolicy({
            pullRequests: [validReleasePullRequest]
        });
    });
});

test('validateMergeGroupPolicy() rejects a release pull request grouped with another pull request', () => {
    assert.throws(
        () => {
            validateMergeGroupPolicy({
                pullRequests: [validReleasePullRequest, validNormalPullRequest]
            });
        },
        { message: 'Release PRs must not be grouped with other pull requests' }
    );
});
