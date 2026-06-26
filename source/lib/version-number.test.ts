import assert from 'node:assert';
import { just, nothing } from 'true-myth/maybe';
import { err, ok } from 'true-myth/result';
import { Unit } from 'true-myth/unit';
import { validateVersionNumber, type ValidateVersionNumberOptions } from './version-number.ts';

const validateVersionNumberTestCases = [
    {
        testName: 'validateVersionNumber() returns a Result Ok when version is unreleased',
        options: {
            unreleased: true,
            autoVersion: false,
            versionNumber: nothing<string>()
        },
        expectedResult: ok(Unit)
    },
    {
        testName: 'validateVersionNumber() returns a Result Ok when version is auto-derived',
        options: {
            unreleased: false,
            autoVersion: true,
            versionNumber: nothing<string>()
        },
        expectedResult: ok(Unit)
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is an empty string',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: just('')
        },
        expectedResult: err(new TypeError('version-number not specified'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Err when version number is not valid',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: just('foo.bar')
        },
        expectedResult: err(new Error('version-number is invalid'))
    },
    {
        testName: 'validateVersionNumber() returns a Result Ok when version number is valid',
        options: {
            unreleased: false,
            autoVersion: false,
            versionNumber: just('1.2.3')
        },
        expectedResult: ok(Unit)
    }
] as const;

for (const validateVersionNumberTestCase of validateVersionNumberTestCases) {
    test(validateVersionNumberTestCase.testName, function () {
        const actual = validateVersionNumber(validateVersionNumberTestCase.options as ValidateVersionNumberOptions);

        assert.deepStrictEqual(actual, validateVersionNumberTestCase.expectedResult);
    });
}
