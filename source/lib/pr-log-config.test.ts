import assert from 'node:assert';
import { createPrLogConfigFromPackageInfo, defaultPrLogConfig } from './pr-log-config.ts';

test('reads changelog config from package info', function () {
    const config = createPrLogConfigFromPackageInfo({
        'pr-log': {
            validLabels: [ [ 'custom', 'Custom Changes' ] ],
            ignoredLabels: [ 'release' ],
            dateFormat: 'dd.MM.yyyy',
            versionBumps: {
                minor: [ 'custom' ]
            },
            collapseRules: [
                {
                    label: 'custom',
                    pattern: '^Custom (?<dependency>.+) from (?<from>.+) to (?<to>.+)$',
                    replace: 'Custom $<dependency> from $<from> to $<to>'
                }
            ]
        }
    });

    assert.deepStrictEqual(config.validLabels, new Map([ [ 'custom', 'Custom Changes' ] ]));
    assert.deepStrictEqual(config.ignoredLabels, [ 'release' ]);
    assert.deepStrictEqual(config.versionBumps, { major: [], minor: [ 'custom' ], patch: [] });
    assert.strictEqual(config.dateFormat, 'dd.MM.yyyy');
    assert.deepStrictEqual(config.collapseRules, [
        {
            label: 'custom',
            pattern: /^Custom (?<dependency>.+) from (?<from>.+) to (?<to>.+)$/u,
            replace: 'Custom $<dependency> from $<from> to $<to>',
            keyGroup: 'dependency',
            fromGroup: 'from',
            toGroup: 'to'
        }
    ]);
    assert.strictEqual(config.labelLookupIntervalMilliseconds, defaultPrLogConfig.labelLookupIntervalMilliseconds);
    assert.strictEqual(config.maximumRateLimitRetryCount, defaultPrLogConfig.maximumRateLimitRetryCount);
});

test('uses fallback config values when package info has no changelog config', function () {
    const fallbackConfig = {
        ...defaultPrLogConfig,
        labelLookupIntervalMilliseconds: 123,
        maximumRateLimitRetryCount: 5
    };

    assert.deepStrictEqual(createPrLogConfigFromPackageInfo({}, fallbackConfig), {
        ...fallbackConfig,
        ignoredLabels: [],
        dateFormat: undefined,
        collapseRules: []
    });
});

test('rejects ignored labels that are not an array', function () {
    assert.throws(
        function () {
            createPrLogConfigFromPackageInfo({
                'pr-log': {
                    ignoredLabels: 'release'
                }
            });
        },
        { message: 'pr-log.ignoredLabels must be an array of strings' }
    );
});

test('rejects ignored label entries that are not strings', function () {
    assert.throws(
        function () {
            createPrLogConfigFromPackageInfo({
                'pr-log': {
                    ignoredLabels: [ 'release', 1 ]
                }
            });
        },
        { message: 'pr-log.ignoredLabels must be an array of strings' }
    );
});

test('rejects configured version bumps that are not an object', function () {
    assert.throws(
        function () {
            createPrLogConfigFromPackageInfo({
                'pr-log': {
                    versionBumps: 'minor'
                }
            });
        },
        { message: 'Configured version bumps must be an object' }
    );
});
