import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import type { CliRunOptions } from './cli-run-options.ts';
import type { GetMergedPullRequests } from './get-merged-pull-requests.ts';
import type { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.ts';
import { getGithubRepoFromPackageInfo, getValidLabels } from './package-info.ts';
import { type GetLatestVersionTag, resolveReleasedVersionNumber } from './resolve-version-number.ts';
import { validateVersionNumber } from './version-number.ts';
import type { renderChangelogMarkdown } from './render-changelog-markdown.ts';

function stripTrailingEmptyLine(text: string): string {
    if (text.endsWith('\n\n')) {
        return text.slice(0, -1);
    }

    return text;
}

export type CliRunnerDependencies = {
    readonly defaultValidLabels: ReadonlyMap<string, string>;
    readonly ensureCleanLocalGitState: EnsureCleanLocalGitState;
    readonly getLatestVersionTag: GetLatestVersionTag;
    readonly getMergedPullRequests: GetMergedPullRequests;
    readonly renderChangelogMarkdown: typeof renderChangelogMarkdown;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly packageInfo: Record<string, unknown>;
    readonly prependFile: typeof _prependFile;
    readonly logger: Logger;
};

export type CliRunner = {
    run(options: CliRunOptions): Promise<void>;
};

type ReleasedCliRunOptions = Extract<CliRunOptions, { unreleased: false }>;
type GenerateChangelogContext = Pick<
    CliRunnerDependencies,
    | 'ensureCleanLocalGitState'
    | 'getCurrentDate'
    | 'getLatestVersionTag'
    | 'getMergedPullRequests'
    | 'packageInfo'
    | 'renderChangelogMarkdown'
>;

type ChangelogData = {
    readonly githubRepo: string;
    readonly validLabels: ReadonlyMap<string, string>;
    readonly mergedPullRequests: Awaited<ReturnType<GetMergedPullRequests>>;
};

type WriteChangelogContext = Pick<CliRunnerDependencies, 'logger' | 'prependFile'>;

async function ensureCleanState(
    ensureCleanLocalGitState: EnsureCleanLocalGitState,
    options: CliRunOptions,
    githubRepo: string
): Promise<void> {
    if (!options.sloppy) {
        await ensureCleanLocalGitState(githubRepo);
    }
}

function generateUnreleasedChangelog(
    context: Pick<CliRunnerDependencies, 'getCurrentDate' | 'packageInfo' | 'renderChangelogMarkdown'>,
    changelogData: ChangelogData
): string {
    const { getCurrentDate, packageInfo, renderChangelogMarkdown } = context;
    const { githubRepo, validLabels, mergedPullRequests } = changelogData;

    return stripTrailingEmptyLine(
        renderChangelogMarkdown({
            packageInfo,
            currentDate: getCurrentDate(),
            validLabels,
            githubRepo,
            mergedPullRequests,
            unreleased: true,
            versionNumber: undefined
        })
    );
}

async function generateReleasedChangelog(
    context: Pick<
        CliRunnerDependencies,
        'getCurrentDate' | 'getLatestVersionTag' | 'packageInfo' | 'renderChangelogMarkdown'
    >,
    options: ReleasedCliRunOptions,
    changelogData: ChangelogData
): Promise<string> {
    const { getCurrentDate, packageInfo, getLatestVersionTag, renderChangelogMarkdown } = context;
    const { githubRepo, validLabels, mergedPullRequests } = changelogData;
    const versionNumber = options.autoVersion
        ? await resolveReleasedVersionNumber(packageInfo, validLabels, getLatestVersionTag, mergedPullRequests)
        : options.versionNumber;

    return stripTrailingEmptyLine(
        renderChangelogMarkdown({
            packageInfo,
            currentDate: getCurrentDate(),
            validLabels,
            githubRepo,
            mergedPullRequests,
            unreleased: false,
            versionNumber: versionNumber.value
        })
    );
}

async function generateChangelog(
    dependencies: GenerateChangelogContext,
    options: CliRunOptions,
    githubRepo: string,
    validLabels: ReadonlyMap<string, string>
): Promise<string> {
    const {
        ensureCleanLocalGitState,
        getCurrentDate,
        getLatestVersionTag,
        getMergedPullRequests,
        packageInfo,
        renderChangelogMarkdown
    } = dependencies;

    await ensureCleanState(ensureCleanLocalGitState, options, githubRepo);

    const changelogData: ChangelogData = {
        githubRepo,
        validLabels,
        mergedPullRequests: await getMergedPullRequests(githubRepo, validLabels)
    };

    if (options.unreleased) {
        return generateUnreleasedChangelog({ getCurrentDate, packageInfo, renderChangelogMarkdown }, changelogData);
    }

    return generateReleasedChangelog(
        { getCurrentDate, packageInfo, getLatestVersionTag, renderChangelogMarkdown },
        options,
        changelogData
    );
}

async function writeChangelog(
    context: WriteChangelogContext,
    changelog: string,
    options: CliRunOptions
): Promise<void> {
    const { prependFile, logger } = context;
    const trimmedChangelog = changelog.trim();

    if (options.stdout) {
        logger.log(trimmedChangelog);
    } else {
        await prependFile(options.changelogPath, `${trimmedChangelog}\n\n`);
    }
}

export function createCliRunner(dependencies: CliRunnerDependencies): CliRunner {
    const { defaultValidLabels, packageInfo } = dependencies;

    return {
        async run(options: CliRunOptions) {
            const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
            const validLabels = getValidLabels(packageInfo, defaultValidLabels);

            validateVersionNumber(options).unwrapOrElse((error) => {
                throw error;
            });

            const changelog = await generateChangelog(dependencies, options, githubRepo, validLabels);

            await writeChangelog(dependencies, changelog, options);
        }
    };
}
