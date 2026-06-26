import assert from 'node:assert';
import { stub } from 'sinon';
import type _prependFile from 'prepend-file';
import type { Logger } from 'loglevel';
import { Factory, type DeepPartial } from 'fishery';
import { nothing } from 'true-myth/maybe';
import { createCliRunner, type CliRunner, type CliRunnerDependencies } from './cli.ts';
import type { CliRunOptions } from './cli-run-options.ts';
import { defaultValidLabels } from './valid-labels.ts';
import { createVersionNumber } from './version-number.ts';

const cliRunOptionsFactory = Factory.define<CliRunOptions>(function () {
    return {
        unreleased: false,
        autoVersion: false,
        versionNumber: createVersionNumber('1.2.3'),
        changelogPath: '/foo/CHANGELOG.md',
        sloppy: false,
        stdout: false
    };
});

function createDefaultCliDependencies(): CliRunnerDependencies {
    return {
        defaultValidLabels,
        ensureCleanLocalGitState: stub().resolves(),
        getLatestVersionTag: stub().resolves('1.2.2'),
        getMergedPullRequests: stub().resolves([]),
        renderChangelogMarkdown: stub().returns(''),
        getCurrentDate: stub().returns(new Date(0)),
        prependFile: stub().resolves() as unknown as typeof _prependFile,
        packageInfo: { repository: { url: 'https://github.com/foo/bar.git' } },
        logger: { log: stub() } as unknown as Logger
    };
}

function createCli(dependencies: Partial<CliRunnerDependencies> = {}): CliRunner {
    return createCliRunner({
        ...createDefaultCliDependencies(),
        ...dependencies
    });
}

type TestThrowsTestCase = {
    readonly cliRunOptionsOverrides: DeepPartial<CliRunOptions>;
    readonly dependenciesOverrides: Partial<CliRunnerDependencies>;
    readonly expectedErrorMessage: string;
};

const throwsTestCases: readonly { readonly testName: string; readonly testCase: TestThrowsTestCase; }[] = [
    {
        testName: 'throws if the version was released but no version number was specified',
        testCase: {
            cliRunOptionsOverrides: {
                unreleased: false,
                versionNumber: createVersionNumber('')
            },
            dependenciesOverrides: {},
            expectedErrorMessage: 'version-number not specified'
        }
    },
    {
        testName: 'throws if the version was released and an invalid version number was specified',
        testCase: {
            cliRunOptionsOverrides: {
                unreleased: false,
                versionNumber: createVersionNumber('a.b.c')
            },
            dependenciesOverrides: {},
            expectedErrorMessage: 'version-number is invalid'
        }
    },
    {
        testName: 'throws when the repository entry in the given packageInfo is missing',
        testCase: {
            cliRunOptionsOverrides: {},
            dependenciesOverrides: {
                packageInfo: {}
            },
            expectedErrorMessage: 'Repository information missing in package.json'
        }
    },
    {
        testName: 'throws when the repository entry in the given packageInfo is not an object',
        testCase: {
            cliRunOptionsOverrides: {},
            dependenciesOverrides: {
                packageInfo: { repository: 'foo' }
            },
            expectedErrorMessage: 'Repository information missing in package.json'
        }
    },
    {
        testName: 'throws when the repository.url entry in the given packageInfo is missing',
        testCase: {
            cliRunOptionsOverrides: {},
            dependenciesOverrides: {
                packageInfo: { repository: {} }
            },
            expectedErrorMessage: 'Repository url is not a string in package.json'
        }
    },
    {
        testName: 'throws when the repository.url entry in the given packageInfo is not a string',
        testCase: {
            cliRunOptionsOverrides: {},
            dependenciesOverrides: {
                packageInfo: { repository: { url: 42 } }
            },
            expectedErrorMessage: 'Repository url is not a string in package.json'
        }
    },
    {
        testName: 'throws if the repository is dirty',
        testCase: {
            cliRunOptionsOverrides: {},
            dependenciesOverrides: {
                ensureCleanLocalGitState: stub().rejects(new Error('Local copy is not clean'))
            },
            expectedErrorMessage: 'Local copy is not clean'
        }
    }
];

for (const throwsTestCase of throwsTestCases) {
    test(throwsTestCase.testName, async function () {
        const { cliRunOptionsOverrides, dependenciesOverrides, expectedErrorMessage } = throwsTestCase.testCase;
        const cli = createCli(dependenciesOverrides);
        const options = cliRunOptionsFactory.build(cliRunOptionsOverrides);

        await assert.rejects(cli.run(options), { message: expectedErrorMessage });
    });
}

