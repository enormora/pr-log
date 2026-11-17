import assert from 'node:assert';
import { createCommand } from 'commander';
import { isString } from '@sindresorhus/is';
import { createCliRunOptions } from '../../lib/cli-run-options.ts';
import type { CliRunner } from '../../lib/cli.ts';
import type { PullRequestLabelValidator } from '../../lib/validate-pull-request-labels.ts';
import type { ErrorReporter } from './error-reporter.ts';
import type { PackageMetadata } from './package-metadata.ts';

type ProgramRunnerOptions = {
    readonly defaultBranch: string;
    readonly packageInfo: Readonly<Record<string, unknown>>;
};

type PullRequestLabelValidatorOptions = {
    readonly packageInfo: Readonly<Record<string, unknown>>;
};

type GitHubAuthenticator = {
    auth: () => Promise<unknown>;
};

export type ProgramDependencies = {
    readonly packageMetadata: PackageMetadata;
    readonly githubToken: string | undefined;
    readonly githubClient: GitHubAuthenticator;
    readonly changelogPath: string;
    readonly readPackageInfo: () => Promise<Readonly<Record<string, unknown>>>;
    readonly createCliRunner: (options: ProgramRunnerOptions) => CliRunner;
    readonly createPullRequestLabelValidator: (options: PullRequestLabelValidatorOptions) => PullRequestLabelValidator;
    readonly reportError: ErrorReporter;
};

export type Program = {
    run: (commandLineArguments: readonly string[]) => Promise<void>;
};

export function createProgramError(value: unknown): Readonly<Error> {
    if (value instanceof Error) {
        return value;
    }

    return new Error(String(value));
}

async function authenticateIfTokenExists(
    dependencies: Pick<ProgramDependencies, 'githubClient' | 'githubToken'>
): Promise<void> {
    if (isString(dependencies.githubToken)) {
        await dependencies.githubClient.auth();
    }
}

function parsePullRequestId(value: string): number {
    const pullRequestId = Number(value);

    if (!Number.isSafeInteger(pullRequestId) || pullRequestId < 1) {
        throw new Error('Pull request number must be a positive integer');
    }

    return pullRequestId;
}

function readDefaultBranch(commandOptions: Readonly<Record<string, unknown>>): string {
    const { defaultBranch } = commandOptions;

    assert.ok(isString(defaultBranch));

    return defaultBranch;
}

async function runChangelogCommand(
    dependencies: ProgramDependencies,
    versionNumber: string | undefined,
    commandOptions: Readonly<Record<string, unknown>>
): Promise<void> {
    const runOptionsResult = createCliRunOptions({
        versionNumber,
        changelogPath: dependencies.changelogPath,
        commandOptions
    });

    await runOptionsResult.match({
        async Ok(runOptions) {
            await authenticateIfTokenExists(dependencies);

            const cliRunner = dependencies.createCliRunner({
                defaultBranch: readDefaultBranch(commandOptions),
                packageInfo: await dependencies.readPackageInfo()
            });

            await cliRunner.run(runOptions);
        },
        Err(error) {
            throw error;
        }
    });
}

async function runPullRequestLabelValidationCommand(
    dependencies: ProgramDependencies,
    pullRequestId: number
): Promise<void> {
    await authenticateIfTokenExists(dependencies);

    const pullRequestLabelValidator = dependencies.createPullRequestLabelValidator({
        packageInfo: await dependencies.readPackageInfo()
    });

    await pullRequestLabelValidator.validate(pullRequestId);
}

export function createProgram(dependencies: ProgramDependencies): Program {
    const { packageMetadata } = dependencies;
    let isTracingEnabled = false;
    const program = createCommand(packageMetadata.name);

    program
        .storeOptionsAsProperties(false)
        .description(packageMetadata.description)
        .version(packageMetadata.version)
        .argument('[version-number]', 'Desired version number. Must not be provided when --unreleased was specified')
        .option('--sloppy', 'skip ensuring clean local git state', false)
        .option('--trace', 'show stack traces for any error', false)
        .option('--default-branch <name>', 'set custom default branch', 'main')
        .option('--stdout', 'output the changelog to stdout instead of writing to CHANGELOG.md', false)
        .option('--auto-version', 'derive the release version from merged pull request labels', false)
        .option('--unreleased', 'include section for unreleased changes', false)
        .action(async function (versionNumber: string | undefined, commandOptions: Readonly<Record<string, unknown>>) {
            isTracingEnabled = commandOptions.trace === true;
            await runChangelogCommand(dependencies, versionNumber, commandOptions);
        });

    program
        .command('validate-pull-request-labels')
        .description('validate labels assigned to a GitHub pull request')
        .argument('<pull-request-number>', 'GitHub pull request number', parsePullRequestId)
        .action(async function (pullRequestId: number) {
            isTracingEnabled = program.opts().trace === true;
            await runPullRequestLabelValidationCommand(dependencies, pullRequestId);
        });

    return {
        async run(commandLineArguments) {
            try {
                await program.parseAsync(Array.from(commandLineArguments));
            } catch (error: unknown) {
                dependencies.reportError(createProgramError(error), { isTracingEnabled });
            }
        }
    };
}
