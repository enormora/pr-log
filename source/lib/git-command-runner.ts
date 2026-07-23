import { oneLine } from 'common-tags';
import { parseCommandString } from 'execa';
import { splitByString, splitByPattern } from './split.ts';

export type RemoteAlias = {
    readonly alias: string;
    readonly url: string;
};

type MergeCommitLogEntry = {
    readonly subject: string;
    readonly body: string | undefined;
};

type FirstParentCommitLogEntry = {
    readonly hash: string;
    readonly parents: readonly string[];
    readonly subject: string;
    readonly body: string | undefined;
};

type FirstParentCommitLogFields = readonly [
    hash: string,
    parents: readonly string[],
    subject: string,
    body: string | undefined
];
type FirstParentCommitLogParts = readonly [
    hash: string,
    parents: string,
    subject: string,
    ...remainingFields: readonly string[]
];

export type GitCommandRunner = {
    getShortStatus: () => Promise<string>;
    getCurrentBranchName: () => Promise<string>;
    fetchRemote: (remoteAlias: string) => Promise<void>;
    getSymmetricDifferencesBetweenBranches: (branchA: string, branchB: string) => Promise<readonly string[]>;
    getRemoteAliases: () => Promise<readonly RemoteAlias[]>;
    listTags: () => Promise<readonly string[]>;
    hasRef: (ref: string) => Promise<boolean>;
    getMergeCommitLogs: (from: string) => Promise<readonly MergeCommitLogEntry[]>;
    getFirstParentCommitLogs: (from: string) => Promise<readonly FirstParentCommitLogEntry[]>;
};

export type GitCommandResult = {
    readonly stdout: string;
};

export type GitCommandExecutor = (command: string) => Promise<GitCommandResult>;

export type GitCommandRunnerDependencies = {
    readonly execute: GitCommandExecutor;
};

type CommandStringExecutorParameters = {
    readonly executeFile: CommandStringFileExecutor;
    readonly workingDirectory: string;
};

type CommandStringFileExecutorOptions = {
    readonly cwd: string;
};

type CommandStringFileExecutor = (
    file: string,
    commandArguments: readonly string[],
    options: CommandStringFileExecutorOptions
) => Promise<GitCommandResult>;

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
const minimumCommitLogFieldCount = 3;
const bodyFieldIndex = 3;

function createParsableMergeGitLogFormat(): string {
    const subjectPlaceholder = '%s';
    const bodyPlaceholder = '%b';
    const fields = [ subjectPlaceholder, bodyPlaceholder ];

    return `${fields.join(fieldSeparator)}${lineSeparator}`;
}

function createParsableFirstParentGitLogFormat(): string {
    const hashPlaceholder = '%H';
    const parentPlaceholder = '%P';
    const subjectPlaceholder = '%s';
    const bodyPlaceholder = '%b';
    const fields = [ hashPlaceholder, parentPlaceholder, subjectPlaceholder, bodyPlaceholder ];

    return `${fields.join(fieldSeparator)}${lineSeparator}`;
}

async function hasExistingRef(execute: GitCommandExecutor, ref: string): Promise<boolean> {
    try {
        const commitType = '{commit}';
        await execute(`git rev-parse --verify --quiet ${ref}^${commitType}`);
        return true;
    } catch {
        return false;
    }
}

function hasFirstParentCommitLogFields(parts: readonly string[]): parts is FirstParentCommitLogParts {
    return parts.length >= minimumCommitLogFieldCount;
}

function parseFirstParentCommitLogFields(log: string): FirstParentCommitLogFields {
    const parts = splitByString(log, fieldSeparator);

    if (!hasFirstParentCommitLogFields(parts)) {
        throw new TypeError('Failed to determine git commit log entry');
    }

    const [ hash, parentsField, subject ] = parts;
    const body = parts[bodyFieldIndex];
    const parents = splitByString(parentsField, ' ').filter(isNonEmptyString);

    return [ hash, parents, subject, body ];
}