test('does not throw if the repository is dirty', async function () {
    const ensureCleanLocalGitState = stub().rejects(new Error('Local copy is not clean'));
    const renderChangelogMarkdown = stub().returns('sloppy changelog');
    const prependFile = stub().resolves();
    const cli = createCli({
        prependFile: prependFile as unknown as typeof _prependFile,
        ensureCleanLocalGitState,
        renderChangelogMarkdown
    });
    const options = cliRunOptionsFactory.build({
        sloppy: true
    });

    await cli.run(options);

    assert.strictEqual(prependFile.callCount, 1);
    assert.deepStrictEqual(prependFile.firstCall.args, [ '/foo/CHANGELOG.md', 'sloppy changelog\n\n' ]);
});

test('uses custom labels if they are provided in package.json', async function () {
    const packageInfo = {
        repository: { url: 'https://github.com/foo/bar.git' },
        'pr-log': {
            validLabels: [
                [ 'foo', 'Foo' ],
                [ 'bar', 'Bar' ]
            ]
        }
    };
    const expectedLabels = new Map([
        [ 'foo', 'Foo' ],
        [ 'bar', 'Bar' ]
    ]);
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const getMergedPullRequests = stub().resolves();
    const cli = createCli({ packageInfo, renderChangelogMarkdown, getMergedPullRequests });

    await cli.run(cliRunOptionsFactory.build());

    assert.strictEqual(getMergedPullRequests.callCount, 1);
    assert.deepStrictEqual(getMergedPullRequests.firstCall.args, [ 'foo/bar', expectedLabels, [] ]);

    assert.strictEqual(renderChangelogMarkdown.callCount, 1);
    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo,
        currentDate: new Date(0),
        validLabels: expectedLabels,
        mergedPullRequests: undefined,
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: '1.2.3'
    });
});

test('passes configured ignored labels to merged pull request collection', async function () {
    const packageInfo = {
        repository: { url: 'https://github.com/foo/bar.git' },
        'pr-log': {
            ignoredLabels: [ 'release' ]
        }
    };
    const getMergedPullRequests = stub().resolves([]);
    const cli = createCli({ packageInfo, getMergedPullRequests });

    await cli.run(cliRunOptionsFactory.build());

    assert.deepStrictEqual(getMergedPullRequests.firstCall.args, [ 'foo/bar', defaultValidLabels, [ 'release' ] ]);
});

test('calls ensureCleanLocalGitState with correct parameters', async function () {
    const ensureCleanLocalGitState = stub().resolves();

    const cli = createCli({ ensureCleanLocalGitState });
    const options = cliRunOptionsFactory.build();

    const expectedGithubRepo = 'foo/bar';

    await cli.run(options);

    assert.strictEqual(ensureCleanLocalGitState.callCount, 1);
    assert.deepStrictEqual(ensureCleanLocalGitState.firstCall.args, [ expectedGithubRepo ]);
});

test('calls getMergedPullRequests with the correct repo', async function () {
    const getMergedPullRequests = stub().resolves();

    const cli = createCli({ getMergedPullRequests });
    const options = cliRunOptionsFactory.build();

    const expectedGithubRepo = 'foo/bar';

    await cli.run(options);

    assert.strictEqual(getMergedPullRequests.callCount, 1);
    assert.strictEqual(getMergedPullRequests.firstCall.args[0], expectedGithubRepo);
});

test('reports the generated changelog to stdout and not to a file when stdout is set to true', async function () {
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const prependFile = stub().resolves();
    const log = stub();

    const cli = createCli({
        renderChangelogMarkdown,
        prependFile: prependFile as unknown as typeof _prependFile,
        logger: { log } as unknown as Logger
    });

    await cli.run(
        cliRunOptionsFactory.build({
            stdout: true
        })
    );

    assert.strictEqual(renderChangelogMarkdown.callCount, 1);
    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo: { repository: { url: 'https://github.com/foo/bar.git' } },
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: '1.2.3'
    });

    assert.strictEqual(prependFile.callCount, 0);

    assert.strictEqual(log.callCount, 1);
    assert.deepStrictEqual(log.firstCall.args, [ 'generated changelog' ]);
});

