import assert from 'node:assert';
import { fake } from 'sinon';
import { createPullRequestLabelValidator } from './validate-pull-request-labels.ts';
import { defaultValidLabels } from './valid-labels.ts';

const pullRequestId = 123;

test('validates pull request labels with package configuration', async () => {
    const validLabels = new Map([['custom', 'Custom Changes']]);
    const configuredValidLabels = [['custom', 'Custom Changes']];
    const resolvePullRequestLabels = fake.resolves([]);
    const validator = createPullRequestLabelValidator({
        defaultValidLabels,
        packageInfo: {
            repository: { url: 'https://github.com/owner/repo.git' },
            'pr-log': {
                validLabels: configuredValidLabels,
                ignoredLabels: ['release']
            }
        },
        resolvePullRequestLabels
    });

    await validator.validate(pullRequestId);

    assert.deepStrictEqual(resolvePullRequestLabels.firstCall.args, [
        {
            githubRepo: 'owner/repo',
            validLabels,
            ignoredLabels: ['release'],
            pullRequests: [{ id: pullRequestId, title: '' }],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }
    ]);
});

test('reports pull request label validation failures', async () => {
    const error = new Error('Pull Request #123 has no label of bug');
    const validator = createPullRequestLabelValidator({
        defaultValidLabels,
        packageInfo: {
            repository: { url: 'https://github.com/owner/repo.git' }
        },
        resolvePullRequestLabels: fake.rejects(error)
    });

    await assert.rejects(validator.validate(pullRequestId), error);
});
