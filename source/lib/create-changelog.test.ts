import assert from 'node:assert';
import { Factory } from 'fishery';
import { nothing } from 'true-myth/maybe';
import { createChangelogFactory, type ChangelogOptions, type CreateChangelog } from './create-changelog.ts';
import { createPrLogConfigFromPackageInfo, defaultPrLogConfig, type PrLogConfig } from './pr-log-config.ts';
import { createVersionNumber } from './version-number.ts';

const changelogOptionsFactory = Factory.define<ChangelogOptions>(function () {
    return {
        unreleased: false,
        versionNumber: createVersionNumber('1.0.0'),
        mergedPullRequests: [],
        githubRepo: ''
    };
});

function createChangelogWithConfig(config: PrLogConfig): CreateChangelog {
    return createChangelogFactory({
        getCurrentDate() {
            return new Date(0);
        },
        config
    });
}

function createChangelogWithPackageInfo(packageInfo: Record<string, unknown> = {}): CreateChangelog {
    return createChangelogWithConfig(createPrLogConfigFromPackageInfo(packageInfo));
}

function createUpgradeCollapseRulePackageInfo(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^Update (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: 'Update $<dependency> from $<from> to $<to>',
                    ...overrides
                }
            ]
        }
    };
}

test('contains no title when version was not released', function () {
    const createChangelog = createChangelogWithPackageInfo();
    const options = changelogOptionsFactory.build({
        unreleased: true,
        versionNumber: nothing()
    });

    const changelog = createChangelog(options);
    const expected = '';

    assert.strictEqual(changelog, expected);
});

test('contains a title with the version number and the formatted date when version was released', function () {
    const createChangelog = createChangelogWithPackageInfo();
    const options = changelogOptionsFactory.build();
    const changelog = createChangelog(options);
    const expectedTitle = '## 1.0.0 (January 1, 1970)';

    assert.ok(changelog.includes(expectedTitle));
});

test('format the date with a custom date format when version was released', function () {
    const packageInfo = { 'pr-log': { dateFormat: 'dd.MM.yyyy' } };
    const createChangelog = createChangelogWithPackageInfo(packageInfo);
    const options = changelogOptionsFactory.build();
    const changelog = createChangelog(options);
    const expectedTitle = '## 1.0.0 (01.01.1970)';

    assert.ok(changelog.includes(expectedTitle));
});

