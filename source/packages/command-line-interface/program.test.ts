import assert from 'node:assert';
import { stub, type SinonStub } from 'sinon';
import type { CliRunner } from '../../lib/cli.ts';
import type { CliRunOptions } from '../../lib/cli-run-options.ts';
import type { PullRequestLabelValidator } from '../../lib/validate-pull-request-labels.ts';
import { createProgramError, createProgram, type ProgramDependencies } from './program.ts';

type FactoryResult = {
    readonly dependencies: ProgramDependencies;
    readonly auth: SinonStub;
    readonly createCliRunner: SinonStub;
    readonly createPullRequestLabelValidator: SinonStub;
    readonly readPackageInfo: SinonStub;
    readonly reportError: SinonStub;
    readonly run: SinonStub;
    readonly validate: SinonStub;
};

type ProgramStubs = {
    readonly auth: SinonStub;
    readonly createCliRunner: SinonStub;
    readonly createPullRequestLabelValidator: SinonStub;
    readonly readPackageInfo: SinonStub;
    readonly reportError: SinonStub;
    readonly run: SinonStub;
    readonly validate: SinonStub;
};

const pullRequestId = 123;
const pullRequestIdText = '123';

function createProgramStubs(): ProgramStubs {
    const auth = stub().resolves(undefined);
    const readPackageInfo = stub().resolves({ name: 'consumer-package' });
    const run = stub().resolves(undefined);
    const validate = stub().resolves(undefined);
    const cliRunner: CliRunner = { run };
    const pullRequestLabelValidator: PullRequestLabelValidator = { validate };
    const createCliRunner = stub().returns(cliRunner);
    const createPullRequestLabelValidator = stub().returns(pullRequestLabelValidator);
    const reportError = stub();

    return {
        auth,
        createCliRunner,
        createPullRequestLabelValidator,
        readPackageInfo,
        reportError,
        run,
        validate
    };
}

function createProgramDependencies(githubToken: string | undefined, programStubs: ProgramStubs): ProgramDependencies {
    return {
        packageMetadata: {
            name: 'pr-log',
            description: 'Changelog generator',
            version: '1.2.3'
        },
        githubToken,
        githubClient: { auth: programStubs.auth },
        changelogPath: '/project/CHANGELOG.md',
        readPackageInfo: programStubs.readPackageInfo,
        createCliRunner: programStubs.createCliRunner,
        createPullRequestLabelValidator: programStubs.createPullRequestLabelValidator,
        reportError(error, options) {
            programStubs.reportError(error, options);
        }
    };
}

function createDependencies(githubToken: string | undefined): FactoryResult {
    const programStubs = createProgramStubs();
    const dependencies = createProgramDependencies(githubToken, programStubs);

    return { dependencies, ...programStubs };
}

test('createProgram() runs the CLI with parsed release options', async function () {
    const { dependencies, auth, createCliRunner, readPackageInfo, run } = createDependencies('github-token');
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', '1.2.3', '--sloppy', '--stdout', '--default-branch', 'develop' ]);

    assert.strictEqual(auth.callCount, 1);
    assert.strictEqual(readPackageInfo.callCount, 1);
    assert.deepStrictEqual(createCliRunner.firstCall.args, [
        {
            defaultBranch: 'develop',
            packageInfo: { name: 'consumer-package' }
        }
    ]);
    const runOptions = run.firstCall.args[0] as CliRunOptions;

    assert.deepStrictEqual(runOptions, {
        unreleased: false,
        autoVersion: false,
        versionNumber: runOptions.versionNumber,
        changelogPath: '/project/CHANGELOG.md',
        sloppy: true,
        stdout: true
    });
    assert.strictEqual(runOptions.versionNumber.unwrapOr(''), '1.2.3');
});

test('createProgram() skips authentication without a GitHub token', async function () {
    const { dependencies, auth, run } = createDependencies(undefined);
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', '--unreleased' ]);

    assert.strictEqual(auth.callCount, 0);
    assert.strictEqual((run.firstCall.args[0] as CliRunOptions).unreleased, true);
});

test('createProgram() validates pull request labels', async function () {
    const { dependencies, auth, createPullRequestLabelValidator, readPackageInfo, validate } = createDependencies(
        'github-token'
    );
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', 'validate-pull-request-labels', pullRequestIdText ]);

    assert.strictEqual(auth.callCount, 1);
    assert.strictEqual(readPackageInfo.callCount, 1);
    assert.deepStrictEqual(createPullRequestLabelValidator.firstCall.args, [
        {
            packageInfo: { name: 'consumer-package' }
        }
    ]);
    assert.deepStrictEqual(validate.firstCall.args, [ pullRequestId ]);
});

test('createProgram() reports invalid pull request numbers', async function () {
    const { dependencies, reportError, validate } = createDependencies(undefined);
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', 'validate-pull-request-labels', 'not-a-number' ]);

    assert.strictEqual(validate.callCount, 0);
    assert.strictEqual(
        (reportError.firstCall.args[0] as Error).message,
        'Pull request number must be a positive integer'
    );
});

test('createProgram() reports run option errors', async function () {
    const { dependencies, reportError } = createDependencies(undefined);
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', '1.2.3', '--unreleased' ]);

    assert.strictEqual(reportError.callCount, 1);
    assert.strictEqual(
        (reportError.firstCall.args[0] as Error).message,
        'A version number is not allowed when --unreleased was provided'
    );
    assert.deepStrictEqual(reportError.firstCall.args[1], { isTracingEnabled: false });
});

test('createProgram() reports runner errors with trace state', async function () {
    const { dependencies, reportError, run } = createDependencies(undefined);
    const error = new Error('run failed');
    run.rejects(error);
    const program = createProgram(dependencies);

    await program.run([ 'node', 'pr-log', '1.2.3', '--trace' ]);

    assert.deepStrictEqual(reportError.firstCall.args, [ error, { isTracingEnabled: true } ]);
});

test('createProgramError() keeps Error values', function () {
    const error = new Error('run failed');

    assert.strictEqual(createProgramError(error), error);
});

test('createProgramError() wraps unknown values', function () {
    assert.strictEqual(createProgramError('run failed').message, 'run failed');
});
