import type { execaCommand } from 'execa';
import { oneLine } from 'common-tags';
import { splitByString, splitByPattern } from './split.ts';

export type RemoteAlias = {
    readonly alias: string;
    readonly url: string;
};

type MergeCommitLogEntry = {
    readonly subject: string;
    readonly body: string | undefined;
};

export type GitCommandRunner = {
    getShortStatus(): Promise<string>;
    getCurrentBranchName(): Promise<string>;
    fetchRemote(remoteAlias: string): Promise<void>;
    getSymmetricDifferencesBetweenBranches(branchA: string, branchB: string): Promise<readonly string[]>;
    getRemoteAliases(): Promise<readonly RemoteAlias[]>;
    listTags(): Promise<readonly string[]>;
    hasRef(ref: string): Promise<boolean>;
    getMergeCommitLogs(from: string): Promise<readonly MergeCommitLogEntry[]>;
};

export type GitCommandRunnerDependencies = {
    readonly execute: typeof execaCommand;
};

function trim(value: string): string {
    return value.trim();
}

function isNonEmptyString(value: string): boolean {
    return value.length > 0;
}

function splitLines(value: string, lineSeparator = '\n'): readonly string[] {
    return splitByString(value, lineSeparator).map(trim).filter(isNonEmptyString);
}

const lineSeparator = '##$$@@$$##';
const fieldSeparator = '__||__';

function createParsableGitLogFormat(): string {
    const subjectPlaceholder = '%s';
    const bodyPlaceholder = '%b';
    const fields = [subjectPlaceholder, bodyPlaceholder];

    return `${fields.join(fieldSeparator)}${lineSeparator}`;
}

async function hasExistingRef(execute: typeof execaCommand, ref: string): Promise<boolean> {
    try {
        await execute(`git rev-parse --verify --quiet ${ref}^{commit}`);
        return true;
    } catch {
        return false;
    }
}

export function createGitCommandRunner(dependencies: GitCommandRunnerDependencies): GitCommandRunner {
    const { execute } = dependencies;

    return {
        async getShortStatus() {
            const result = await execute('git status --short');
            return result.stdout.trim();
        },

        async getCurrentBranchName() {
            const result = await execute('git rev-parse --abbrev-ref HEAD');
            return result.stdout.trim();
        },

        async fetchRemote(remoteAlias) {
            await execute(`git fetch ${remoteAlias}`);
        },

        async getSymmetricDifferencesBetweenBranches(branchA, branchB) {
            const result = await execute(`git rev-list --left-right ${branchA}...${branchB}`);
            return splitLines(result.stdout);
        },

        async getRemoteAliases() {
            const result = await execute('git remote -v');

            return splitLines(result.stdout).map((line: string) => {
                const remoteLineTokens = splitByPattern(line, /\s/);
                const [alias, url] = remoteLineTokens;

                if (url === undefined) {
                    throw new TypeError('Failed to determine git remote alias');
                }

                return { alias, url };
            });
        },

        async listTags() {
            const result = await execute('git tag --list');
            return splitLines(result.stdout);
        },

        async hasRef(ref) {
            return hasExistingRef(execute, ref);
        },

        async getMergeCommitLogs(from) {
            const result = await execute(oneLine`git log --first-parent --no-color
                    --pretty=format:${createParsableGitLogFormat()} --merges ${from}..HEAD`);

            const logs = splitLines(result.stdout, lineSeparator);
            return logs.map((log) => {
                const parts = splitByString(log, fieldSeparator);
                const [subject, body] = parts;

                return { subject, body: body === '' ? undefined : body };
            });
        }
    };
}
