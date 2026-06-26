import assert from 'node:assert';
import { proposeVersionNumber } from './propose-version-number.ts';
import type { VersionBumpConfig } from './version-bump-config.ts';

const defaultVersionBumpConfig: VersionBumpConfig = {
    major: [ 'breaking' ],
    minor: [ 'feature' ],
    patch: [ 'bug', 'documentation' ]
};

test('proposes a major version when a breaking change is present', function () {
    const actual = proposeVersionNumber(
        '1.2.3',
        [ { id: 1, title: 'Breaking change', label: 'breaking' } ],
        defaultVersionBumpConfig
    );

    assert.strictEqual(actual, '2.0.0');
});

test('proposes a minor version when a feature is present without a breaking change', function () {
    const actual = proposeVersionNumber(
        '1.2.3',
        [ { id: 1, title: 'Feature', label: 'feature' } ],
        defaultVersionBumpConfig
    );

    assert.strictEqual(actual, '1.3.0');
});

test('proposes a patch version for patch labels', function () {
    const actual = proposeVersionNumber('1.2.3', [ { id: 1, title: 'Fix', label: 'bug' } ], defaultVersionBumpConfig);

    assert.strictEqual(actual, '1.2.4');
});

test('chooses the highest-precedence bump across multiple labels', function () {
    const actual = proposeVersionNumber(
        '1.2.3',
        [
            { id: 1, title: 'Docs', label: 'documentation' },
            { id: 2, title: 'Feature', label: 'feature' }
        ],
        defaultVersionBumpConfig
    );

    assert.strictEqual(actual, '1.3.0');
});

test('throws when no merged pull requests are available', function () {
    assert.throws(
        function () {
            proposeVersionNumber('1.2.3', [], defaultVersionBumpConfig);
        },
        { message: 'Failed to propose next version number because no merged pull requests were found' }
    );
});

test('throws when no labels match the configured version bumps', function () {
    assert.throws(
        function () {
            proposeVersionNumber('1.2.3', [ { id: 1, title: 'Docs', label: 'documentation' } ], {
                major: [ 'breaking' ],
                minor: [ 'feature' ],
                patch: []
            });
        },
        { message: 'Failed to propose next version number because no merged pull request labels match version bumps' }
    );
});

test('throws when the latest version tag cannot be incremented', function () {
    assert.throws(
        function () {
            proposeVersionNumber(
                'invalid',
                [ { id: 1, title: 'Feature', label: 'feature' } ],
                defaultVersionBumpConfig
            );
        },
        { message: 'Failed to increment version number' }
    );
});
