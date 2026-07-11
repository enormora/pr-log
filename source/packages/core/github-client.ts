import type { Octokit, Octokit as OctokitConstructor } from '@octokit/rest';

export type GitHubClientOptions = {
    readonly githubToken: string | undefined;
    readonly githubApiBaseUrl?: string | undefined;
};

export type GitHubClientDependencies = {
    readonly Octokit: new (
        options: ConstructorParameters<typeof OctokitConstructor>[0]
    ) => Readonly<Octokit>;
};

export function createGitHubClient(
    dependencies: GitHubClientDependencies,
    options: GitHubClientOptions
): Readonly<Octokit> {
    if (options.githubApiBaseUrl === undefined) {
        return new dependencies.Octokit({ auth: options.githubToken });
    }
    return new dependencies.Octokit({ auth: options.githubToken, baseUrl: options.githubApiBaseUrl });
}
