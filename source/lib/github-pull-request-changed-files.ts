import type { Octokit } from '@octokit/rest';
import { splitByString } from './split.ts';
import type { PullRequestChangedFile, PullRequestChangedFilesReader } from './pull-request-changed-files.ts';

type PullRequestFile = Readonly<Awaited<ReturnType<Octokit['pulls']['listFiles']>>['data'][number]>;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [ owner, repo ] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [ owner, repo ];
}

async function getPullRequestChangedFiles(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<readonly PullRequestChangedFile[]> {
    const [ owner, repo ] = determineRepoDetails(githubRepo);
    const files = (await githubClient.paginate(githubClient.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullRequestId
    })) as PullRequestFile[];

    return files.map(function (file) {
        return {
            path: file.filename,
            previousPath: file.previous_filename ?? undefined,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes
        };
    });
}

export function createGitHubPullRequestChangedFilesReader(
    githubClient: Readonly<Octokit>
): PullRequestChangedFilesReader {
    return {
        async getChangedFiles(githubRepo, pullRequestId) {
            return getPullRequestChangedFiles(githubClient, githubRepo, pullRequestId);
        }
    };
}
