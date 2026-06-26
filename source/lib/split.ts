import assert from 'node:assert';

type NonEmptyArray<T> = readonly [T, ...(readonly T[])];

type NonEmptyString<T extends string> = T extends '' ? never : T;

export function splitByString(value: string, separator: ''): readonly string[];
export function splitByString<Separator extends string>(
    value: string,
    separator: NonEmptyString<Separator>
): NonEmptyArray<string>;
export function splitByString(value: string, separator: string): readonly string[] {
    return value.split(separator);
}

function requireNonEmptyArray<T>(values: readonly T[]): NonEmptyArray<T> {
    const [ first, ...rest ] = values;

    assert.ok(first !== undefined);

    return [ first, ...rest ];
}

function isEmptyRegExp(value: Readonly<RegExp>): boolean {
    const matches = ''.split(value);
    return matches.length === 0;
}

export function splitByPattern(value: string, separator: Readonly<RegExp>): NonEmptyArray<string> {
    if (isEmptyRegExp(separator)) {
        throw new Error('The given regex pattern was empty and can’t be used to split a string value');
    }

    return requireNonEmptyArray(value.split(separator));
}
