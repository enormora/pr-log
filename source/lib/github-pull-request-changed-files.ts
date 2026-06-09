import type { Octokit } from '@octokit/rest';
import { splitByString } from './split.ts';
import type { PullRequestChangedFilesReader } from './pull-request-changed-files.ts';

type PullRequestFile = Readonly<Awaited<ReturnType<Octokit['pulls']['listFiles']>>['data'][number]>;

function determineRepoDetails(githubRepo: string): Readonly<[owner: string, repo: string]> {
    const [owner, repo] = splitByString(githubRepo, '/');

    if (repo === undefined) {
        throw new TypeError('Could not find a repository');
    }

    return [owner, repo];
}

async function getPullRequestChangedFiles(
    githubClient: Readonly<Octokit>,
    githubRepo: string,
    pullRequestId: number
): Promise<readonly string[]> {
    const [owner, repo] = determineRepoDetails(githubRepo);
    const files = (await githubClient.paginate(githubClient.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullRequestId
    })) as PullRequestFile[];

    return files.map((file) => {
        return file.filename;
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
