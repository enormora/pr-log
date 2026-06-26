import assert from 'node:assert';
import { splitByString, splitByPattern } from './split.ts';

test('splitByString() splits the given string by an empty string separator', function () {
    const result = splitByString('foo', '');
    assert.deepStrictEqual(result, [ 'f', 'o', 'o' ]);
});

test('splitByString() splits the given string by an non empty string separator', function () {
    const result = splitByString('foo bar', ' ');
    assert.deepStrictEqual(result, [ 'foo', 'bar' ]);
});

test('splitByString() splits an empty string by an empty string separator', function () {
    const result = splitByString('', '');
    assert.deepStrictEqual(result, []);
});

test('splitByString() splits an empty string by an non empty string separator', function () {
    const result = splitByString('', ' ');
    assert.deepStrictEqual(result, [ '' ]);
});

test('splitByPattern() splits the given string by the given regex pattern', function () {
    const result = splitByPattern('foo bar', / /);
    assert.deepStrictEqual(result, [ 'foo', 'bar' ]);
});

test('splitByPattern() splits an empty string by the given regex pattern', function () {
    const result = splitByPattern('', / /);
    assert.deepStrictEqual(result, [ '' ]);
});

test('splitByPattern() throws when an empty pattern is given', function () {
    const emptyPattern = String();

    assert.throws(
        function () {
            splitByPattern('foo', new RegExp(emptyPattern));
        },
        { message: 'The given regex pattern was empty and can’t be used to split a string value' }
    );
});
