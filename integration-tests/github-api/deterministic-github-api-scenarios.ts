export type DeterministicGitHubChangedFile = {
    readonly path: string;
    readonly previousPath: string | undefined;
    readonly status: string;
    readonly additions: number;
    readonly deletions: number;
    readonly changes: number;
};

export type DeterministicGitHubFilePage = {
    readonly files: readonly DeterministicGitHubChangedFile[];
};

export type DeterministicGitHubErrorResponse = {
    readonly status: number;
    readonly body: Readonly<Record<string, unknown>>;
};

export type DeterministicGitHubPullRequestFiles = {
    readonly pullRequestId: number;
    readonly pages: readonly DeterministicGitHubFilePage[];
    readonly error: DeterministicGitHubErrorResponse | undefined;
};

export type DeterministicGitHubApiScenario = {
    readonly pullRequestFiles: readonly DeterministicGitHubPullRequestFiles[];
};

const serverErrorStatus = 500;

export function changedFile(
    path: string,
    previousPath: string | undefined,
    status: string
): DeterministicGitHubChangedFile {
    return {
        path,
        previousPath,
        status,
        additions: 2,
        deletions: 1,
        changes: 3
    };
}

export const renamedReadmeFiles: readonly DeterministicGitHubChangedFile[] = [
    changedFile('source/packages/core/README.md', 'README.md', 'renamed'),
    changedFile('source/index.ts', undefined, 'modified')
];

const firstPaginatedFile = changedFile('source/a.ts', undefined, 'added');
const secondPaginatedFile = changedFile('source/b.ts', undefined, 'modified');

export const paginatedFiles: readonly DeterministicGitHubChangedFile[] = [
    firstPaginatedFile,
    secondPaginatedFile
];

export const renamedReadmeScenario: DeterministicGitHubApiScenario = {
    pullRequestFiles: [
        {
            pullRequestId: 123,
            pages: [
                {
                    files: renamedReadmeFiles
                }
            ],
            error: undefined
        }
    ]
};

export const paginatedFilesScenario: DeterministicGitHubApiScenario = {
    pullRequestFiles: [
        {
            pullRequestId: 321,
            pages: [
                { files: [ firstPaginatedFile ] },
                { files: [ secondPaginatedFile ] }
            ],
            error: undefined
        }
    ]
};

export const emptyFilesScenario: DeterministicGitHubApiScenario = {
    pullRequestFiles: [
        {
            pullRequestId: 404,
            pages: [],
            error: undefined
        }
    ]
};

export const failingFilesScenario: DeterministicGitHubApiScenario = {
    pullRequestFiles: [
        {
            pullRequestId: 500,
            pages: [],
            error: {
                status: serverErrorStatus,
                body: { message: 'deterministic failure' }
            }
        }
    ]
};
