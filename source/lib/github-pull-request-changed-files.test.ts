import assert from 'node:assert';
import type { Octokit } from '@octokit/rest';
import { fake } from 'sinon';
import { createGitHubPullRequestChangedFilesReader } from './github-pull-request-changed-files.ts';

const pullRequestId = 123;

test('creates a GitHub changed files reader', async () => {
    const listFiles = fake();
    const paginate = fake.resolves([{ filename: 'source/a.ts' }, { filename: 'README.md' }]);
    const githubClient = {
        paginate,
        pulls: { listFiles }
    } as unknown as Octokit;
    const changedFilesReader = createGitHubPullRequestChangedFilesReader(githubClient);

    const changedFiles = await changedFilesReader.getChangedFiles('owner/repo', pullRequestId);

    assert.deepStrictEqual(paginate.firstCall.args, [
        listFiles,
        { owner: 'owner', repo: 'repo', pull_number: pullRequestId }
    ]);
    assert.deepStrictEqual(changedFiles, ['source/a.ts', 'README.md']);
});

test('throws when the GitHub repo cannot be split', async () => {
    const githubClient = { paginate: fake.resolves([]), pulls: { listFiles: fake() } } as unknown as Octokit;
    const changedFilesReader = createGitHubPullRequestChangedFilesReader(githubClient);

    await assert.rejects(changedFilesReader.getChangedFiles('invalid-repo', pullRequestId), {
        message: 'Could not find a repository'
    });
});
