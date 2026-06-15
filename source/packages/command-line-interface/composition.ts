import fs from 'node:fs/promises';
import path from 'node:path';
import { Octokit } from '@octokit/rest';
import prependFile from 'prepend-file';
import { execaCommand } from 'execa';
import loglevel from 'loglevel';
import { createCliRunner, type CliRunnerDependencies } from '../../lib/cli.ts';
import { ensureCleanLocalGitStateFactory } from '../../lib/ensure-clean-local-git-state.ts';
import { findRemoteAliasFactory } from '../../lib/find-remote-alias.ts';
import { createGitCommandRunner } from '../../lib/git-command-runner.ts';
import { createLocalGitState } from '../../lib/local-git-state.ts';
import {
    createChangelogMarkdownRenderer,
    createLatestVersionTagReader,
    createMergedPullRequestReader
} from '../../lib/pr-log-engine-cli-adapter.ts';
import { createJsonFileReader } from '../../lib/read-json-file.ts';
import { createRemoteAliasReader } from '../../lib/remote-alias-reader.ts';
import { createPrLogEngine, defaultValidLabels } from '../core/core.entry-point.ts';
import { readPackageMetadata } from './package-metadata.ts';
import { createErrorReporter } from './error-reporter.ts';
import { createProgram } from './program.ts';

loglevel.enableAll();

const readJsonFile = createJsonFileReader({
    async readTextFile(filePath) {
        return fs.readFile(filePath, { encoding: 'utf8' });
    }
});

const packageMetadata = await readPackageMetadata({
    packageJsonUrls: [
        new URL('../../package.json', import.meta.url),
        new URL('../../../package.json', import.meta.url),
        new URL('../../../../../package.json', import.meta.url)
    ],
    readJsonFile
});

const { GH_TOKEN } = process.env;
const githubClient = new Octokit({ auth: GH_TOKEN });
const labelLookupIntervalMilliseconds = 250;
const maximumRateLimitRetryCount = 3;

const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
const gitCommandRunner = createGitCommandRunner({ execute: execaCommand });
const localGitState = createLocalGitState({ gitCommandRunner });
const remoteAliasReader = createRemoteAliasReader({ gitCommandRunner });
const findRemoteAlias = findRemoteAliasFactory({ remoteAliasReader });
const prLogEngine = createPrLogEngine({
    githubToken: GH_TOKEN,
    workingDirectory: process.cwd(),
    labelLookupIntervalMilliseconds,
    maximumRateLimitRetryCount
});
const getLatestVersionTag = createLatestVersionTagReader(prLogEngine);
const getMergedPullRequests = createMergedPullRequestReader(prLogEngine, {
    targetName: undefined,
    targetScopedLabelPattern: undefined
});
const renderChangelogMarkdown = createChangelogMarkdownRenderer(prLogEngine);
const reportError = createErrorReporter({
    writeError(message) {
        console.error(message);
    },
    setExitCode(exitCode) {
        process.exitCode = exitCode;
    }
});

const commandLineInterfaceProgram = createProgram({
    packageMetadata,
    githubToken: GH_TOKEN,
    githubClient,
    changelogPath,
    async readPackageInfo() {
        return readJsonFile(path.join(process.cwd(), 'package.json'));
    },
    createCliRunner({ defaultBranch, packageInfo }) {
        const dependencies: CliRunnerDependencies = {
            defaultValidLabels,
            prependFile,
            packageInfo,
            logger: loglevel,
            ensureCleanLocalGitState: ensureCleanLocalGitStateFactory(
                { localGitState, findRemoteAlias },
                { defaultBranch }
            ),
            getLatestVersionTag,
            getMergedPullRequests,
            getCurrentDate() {
                return new Date();
            },
            renderChangelogMarkdown
        };

        return createCliRunner(dependencies);
    },
    reportError
});

export async function runCommandLineInterface(): Promise<void> {
    await commandLineInterfaceProgram.run(process.argv);
}