async function readShortStatus(execute: GitCommandExecutor): Promise<string> {
    const result = await execute('git status --short');
    return result.stdout.trim();
}

async function readCurrentBranchName(execute: GitCommandExecutor): Promise<string> {
    const result = await execute('git rev-parse --abbrev-ref HEAD');
    return result.stdout.trim();
}

async function fetchRemoteByAlias(execute: GitCommandExecutor, remoteAlias: string): Promise<void> {
    await execute(`git fetch ${remoteAlias}`);
}

async function readSymmetricBranchDifferences(
    execute: GitCommandExecutor,
    branchA: string,
    branchB: string
): Promise<readonly string[]> {
    const result = await execute(`git rev-list --left-right ${branchA}...${branchB}`);
    return splitLines(result.stdout);
}

async function readRemoteAliases(execute: GitCommandExecutor): Promise<readonly RemoteAlias[]> {
    const result = await execute('git remote -v');

    return splitLines(result.stdout).map(function (line: string) {
        const remoteLineTokens = splitByPattern(line, /\s/);
        const [ alias, url ] = remoteLineTokens;

        if (url === undefined) {
            throw new TypeError('Failed to determine git remote alias');
        }

        return { alias, url };
    });
}

async function readTags(execute: GitCommandExecutor): Promise<readonly string[]> {
    const result = await execute('git tag --list');
    return splitLines(result.stdout);
}

async function readMergeCommitLogs(execute: GitCommandExecutor, from: string): Promise<readonly MergeCommitLogEntry[]> {
    const result = await execute(oneLine`git log --first-parent --no-color
        --pretty=format:${createParsableMergeGitLogFormat()} --merges ${from}..HEAD`);

    const logs = splitLines(result.stdout, lineSeparator);
    return logs.map(function (log) {
        const parts = splitByString(log, fieldSeparator);
        const [ subject, body ] = parts;

        return { subject, body: body === '' ? undefined : body };
    });
}

async function readFirstParentCommitLogs(
    execute: GitCommandExecutor,
    from: string
): Promise<readonly FirstParentCommitLogEntry[]> {
    const result = await execute(
        oneLine`git log --first-parent --no-color
            --pretty=format:${createParsableFirstParentGitLogFormat()} ${from}..HEAD`
    );

    const logs = splitLines(result.stdout, lineSeparator);
    return logs.map(function (log) {
        const [ hash, parents, subject, body ] = parseFirstParentCommitLogFields(log);
        return { hash, parents, subject, body: body === '' ? undefined : body };
    });
}

export function createCommandStringExecutor(parameters: CommandStringExecutorParameters): GitCommandExecutor {
    return async function executeCommandString(command) {
        const [ file, ...commandArguments ] = parseCommandString(command);

        if (file === undefined) {
            throw new TypeError('Cannot execute an empty command');
        }

        return parameters.executeFile(file, commandArguments, { cwd: parameters.workingDirectory });
    };
}

export function createGitCommandRunner(dependencies: GitCommandRunnerDependencies): GitCommandRunner {
    const { execute } = dependencies;

    return {
        async getShortStatus() {
            return readShortStatus(execute);
        },

        async getCurrentBranchName() {
            return readCurrentBranchName(execute);
        },

        async fetchRemote(remoteAlias) {
            return fetchRemoteByAlias(execute, remoteAlias);
        },

        async getSymmetricDifferencesBetweenBranches(branchA, branchB) {
            return readSymmetricBranchDifferences(execute, branchA, branchB);
        },

        async getRemoteAliases() {
            return readRemoteAliases(execute);
        },

        async listTags() {
            return readTags(execute);
        },

        async hasRef(ref) {
            return hasExistingRef(execute, ref);
        },

        async getMergeCommitLogs(from) {
            return readMergeCommitLogs(execute, from);
        },

        async getFirstParentCommitLogs(from) {
            return readFirstParentCommitLogs(execute, from);
        }
    };
}
