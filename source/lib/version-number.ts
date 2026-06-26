import assert from 'node:assert';
import semver from 'semver';
import { just, type Just, type Nothing } from 'true-myth/maybe';
import { err, ok, type Result } from 'true-myth/result';
import { Unit } from 'true-myth/unit';

type ValidateVersionNumberOptionsUnreleased = {
    readonly unreleased: true;
    readonly autoVersion: false;
    readonly versionNumber: Nothing<string>;
};

type ValidateVersionNumberOptionsAuto = {
    readonly unreleased: false;
    readonly autoVersion: true;
    readonly versionNumber: Nothing<string>;
};

type ValidateVersionNumberOptionsReleased = {
    readonly unreleased: false;
    readonly autoVersion: false;
    readonly versionNumber: Just<string>;
};

export type ValidateVersionNumberOptions =
    | ValidateVersionNumberOptionsAuto
    | ValidateVersionNumberOptionsReleased
    | ValidateVersionNumberOptionsUnreleased;

export function createVersionNumber(value: string): Just<string> {
    const versionNumber = just(value);

    assert.ok(versionNumber.isJust);

    return versionNumber;
}

export function validateVersionNumber(options: ValidateVersionNumberOptions): Result<Unit, Error> {
    if (options.unreleased || options.autoVersion) {
        return ok(Unit);
    }

    const versionNumber = options.versionNumber.value;

    if (versionNumber.length === 0) {
        return err(new TypeError('version-number not specified'));
    }

    if (semver.valid(versionNumber) === null) {
        return err(new Error('version-number is invalid'));
    }

    return ok(Unit);
}