test('creates a formatted changelog when version was released', function () {
    const createChangelog = createChangelogWithPackageInfo();
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'bug'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'bug'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'documentation'
        }
    ] as const;

    const expectedChangelog = [
        '### Bug Fixes',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        '',
        '### Documentation',
        '',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('uses custom labels when provided and version was released', function () {
    const customValidLabels = new Map([
        [ 'core', 'Core Features' ],
        [ 'addons', 'Addons' ]
    ]);
    const createChangelog = createChangelogWithConfig({
        ...defaultPrLogConfig,
        validLabels: customValidLabels,
        versionBumps: {
            major: [],
            minor: [],
            patch: [ 'core', 'addons' ]
        }
    });
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'core'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'addons'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'core'
        }
    ] as const;

    const expectedChangelog = [
        '### Core Features',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        '',
        '### Addons',
        '',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('uses the same order for the changelog sections as in validLabels when version was released', function () {
    const customValidLabels = new Map([
        [ 'first', 'First Section' ],
        [ 'second', 'Second Section' ]
    ]);
    const createChangelog = createChangelogWithConfig({
        ...defaultPrLogConfig,
        validLabels: customValidLabels,
        versionBumps: {
            major: [],
            minor: [],
            patch: [ 'first', 'second' ]
        }
    });
    const mergedPullRequests = [
        {
            id: 1,
            title: 'Fixed bug foo',
            label: 'second'
        },
        {
            id: 2,
            title: 'Fixed bug bar',
            label: 'second'
        },
        {
            id: 3,
            title: 'Fix spelling error',
            label: 'first'
        }
    ] as const;

    const expectedChangelog = [
        '### First Section',
        '',
        '* Fix spelling error ([#3](https://github.com/any/repo/pull/3))',
        '',
        '### Second Section',
        '',
        '* Fixed bug foo ([#1](https://github.com/any/repo/pull/1))',
        '* Fixed bug bar ([#2](https://github.com/any/repo/pull/2))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('collapses repeated pull requests when a matching collapse rule is configured', function () {
    const validLabels = new Map([ [ 'upgrade', 'Dependency Upgrades' ] ]);
    const createChangelog = createChangelogWithConfig({
        ...createPrLogConfigFromPackageInfo(createUpgradeCollapseRulePackageInfo()),
        validLabels,
        versionBumps: { major: [], minor: [], patch: [ 'upgrade' ] }
    });
    const mergedPullRequests = [
        {
            id: 4,
            title: 'Update foo from 3 to 4',
            label: 'upgrade'
        },
        {
            id: 5,
            title: 'Update bar from 1 to 2',
            label: 'upgrade'
        },
        {
            id: 3,
            title: 'Update foo from 2 to 3',
            label: 'upgrade'
        },
        {
            id: 2,
            title: 'Update foo from 1 to 2',
            label: 'upgrade'
        }
    ] as const;

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* Update foo from 1 to 4 ([#4](https://github.com/any/repo/pull/4), [#3](https://github.com/any/repo/pull/3), [#2](https://github.com/any/repo/pull/2))',
        '* Update bar from 1 to 2 ([#5](https://github.com/any/repo/pull/5))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('collapses linkless changelog entries without rendering pull request links', function () {
    const validLabels = new Map([ [ 'upgrade', 'Dependency Upgrades' ] ]);
    const createChangelog = createChangelogWithConfig({
        ...createPrLogConfigFromPackageInfo(createUpgradeCollapseRulePackageInfo()),
        validLabels,
        versionBumps: { major: [], minor: [], patch: [ 'upgrade' ] }
    });
    const mergedPullRequests = [
        {
            id: undefined,
            title: 'Update foo from 2 to 3',
            label: 'upgrade'
        },
        {
            id: undefined,
            title: 'Update foo from 1 to 2',
            label: 'upgrade'
        }
    ] as const;

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* Update foo from 1 to 3',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
    assert.ok(!changelog.includes('pull/undefined'));
});

test('does not collapse pull requests when the configured version chain is incomplete', function () {
    const validLabels = new Map([ [ 'upgrade', 'Dependency Upgrades' ] ]);
    const createChangelog = createChangelogWithConfig({
        ...createPrLogConfigFromPackageInfo(createUpgradeCollapseRulePackageInfo()),
        validLabels,
        versionBumps: { major: [], minor: [], patch: [ 'upgrade' ] }
    });
    const mergedPullRequests = [
        {
            id: 4,
            title: 'Update foo from 3 to 4',
            label: 'upgrade'
        },
        {
            id: 2,
            title: 'Update foo from 1 to 2',
            label: 'upgrade'
        }
    ] as const;

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* Update foo from 3 to 4 ([#4](https://github.com/any/repo/pull/4))',
        '* Update foo from 1 to 2 ([#2](https://github.com/any/repo/pull/2))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('supports custom capture group names in collapse rules', function () {
    const createChangelog = createChangelogWithPackageInfo({
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^Bump (?<name>.+?) \\((?<previous>.+?) -> (?<next>.+?)\\)$',
                    replace: 'Bump $<name> ($<previous> -> $<next>)',
                    keyGroup: 'name',
                    fromGroup: 'previous',
                    toGroup: 'next'
                }
            ]
        }
    });
    const mergedPullRequests = [
        {
            id: 3,
            title: 'Bump foo (2 -> 3)',
            label: 'upgrade'
        },
        {
            id: 2,
            title: 'Bump foo (1 -> 2)',
            label: 'upgrade'
        }
    ] as const;

    const expectedChangelog = [
        '### Dependency Upgrades',
        '',
        '* Bump foo (1 -> 3) ([#3](https://github.com/any/repo/pull/3), [#2](https://github.com/any/repo/pull/2))',
        ''
    ]
        .join('\n');

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes(expectedChangelog));
});

test('falls back to an empty string for missing placeholders in collapse rule replacements', function () {
    const createChangelog = createChangelogWithPackageInfo({
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^Update (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: 'Update $<dependency> from $<from> to $<to>$<suffix>'
                }
            ]
        }
    });
    const mergedPullRequests = [
        {
            id: 3,
            title: 'Update foo from 2 to 3',
            label: 'upgrade'
        },
        {
            id: 2,
            title: 'Update foo from 1 to 2',
            label: 'upgrade'
        }
    ] as const;

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(
        changelog.includes(
            '* Update foo from 1 to 3 ([#3](https://github.com/any/repo/pull/3), [#2](https://github.com/any/repo/pull/2))'
        )
    );
});

test('throws when a collapse rule is missing required fields', function () {
    assert.throws(
        function () {
            createChangelogWithPackageInfo({
                'pr-log': {
                    collapseRules: [ { label: 'upgrade', pattern: '^Update .+$' } ]
                }
            });
        },
        { message: 'pr-log.collapseRules[].replace must be a string' }
    );
});

test('throws when a collapse rule entry is not an object', function () {
    assert.throws(
        function () {
            createChangelogWithPackageInfo({
                'pr-log': {
                    collapseRules: [ 'invalid' ]
                }
            });
        },
        { message: 'pr-log.collapseRules[] entries must be objects' }
    );
});

test('does not collapse pull requests when titles do not match the configured collapse rule', function () {
    const createChangelog = createChangelogWithPackageInfo(createUpgradeCollapseRulePackageInfo());
    const mergedPullRequests = [
        {
            id: 7,
            title: 'Refresh foo dependency',
            label: 'upgrade'
        }
    ] as const;

    const options = changelogOptionsFactory.build({
        mergedPullRequests,
        githubRepo: 'any/repo'
    });
    const changelog = createChangelog(options);

    assert.ok(changelog.includes('* Refresh foo dependency ([#7](https://github.com/any/repo/pull/7))'));
});

const invalidCaptureGroupTestCases = [
    {
        testName: 'throws when the configured key capture group is missing',
        packageInfo: createUpgradeCollapseRulePackageInfo({
            keyGroup: 'packageName'
        }),
        expectedErrorMessage: 'Collapse rule for label "upgrade" requires capture group "packageName"'
    },
    {
        testName: 'throws when the configured from capture group is missing',
        packageInfo: createUpgradeCollapseRulePackageInfo({
            fromGroup: 'previous'
        }),
        expectedErrorMessage: 'Collapse rule for label "upgrade" requires capture group "previous"'
    },
    {
        testName: 'throws when the configured to capture group is missing',
        packageInfo: createUpgradeCollapseRulePackageInfo({
            toGroup: 'next'
        }),
        expectedErrorMessage: 'Collapse rule for label "upgrade" requires capture group "next"'
    }
] as const;

for (const testCase of invalidCaptureGroupTestCases) {
    test(testCase.testName, function () {
        const createChangelog = createChangelogWithPackageInfo(testCase.packageInfo);
        const mergedPullRequests = [
            {
                id: 2,
                title: 'Update foo from 1 to 2',
                label: 'upgrade'
            }
        ] as const;

        const options = changelogOptionsFactory.build({
            mergedPullRequests,
            githubRepo: 'any/repo'
        });

        assert.throws(
            function () {
                createChangelog(options);
            },
            { message: testCase.expectedErrorMessage }
        );
    });
}
