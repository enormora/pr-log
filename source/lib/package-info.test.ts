import assert from 'node:assert';
import { getIgnoredLabels } from './package-info.ts';

test('reads ignored labels from package info', function () {
    assert.deepStrictEqual(
        getIgnoredLabels({
            'pr-log': {
                ignoredLabels: [ 'release' ]
            }
        }),
        [ 'release' ]
    );
});

test('falls back to no ignored labels', function () {
    assert.deepStrictEqual(getIgnoredLabels({}), []);
});

test('rejects ignored labels that are not an array', function () {
    assert.throws(
        function () {
            getIgnoredLabels({
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
            getIgnoredLabels({
                'pr-log': {
                    ignoredLabels: [ 'release', 1 ]
                }
            });
        },
        { message: 'pr-log.ignoredLabels must be an array of strings' }
    );
});