test('reports the generated changelog to a file when stdout is set to false', async function () {
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const prependFile = stub().resolves();

    const cli = createCli({
        renderChangelogMarkdown,
        prependFile: prependFile as unknown as typeof _prependFile
    });
    const options = cliRunOptionsFactory.build({
        stdout: false
    });

    await cli.run(options);

    assert.strictEqual(renderChangelogMarkdown.callCount, 1);
    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo: { repository: { url: 'https://github.com/foo/bar.git' } },
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: '1.2.3'
    });

    assert.strictEqual(prependFile.callCount, 1);
    assert.deepStrictEqual(prependFile.firstCall.args, [ '/foo/CHANGELOG.md', 'generated changelog\n\n' ]);
});

test('reports the generated unreleased changelog to a file when stdout is set to false', async function () {
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const prependFile = stub().resolves();

    const cli = createCli({
        renderChangelogMarkdown,
        prependFile: prependFile as unknown as typeof _prependFile
    });
    const options: CliRunOptions = {
        unreleased: true,
        autoVersion: false,
        versionNumber: nothing(),
        changelogPath: '/foo/CHANGELOG.md',
        sloppy: false,
        stdout: false
    };

    await cli.run(options);

    assert.strictEqual(renderChangelogMarkdown.callCount, 1);
    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo: { repository: { url: 'https://github.com/foo/bar.git' } },
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [],
        githubRepo: 'foo/bar',
        unreleased: true,
        versionNumber: undefined
    });

    assert.strictEqual(prependFile.callCount, 1);
    assert.deepStrictEqual(prependFile.firstCall.args, [ '/foo/CHANGELOG.md', 'generated changelog\n\n' ]);
});

test('derives the version number automatically from merged pull request labels', async function () {
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const prependFile = stub().resolves();
    const getLatestVersionTag = stub().resolves('1.2.3');
    const getMergedPullRequests = stub().resolves([ { id: 1, title: 'Add thing', label: 'feature' } ]);
    const cli = createCli({
        renderChangelogMarkdown,
        prependFile: prependFile as unknown as typeof _prependFile,
        getLatestVersionTag,
        getMergedPullRequests
    });
    const options: CliRunOptions = {
        unreleased: false,
        autoVersion: true,
        versionNumber: nothing(),
        changelogPath: '/foo/CHANGELOG.md',
        sloppy: false,
        stdout: false
    };

    await cli.run(options);

    assert.strictEqual(getLatestVersionTag.callCount, 1);
    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo: { repository: { url: 'https://github.com/foo/bar.git' } },
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [ { id: 1, title: 'Add thing', label: 'feature' } ],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: '1.3.0'
    });
});

test('uses configured version bump labels for auto-versioning', async function () {
    const renderChangelogMarkdown = stub().returns('generated changelog');
    const prependFile = stub().resolves();
    const getLatestVersionTag = stub().resolves('1.2.3');
    const getMergedPullRequests = stub().resolves([ { id: 1, title: 'Docs', label: 'documentation' } ]);
    const packageInfo = {
        repository: { url: 'https://github.com/foo/bar.git' },
        'pr-log': {
            versionBumps: {
                patch: [ 'documentation' ]
            }
        }
    };
    const cli = createCli({
        renderChangelogMarkdown,
        prependFile: prependFile as unknown as typeof _prependFile,
        getLatestVersionTag,
        getMergedPullRequests,
        packageInfo
    });
    const options: CliRunOptions = {
        unreleased: false,
        autoVersion: true,
        versionNumber: nothing(),
        changelogPath: '/foo/CHANGELOG.md',
        sloppy: false,
        stdout: false
    };

    await cli.run(options);

    assert.deepStrictEqual(renderChangelogMarkdown.firstCall.args[0], {
        packageInfo,
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [ { id: 1, title: 'Docs', label: 'documentation' } ],
        githubRepo: 'foo/bar',
        unreleased: false,
        versionNumber: '1.2.4'
    });
});

test('strips trailing empty lines from the generated changelog', async function () {
    const renderChangelogMarkdown = stub().returns(
        'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n\n\n\n'
    );
    const prependFile = stub().resolves();

    const cli = createCli({ renderChangelogMarkdown, prependFile: prependFile as unknown as typeof _prependFile });
    const options = cliRunOptionsFactory.build();

    await cli.run(options);

    assert.deepStrictEqual(prependFile.firstCall.args, [
        '/foo/CHANGELOG.md',
        'generated\nchangelog\nwith\n\na\nlot\n\nof\nempty\nlines\n\n'
    ]);
});
