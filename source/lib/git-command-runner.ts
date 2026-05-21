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

type FirstParentCommitLogEntry = {
    readonly hash: string;
    readonly subject: string;
    readonly body: string | undefined;
};

type FirstParentCommitLogFields = readonly [hash: string, subject: string, body: string | undefined];
type FirstParentCommitLogParts = readonly [hash: string, subject: string, ...remainingFields: readonly string[]];

export type GitCommandRunner = {
    getShortStatus(): Promise<string>;
    getCurrentBranchName(): Promise<string>;
    fetchRemote(remoteAlias: string): Promise<void>;
    getSymmetricDifferencesBetweenBranches(branchA: string, branchB: string): Promise<readonly string[]>;
    getRemoteAliases(): Promise<readonly RemoteAlias[]>;
    listTags(): Promise<readonly string[]>;
    hasRef(ref: string): Promise<boolean>;
    getMergeCommitLogs(from: string): Promise<readonly MergeCommitLogEntry[]>;
    getFirstParentCommitLogs(from: string): Promise<readonly FirstParentCommitLogEntry[]>;
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
const minimumCommitLogFieldCount = 2;
const bodyFieldIndex = 2;

function createParsableMergeGitLogFormat(): string {
    const subjectPlaceholder = '%s';
    const bodyPlaceholder = '%b';
    const fields = [subjectPlaceholder, bodyPlaceholder];

    return `${fields.join(fieldSeparator)}${lineSeparator}`;
}

function createParsableFirstParentGitLogFormat(): string {
    const hashPlaceholder = '%H';
    const subjectPlaceholder = '%s';
    const bodyPlaceholder = '%b';
    const fields = [hashPlaceholder, subjectPlaceholder, bodyPlaceholder];

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

function hasFirstParentCommitLogFields(parts: readonly string[]): parts is FirstParentCommitLogParts {
    return parts.length >= minimumCommitLogFieldCount;
}

function parseFirstParentCommitLogFields(log: string): FirstParentCommitLogFields {
    const parts = splitByString(log, fieldSeparator);

    if (!hasFirstParentCommitLogFields(parts)) {
        throw new TypeError('Failed to determine git commit log entry');
    }

    const [hash, subject] = parts;
    const body = parts[bodyFieldIndex];

    return [hash, subject, body];
}

async function readShortStatus(execute: typeof execaCommand): Promise<string> {
    const result = await execute('git status --short');
    return result.stdout.trim();
}

async function readCurrentBranchName(execute: typeof execaCommand): Promise<string> {
    const result = await execute('git rev-parse --abbrev-ref HEAD');
    return result.stdout.trim();
}

async function fetchRemoteByAlias(execute: typeof execaCommand, remoteAlias: string): Promise<void> {
    await execute(`git fetch ${remoteAlias}`);
}

async function readSymmetricBranchDifferences(
    execute: typeof execaCommand,
    branchA: string,
    branchB: string
): Promise<readonly string[]> {
    const result = await execute(`git rev-list --left-right ${branchA}...${branchB}`);
    return splitLines(result.stdout);
}

async function readRemoteAliases(execute: typeof execaCommand): Promise<readonly RemoteAlias[]> {
    const result = await execute('git remote -v');

    return splitLines(result.stdout).map((line: string) => {
        const remoteLineTokens = splitByPattern(line, /\s/);
        const [alias, url] = remoteLineTokens;

        if (url === undefined) {
            throw new TypeError('Failed to determine git remote alias');
        }

        return { alias, url };
    });
}

async function readTags(execute: typeof execaCommand): Promise<readonly string[]> {
    const result = await execute('git tag --list');
    return splitLines(result.stdout);
}

async function readMergeCommitLogs(
    execute: typeof execaCommand,
    from: string
): Promise<readonly MergeCommitLogEntry[]> {
    const result = await execute(oneLine`git log --first-parent --no-color
        --pretty=format:${createParsableMergeGitLogFormat()} --merges ${from}..HEAD`);

    const logs = splitLines(result.stdout, lineSeparator);
    return logs.map((log) => {
        const parts = splitByString(log, fieldSeparator);
        const [subject, body] = parts;

        return { subject, body: body === '' ? undefined : body };
    });
}

async function readFirstParentCommitLogs(
    execute: typeof execaCommand,
    from: string
): Promise<readonly FirstParentCommitLogEntry[]> {
    const result = await execute(
        oneLine`git log --first-parent --no-color
            --pretty=format:${createParsableFirstParentGitLogFormat()} ${from}..HEAD`
    );

    const logs = splitLines(result.stdout, lineSeparator);
    return logs.map((log) => {
        const [hash, subject, body] = parseFirstParentCommitLogFields(log);
        return { hash, subject, body: body === '' ? undefined : body };
    });
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
