import assert from 'node:assert';
import type { Octokit } from '@octokit/rest';
import { fake } from 'sinon';
import { createGitHubPullRequestChangedFilesReader } from './github-pull-request-changed-files.ts';

const pullRequestId = 123;

test('creates a GitHub changed files reader', async function () {
    const listFiles = fake();
    const paginate = fake.resolves([
        {
            filename: 'source/a.ts',
            previous_filename: 'src/a.ts',
            status: 'renamed',
            additions: 2,
            deletions: 1,
            changes: 3,
            patch: 'ignored'
        },
        {
            filename: 'README.md',
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1,
            patch: 'ignored'
        }
    ]);
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
    assert.deepStrictEqual(changedFiles, [
        {
            path: 'source/a.ts',
            previousPath: 'src/a.ts',
            status: 'renamed',
            additions: 2,
            deletions: 1,
            changes: 3
        },
        {
            path: 'README.md',
            previousPath: undefined,
            status: 'modified',
            additions: 1,
            deletions: 0,
            changes: 1
        }
    ]);
});

test('throws when the GitHub repo cannot be split', async function () {
    const githubClient = { paginate: fake.resolves([]), pulls: { listFiles: fake() } } as unknown as Octokit;
    const changedFilesReader = createGitHubPullRequestChangedFilesReader(githubClient);

    await assert.rejects(changedFilesReader.getChangedFiles('invalid-repo', pullRequestId), {
        message: 'Could not find a repository'
    });
});
