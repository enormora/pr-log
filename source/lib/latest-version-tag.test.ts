import assert from 'node:assert';
import { determineLatestVersionTag } from './latest-version-tag.ts';

test('throws when there is no semver tag', function () {
    assert.throws(
        function () {
            determineLatestVersionTag([ 'foo', 'bar' ]);
        },
        { message: 'Failed to determine latest version number git tag' }
    );
});

test('returns the highest stable semver tag', function () {
    const actual = determineLatestVersionTag([ '1.0.0', '0.0.0', '2.0.0', '3.0.0-alpha.1' ]);

    assert.strictEqual(actual, '2.0.0');
});
