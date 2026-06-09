#!/usr/bin/env node

import path from 'node:path';
import fs from 'node:fs/promises';
import { setTimeout as waitForTimeout } from 'node:timers/promises';
import { createCommand } from 'commander';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { execaCommand } from 'execa';
import loglevel from 'loglevel';
import { isString } from '@sindresorhus/is';
import { createCliRunOptions } from '../lib/cli-run-options.ts';
import { createCliRunner, type CliRunnerDependencies } from '../lib/cli.ts';
import { ensureCleanLocalGitStateFactory } from '../lib/ensure-clean-local-git-state.ts';
import { getMergedPullRequestsFactory } from '../lib/get-merged-pull-requests.ts';
import { createChangelogFactory } from '../lib/create-changelog.ts';
import { findRemoteAliasFactory } from '../lib/find-remote-alias.ts';
import { getPullRequestLabels } from '../lib/get-pull-request-label.ts';
import { createGitCommandRunner } from '../lib/git-command-runner.ts';
import { determineLatestVersionTag } from '../lib/latest-version-tag.ts';

loglevel.enableAll();

async function readJson(filePath: string): Promise<Record<string, unknown>> {
    const fileContent = await fs.readFile(filePath, { encoding: 'utf8' });
    return JSON.parse(fileContent) as Record<string, unknown>;
}

const prLogPackageJsonURL = new URL('../../../../package.json', import.meta.url);
const config = (await readJson(prLogPackageJsonURL.pathname)) as Record<string, string>;

const { GH_TOKEN } = process.env;
const githubClient = new Octokit({ auth: GH_TOKEN });
const labelLookupIntervalMilliseconds = 250;
const maximumRateLimitRetryCount = 3;

function getCurrentDate(): Readonly<Date> {
    return new Date();
}

let isTracingEnabled = false;

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const gitCommandRunner = createGitCommandRunner({ execute: execaCommand });
const findRemoteAlias = findRemoteAliasFactory({ gitCommandRunner });
const getMergedPullRequests = getMergedPullRequestsFactory({
    githubClient,
    gitCommandRunner,
    getPullRequestLabels,
    waitForMilliseconds: async (durationMilliseconds) => {
        await waitForTimeout(durationMilliseconds);
    },
    labelLookupIntervalMilliseconds,
    getCurrentDate,
    maximumRateLimitRetryCount
});
const getLatestVersionTag = async (): Promise<string> => {
    return determineLatestVersionTag(await gitCommandRunner.listTags());
};

const program = createCommand(config.name ?? '');
program
    .storeOptionsAsProperties(false)
    .description(config.description ?? '')
    .version(config.version ?? '')
    .argument('[version-number]', 'Desired version number. Must not be provided when --unreleased was specified')
    .option('--sloppy', 'skip ensuring clean local git state', false)
    .option('--trace', 'show stack traces for any error', false)
    .option('--default-branch <name>', 'set custom default branch', 'main')
    .option('--stdout', 'output the changelog to stdout instead of writing to CHANGELOG.md', false)
    .option('--auto-version', 'derive the release version from merged pull request labels', false)
    .option('--unreleased', 'include section for unreleased changes', false)
    .action(async (versionNumber: string | undefined, options: Record<string, unknown>) => {
        isTracingEnabled = options.trace === true;

        const runOptionsResult = createCliRunOptions({ versionNumber, changelogPath, commandOptions: options });

        await runOptionsResult.match({
            async Ok(runOptions) {
                const defaultBranch = options.defaultBranch as string;
                if (isString(GH_TOKEN)) {
                    await githubClient.auth();
                }
                const packageInfo = await readJson(path.join(process.cwd(), 'package.json'));
                const dependencies: CliRunnerDependencies = {
                    prependFile,
                    packageInfo,
                    logger: loglevel,
                    ensureCleanLocalGitState: ensureCleanLocalGitStateFactory(
                        { gitCommandRunner, findRemoteAlias },
                        { defaultBranch }
                    ),
                    getLatestVersionTag,
                    getMergedPullRequests,
                    createChangelog: createChangelogFactory({ getCurrentDate, packageInfo })
                };
                const cliRunner = createCliRunner(dependencies);
                await cliRunner.run(runOptions);
            },
            Err(error) {
                throw error;
            }
        });
    });

function crash(error: Readonly<Error>): void {
    let message: string | undefined = `Error: ${error.message}`;

    if (isTracingEnabled) {
        message = error.stack;
    }

    console.error(message);
    process.exitCode = 1;
}

program.parseAsync(process.argv).catch(crash);
