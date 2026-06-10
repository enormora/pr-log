import { createCommand } from 'commander';
import { isString } from '@sindresorhus/is';
import { createCliRunOptions } from '../../lib/cli-run-options.ts';
import type { CliRunner } from '../../lib/cli.ts';
import type { CommandLineInterfaceErrorReporter } from './command-line-interface-error-reporter.ts';
import type { CommandLineInterfacePackageMetadata } from './command-line-interface-package-metadata.ts';

type CommandLineInterfaceProgramRunnerOptions = {
    readonly defaultBranch: string;
    readonly packageInfo: Record<string, unknown>;
};

type GitHubAuthenticator = {
    auth(): Promise<unknown>;
};

export type CommandLineInterfaceProgramDependencies = {
    readonly packageMetadata: CommandLineInterfacePackageMetadata;
    readonly githubToken: string | undefined;
    readonly githubClient: GitHubAuthenticator;
    readonly changelogPath: string;
    readonly readPackageInfo: () => Promise<Record<string, unknown>>;
    readonly createCliRunner: (options: CommandLineInterfaceProgramRunnerOptions) => CliRunner;
    readonly reportError: CommandLineInterfaceErrorReporter;
};

export type CommandLineInterfaceProgram = {
    run(commandLineArguments: readonly string[]): Promise<void>;
};

export function createCommandLineInterfaceError(value: unknown): Readonly<Error> {
    if (value instanceof Error) {
        return value;
    }

    return new Error(String(value));
}

export function createCommandLineInterfaceProgram(
    dependencies: CommandLineInterfaceProgramDependencies
): CommandLineInterfaceProgram {
    const { packageMetadata, githubToken, githubClient, changelogPath, readPackageInfo, createCliRunner, reportError } =
        dependencies;
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
        .action(async (versionNumber: string | undefined, commandOptions: Record<string, unknown>) => {
            isTracingEnabled = commandOptions.trace === true;

            const runOptionsResult = createCliRunOptions({ versionNumber, changelogPath, commandOptions });

            await runOptionsResult.match({
                async Ok(runOptions) {
                    if (isString(githubToken)) {
                        await githubClient.auth();
                    }

                    const cliRunner = createCliRunner({
                        defaultBranch: commandOptions.defaultBranch as string,
                        packageInfo: await readPackageInfo()
                    });

                    await cliRunner.run(runOptions);
                },
                Err(error) {
                    throw error;
                }
            });
        });

    return {
        async run(commandLineArguments) {
            await program.parseAsync(Array.from(commandLineArguments)).catch((error: unknown) => {
                reportError(createCommandLineInterfaceError(error), { isTracingEnabled });
            });
        }
    };
}
