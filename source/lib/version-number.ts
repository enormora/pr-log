import assert from 'node:assert';
import semver from 'semver';
import { just } from 'true-myth/maybe';
import { err, ok } from 'true-myth/result';
import { Unit } from 'true-myth/unit';

export type MissingVersionNumber = {
    readonly isJust: false;
    readonly isNothing: true;
    unwrapOr: (defaultValue: unknown) => unknown;
};

export type VersionNumber = {
    readonly isJust: true;
    readonly isNothing: false;
    readonly value: string;
    unwrapOr: (defaultValue: unknown) => unknown;
};

type ValidateVersionNumberOptionsUnreleased = {
    readonly unreleased: true;
    readonly autoVersion: false;
    readonly versionNumber: MissingVersionNumber;
};

type ValidateVersionNumberOptionsAuto = {
    readonly unreleased: false;
    readonly autoVersion: true;
    readonly versionNumber: MissingVersionNumber;
};

type ValidateVersionNumberOptionsReleased = {
    readonly unreleased: false;
    readonly autoVersion: false;
    readonly versionNumber: VersionNumber;
};

export type ValidateVersionNumberOptions =
    | ValidateVersionNumberOptionsAuto
    | ValidateVersionNumberOptionsReleased
    | ValidateVersionNumberOptionsUnreleased;

type VersionNumberValidationResult = {
    unwrapOrElse: (onError: (error: Error) => unknown) => unknown;
};

export function createVersionNumber(value: string): VersionNumber {
    const versionNumber = just(value);

    assert.ok(versionNumber.isJust);

    return versionNumber;
}

export function validateVersionNumber(options: ValidateVersionNumberOptions): VersionNumberValidationResult {
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
