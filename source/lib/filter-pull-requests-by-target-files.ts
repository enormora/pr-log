import type { PullRequest } from './collect-merged-pull-requests.ts';
import type { PullRequestChangedFile } from './pull-request-changed-files.ts';

export type FilterPullRequestsByTargetFilesInput = {
    readonly targetName: string;
    readonly targetSourceFiles: readonly string[];
    readonly pullRequests: readonly PullRequest[];
    readonly changedFilesByPullRequest: ReadonlyMap<number, readonly PullRequestChangedFile[]>;
    readonly ignoredAttributionPaths: readonly string[];
};

function normalizeRepositoryPath(filePath: string): string {
    return filePath.replaceAll('\\', '/').replace(/^\.?\//u, '');
}

function createNormalizedPathSet(paths: readonly string[]): ReadonlySet<string> {
    return new Set(paths.map(normalizeRepositoryPath));
}

type TargetFileChangeInput = {
    readonly changedFiles: readonly PullRequestChangedFile[];
    readonly targetSourceFiles: ReadonlySet<string>;
    readonly ignoredAttributionPaths: ReadonlySet<string>;
};

function changedFilePaths(changedFile: PullRequestChangedFile): readonly string[] {
    if (changedFile.previousPath === undefined) {
        return [ changedFile.path ];
    }
    return [ changedFile.path, changedFile.previousPath ];
}

function hasTargetFileChange(options: TargetFileChangeInput): boolean {
    const { changedFiles, targetSourceFiles, ignoredAttributionPaths } = options;

    return changedFiles.some(function (changedFile) {
        const normalizedChangedFiles = changedFilePaths(changedFile).map(normalizeRepositoryPath);

        return normalizedChangedFiles.some(function (normalizedChangedFile) {
            return targetSourceFiles.has(normalizedChangedFile) && !ignoredAttributionPaths.has(normalizedChangedFile);
        });
    });
}

export function filterPullRequestsByTargetFiles(input: FilterPullRequestsByTargetFilesInput): readonly PullRequest[] {
    const targetSourceFiles = createNormalizedPathSet(input.targetSourceFiles);
    const ignoredAttributionPaths = createNormalizedPathSet(input.ignoredAttributionPaths);

    return input.pullRequests.filter(function (pullRequest) {
        const changedFiles = input.changedFilesByPullRequest.get(pullRequest.id) ?? [];

        return hasTargetFileChange({ changedFiles, targetSourceFiles, ignoredAttributionPaths });
    });
}
