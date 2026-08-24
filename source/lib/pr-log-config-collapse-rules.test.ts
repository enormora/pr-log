import assert from 'node:assert';
import { createPrLogConfigFromPackageInfo } from './pr-log-config.ts';

test('reads highest-version collapse rules from package info', function () {
    const config = createPrLogConfigFromPackageInfo({
        'pr-log': {
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^Update dependency (?<dependency>.+?) to (?<to>.+?)$',
                    replace: 'Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                }
            ]
        }
    });

    assert.deepStrictEqual(
        config.collapseRules.map(function (collapseRule) {
            return {
                ...collapseRule,
                pattern: collapseRule.pattern.source,
                patternFlags: collapseRule.pattern.flags
            };
        }),
        [
            {
                label: 'upgrade',
                pattern: '^Update dependency (?<dependency>.+?) to (?<to>.+?)$',
                patternFlags: 'u',
                replace: 'Update dependency $<dependency> to $<to>',
                keyGroup: 'dependency',
                versionGroup: 'to'
            }
        ]
    );
});
