import assert from 'node:assert';
import { fake, type SinonSpy } from 'sinon';
import {
    createGitCommandRunner,
    type GitCommandRunner,
    type GitCommandRunnerDependencies
} from './git-command-runner.ts';

type Overrides = {
    readonly execute?: SinonSpy;
};

function gitCommandRunnerFactory(overrides: Overrides = {}): GitCommandRunner {
    const { execute = fake.resolves({ stdout: '' }) } = overrides;
    const fakeDependencies = { execute } as unknown as GitCommandRunnerDependencies;

    return createGitCommandRunner(fakeDependencies);
}

function assertExecutedCommand(execute: SinonSpy, command: string): void {
    assert.deepStrictEqual({
        callCount: execute.callCount,
        calls: execute.getCalls().map(function (call): readonly unknown[] {
            return call.args as readonly unknown[];
        })
    }, {
        callCount: 1,
        calls: [ [ command ] ]
    });
}

test('getShortStatus() executes "git status" with correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getShortStatus();

    assertExecutedCommand(execute, 'git status --short');
});

test('getShortStatus() returns the command output without leading or trailing whitespace', async function () {
    const execute = fake.resolves({ stdout: '  foo \n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getShortStatus();

    assert.strictEqual(result, 'foo');
});

test('getCurrentBranchName() executes "git rev-parse" with correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getCurrentBranchName();

    assertExecutedCommand(execute, 'git rev-parse --abbrev-ref HEAD');
});

test('getCurrentBranchName() returns the command output without leading or trailing whitespace', async function () {
    const execute = fake.resolves({ stdout: '  foo \n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getCurrentBranchName();

    assert.strictEqual(result, 'foo');
});

test('fetchRemote() executes "git fetch" with the given remote', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.fetchRemote('foo');

    assertExecutedCommand(execute, 'git fetch foo');
});

test('getSymmetricDifferencesBetweenBranches() executes "git rev-list" with correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getSymmetricDifferencesBetweenBranches('a', 'b');

    assertExecutedCommand(execute, 'git rev-list --left-right a...b');
});

test('getSymmetricDifferencesBetweenBranches() returns the command output splitted as individual lines', async function () {
    const execute = fake.resolves({ stdout: ' a \nb\nc \n \n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getSymmetricDifferencesBetweenBranches('a', 'b');

    assert.deepStrictEqual(result, [ 'a', 'b', 'c' ]);
});

test('getRemoteAliases() executes "git remote -v"', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getRemoteAliases();

    assertExecutedCommand(execute, 'git remote -v');
});

test('getRemoteAliases() returns the parsed command output', async function () {
    const execute = fake.resolves({
        stdout: 'foo git@example.com/repo/a.git (fetch)\nfoo\tgit@example.com/repo/a.git (push)\n\n'
    });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getRemoteAliases();

    assert.deepStrictEqual(result, [
        { alias: 'foo', url: 'git@example.com/repo/a.git' },
        { alias: 'foo', url: 'git@example.com/repo/a.git' }
    ]);
});

test('getRemoteAliases() throws when the url of an remote entry cannot be determined', async function () {
    const execute = fake.resolves({ stdout: 'foo git@example.com/repo/a.git (fetch)\nfoo' });
    const runner = gitCommandRunnerFactory({ execute });

    await assert.rejects(runner.getRemoteAliases(), { message: 'Failed to determine git remote alias' });
});

test('listTags() executes "git tag" with correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.listTags();

    assertExecutedCommand(execute, 'git tag --list');
});

test('listTags() returns the command output splitted as individual lines', async function () {
    const execute = fake.resolves({ stdout: ' a \nb\nc \n \n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.listTags();

    assert.deepStrictEqual(result, [ 'a', 'b', 'c' ]);
});

test('hasRef() executes "git rev-parse" with the given ref', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.hasRef('foo');

    assertExecutedCommand(execute, 'git rev-parse --verify --quiet foo^{commit}');
});

test('hasRef() returns true when git finds the ref', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.hasRef('foo');

    assert.strictEqual(result, true);
});

test('hasRef() returns false when git cannot find the ref', async function () {
    const execute = fake.rejects(new Error('missing ref'));
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.hasRef('foo');

    assert.strictEqual(result, false);
});

test('getMergeCommitLogs() executes "git log" with the correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getMergeCommitLogs('foo');

    assertExecutedCommand(
        execute,
        'git log --first-parent --no-color --pretty=format:%s__||__%b##$$@@$$## --merges foo..HEAD'
    );
});

