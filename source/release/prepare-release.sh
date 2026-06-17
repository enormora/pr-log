#!/usr/bin/env bash
set -euo pipefail

node --input-type=module <<'NODE'
import fs from 'node:fs/promises';
import path from 'node:path';
import { execaCommand } from 'execa';
import { createPrLogEngine, defaultValidLabels } from './source/packages/core/core.entry-point.ts';
import { getGithubRepoFromPackageInfo, getIgnoredLabels, getValidLabels } from './source/lib/package-info.ts';
import { createJsonFileReader } from './source/lib/read-json-file.ts';
import { splitByString } from './source/lib/split.ts';
import { prepareRelease } from './source/release/prepare-release.ts';

const releaseFolder = path.join(process.cwd(), 'target/release');
const prLogVersionPath = path.join(releaseFolder, 'pr-log-version.txt');
const coreReleaseMetadataPath = path.join(releaseFolder, 'core-release.json');
const labelLookupIntervalMilliseconds = 250;
const maximumRateLimitRetryCount = 3;

function splitLines(value) {
    return splitByString(value, '\n').filter((line) => {
        return line !== '';
    });
}

const readJsonFile = createJsonFileReader({
    async readTextFile(filePath) {
        return fs.readFile(filePath, { encoding: 'utf8' });
    }
});

async function listTags() {
    const { stdout } = await execaCommand('git tag --list');
    return splitLines(stdout);
}

async function listTrackedFiles() {
    const { stdout } = await execaCommand('git ls-files');
    return splitLines(stdout);
}

async function prependChangelog(changelogPath, changelog) {
    let existingChangelog = '';

    try {
        existingChangelog = await fs.readFile(changelogPath, { encoding: 'utf8' });
    } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
            throw error;
        }
    }

    await fs.writeFile(changelogPath, `${changelog.trim()}\n\n${existingChangelog}`, { encoding: 'utf8' });
}

async function writeCoreReleaseMetadata(metadata) {
    await fs.mkdir(releaseFolder, { recursive: true });
    await fs.writeFile(coreReleaseMetadataPath, `${JSON.stringify(metadata, null, 4)}\n`, { encoding: 'utf8' });
}

async function writePrLogVersion(version) {
    await fs.mkdir(releaseFolder, { recursive: true });
    await fs.writeFile(prLogVersionPath, `${version}\n`, { encoding: 'utf8' });
}

const projectFolder = process.cwd();
const packageInfo = await readJsonFile(path.join(projectFolder, 'package.json'));
const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
const validLabels = getValidLabels(packageInfo, defaultValidLabels);
const ignoredLabels = getIgnoredLabels(packageInfo);
const prLogEngine = createPrLogEngine({
    githubToken: process.env.GH_TOKEN,
    workingDirectory: projectFolder,
    labelLookupIntervalMilliseconds,
    maximumRateLimitRetryCount
});

await prepareRelease({
    packageInfo,
    githubRepo,
    validLabels,
    ignoredLabels,
    currentDate: new Date(),
    tags: await listTags(),
    trackedFiles: await listTrackedFiles(),
    collectMergedPullRequests(input) {
        return prLogEngine.collectMergedPullRequests(input);
    },
    resolvePullRequestLabels(input) {
        return prLogEngine.resolvePullRequestLabels(input);
    },
    readPullRequestChangedFiles(input) {
        return prLogEngine.readPullRequestChangedFiles(input);
    },
    renderChangelog(input) {
        return prLogEngine.renderChangelog(input);
    },
    prependChangelog,
    writePrLogVersion,
    writeCoreReleaseMetadata
});
NODE
