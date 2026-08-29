import type { Logger } from 'loglevel';
import type { CliRunOptions } from './cli-run-options.ts';
import type { GetMergedPullRequests } from './get-merged-pull-requests.ts';
import type { EnsureCleanLocalGitState } from './ensure-clean-local-git-state.ts';
import type { PrependTextFile } from './prepend-text-file.ts';
import { getGithubRepoFromPackageInfo } from './package-info.ts';
import {
    createPrLogConfigFromPackageInfo,
    type PrLogConfig
} from './pr-log-config.ts';
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
    readonly defaultPrLogConfig: PrLogConfig;
    readonly ensureCleanLocalGitState: EnsureCleanLocalGitState;
    readonly getLatestVersionTag: GetLatestVersionTag;
    readonly getMergedPullRequests: GetMergedPullRequests;
    readonly renderChangelogMarkdown: typeof renderChangelogMarkdown;
    readonly getCurrentDate: () => Readonly<Date>;
    readonly packageInfo: Readonly<Record<string, unknown>>;
    readonly prependTextFile: PrependTextFile;
    readonly logger: Logger;
};

export type CliRunner = {
    run: (options: CliRunOptions) => Promise<void>;
};

type ReleasedCliRunOptions = Extract<CliRunOptions, { readonly unreleased: false; }>;
type GenerateChangelogContext = Pick<
    CliRunnerDependencies,
    | 'ensureCleanLocalGitState'
    | 'getCurrentDate'
    | 'getLatestVersionTag'
    | 'getMergedPullRequests'
    | 'renderChangelogMarkdown'
>;

type ChangelogData = {
    readonly githubRepo: string;
    readonly config: PrLogConfig;
    readonly mergedPullRequests: Awaited<ReturnType<GetMergedPullRequests>>;
};

type WriteChangelogContext = Pick<CliRunnerDependencies, 'logger' | 'prependTextFile'>;

type ChangelogRequest = {
    readonly githubRepo: string;
    readonly config: PrLogConfig;
};

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
    context: Pick<CliRunnerDependencies, 'getCurrentDate' | 'renderChangelogMarkdown'>,
    changelogData: ChangelogData
): string {
    const { getCurrentDate, renderChangelogMarkdown } = context;
    const { githubRepo, config, mergedPullRequests } = changelogData;

    return stripTrailingEmptyLine(
        renderChangelogMarkdown({
            config,
            currentDate: getCurrentDate(),
            githubRepo,
            mergedPullRequests,
            unreleased: true,
            versionNumber: undefined
        })
    );
}

async function generateReleasedChangelog(
    context: Pick<CliRunnerDependencies, 'getCurrentDate' | 'getLatestVersionTag' | 'renderChangelogMarkdown'>,
    options: ReleasedCliRunOptions,
    changelogData: ChangelogData
): Promise<string> {
    const { getCurrentDate, getLatestVersionTag, renderChangelogMarkdown } = context;
    const { githubRepo, config, mergedPullRequests } = changelogData;
    const versionNumber = options.autoVersion
        ? await resolveReleasedVersionNumber(config, getLatestVersionTag, mergedPullRequests)
        : options.versionNumber;

    return stripTrailingEmptyLine(
        renderChangelogMarkdown({
            config,
            currentDate: getCurrentDate(),
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
    request: ChangelogRequest
): Promise<string> {
    const {
        ensureCleanLocalGitState,
        getCurrentDate,
        getLatestVersionTag,
        getMergedPullRequests,
        renderChangelogMarkdown
    } = dependencies;

    await ensureCleanState(ensureCleanLocalGitState, options, request.githubRepo);

    const changelogData: ChangelogData = {
        githubRepo: request.githubRepo,
        config: request.config,
        mergedPullRequests: await getMergedPullRequests(request.githubRepo, request.config)
    };

    if (options.unreleased) {
        return generateUnreleasedChangelog({ getCurrentDate, renderChangelogMarkdown }, changelogData);
    }

    return generateReleasedChangelog(
        { getCurrentDate, getLatestVersionTag, renderChangelogMarkdown },
        options,
        changelogData
    );
}

async function writeChangelog(
    context: WriteChangelogContext,
    changelog: string,
    options: CliRunOptions
): Promise<void> {
    const { prependTextFile, logger } = context;
    const trimmedChangelog = changelog.trim();

    if (options.stdout) {
        logger.log(trimmedChangelog);
    } else {
        await prependTextFile(options.changelogPath, `${trimmedChangelog}\n\n`);
    }
}

export function createCliRunner(dependencies: CliRunnerDependencies): CliRunner {
    const { defaultPrLogConfig, packageInfo } = dependencies;

    return {
        async run(options: CliRunOptions) {
            const githubRepo = getGithubRepoFromPackageInfo(packageInfo);
            const config = createPrLogConfigFromPackageInfo(packageInfo, defaultPrLogConfig);

            validateVersionNumber(options).unwrapOrElse(function (error) {
                throw error;
            });

            const changelog = await generateChangelog(dependencies, options, {
                githubRepo,
                config
            });

            await writeChangelog(dependencies, changelog, options);
        }
    };
}