test('getMergeCommitLogs() returns the parsed command output', async function () {
    const execute = fake.resolves({ stdout: 'foo__||__bar##$$@@$$##\nbaz__||__qux##$$@@$$##\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    assert.deepStrictEqual(result, [
        { subject: 'foo', body: 'bar' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() parses multi-line message bodies correctly', async function () {
    const execute = fake.resolves({ stdout: 'foo__||__bar\nbaz\nqux##$$@@$$##\nbaz__||__qux##$$@@$$##\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    assert.deepStrictEqual(result, [
        { subject: 'foo', body: 'bar\nbaz\nqux' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() parses multi-line bodies correctly when it doesn’t end with a line break', async function () {
    const execute = fake.resolves({ stdout: 'foo__||__bar\nbaz\nqux##$$@@$$##\nbaz__||__qux##$$@@$$##' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    assert.deepStrictEqual(result, [
        { subject: 'foo', body: 'bar\nbaz\nqux' },
        { subject: 'baz', body: 'qux' }
    ]);
});

test('getMergeCommitLogs() falls back to undefined when the body couldn’t be extracted', async function () {
    const execute = fake.resolves({ stdout: 'foo##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    assert.deepStrictEqual(result, [ { subject: 'foo', body: undefined } ]);
});

test('getMergeCommitLogs() falls back to undefined when the body is an empty string', async function () {
    const execute = fake.resolves({ stdout: 'foo__||__##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getMergeCommitLogs('');

    assert.deepStrictEqual(result, [ { subject: 'foo', body: undefined } ]);
});

test('getFirstParentCommitLogs() executes "git log" with the correct options', async function () {
    const execute = fake.resolves({ stdout: '' });
    const runner = gitCommandRunnerFactory({ execute });

    await runner.getFirstParentCommitLogs('foo');

    assertExecutedCommand(
        execute,
        'git log --first-parent --no-color --pretty=format:%H__||__%s__||__%b##$$@@$$## foo..HEAD'
    );
});

test('getFirstParentCommitLogs() returns the parsed command output', async function () {
    const execute = fake.resolves({
        stdout: 'hash-1__||__foo__||__bar##$$@@$$##\nhash-2__||__baz__||__qux##$$@@$$##\n\n'
    });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getFirstParentCommitLogs('');

    assert.deepStrictEqual(result, [
        { hash: 'hash-1', subject: 'foo', body: 'bar' },
        { hash: 'hash-2', subject: 'baz', body: 'qux' }
    ]);
});

test('getFirstParentCommitLogs() parses multi-line message bodies correctly', async function () {
    const execute = fake.resolves({
        stdout: 'hash-1__||__foo__||__bar\nbaz\nqux##$$@@$$##\nhash-2__||__baz__||__qux##$$@@$$##\n\n'
    });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getFirstParentCommitLogs('');

    assert.deepStrictEqual(result, [
        { hash: 'hash-1', subject: 'foo', body: 'bar\nbaz\nqux' },
        { hash: 'hash-2', subject: 'baz', body: 'qux' }
    ]);
});

test('getFirstParentCommitLogs() parses multi-line bodies correctly when it doesn’t end with a line break', async function () {
    const execute = fake.resolves({
        stdout: 'hash-1__||__foo__||__bar\nbaz\nqux##$$@@$$##\nhash-2__||__baz__||__qux##$$@@$$##'
    });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getFirstParentCommitLogs('');

    assert.deepStrictEqual(result, [
        { hash: 'hash-1', subject: 'foo', body: 'bar\nbaz\nqux' },
        { hash: 'hash-2', subject: 'baz', body: 'qux' }
    ]);
});

test('getFirstParentCommitLogs() falls back to undefined when the body couldn’t be extracted', async function () {
    const execute = fake.resolves({ stdout: 'hash-1__||__foo##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getFirstParentCommitLogs('');

    assert.deepStrictEqual(result, [ { hash: 'hash-1', subject: 'foo', body: undefined } ]);
});

test('getFirstParentCommitLogs() falls back to undefined when the body is an empty string', async function () {
    const execute = fake.resolves({ stdout: 'hash-1__||__foo__||__##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    const result = await runner.getFirstParentCommitLogs('');

    assert.deepStrictEqual(result, [ { hash: 'hash-1', subject: 'foo', body: undefined } ]);
});

test('getFirstParentCommitLogs() throws when the commit subject cannot be determined', async function () {
    const execute = fake.resolves({ stdout: 'hash-1##$$@@$$##\n\n\n' });
    const runner = gitCommandRunnerFactory({ execute });

    await assert.rejects(runner.getFirstParentCommitLogs(''), {
        message: 'Failed to determine git commit log entry'
    });
});
