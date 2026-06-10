import { isString } from '@sindresorhus/is';

export type PackageMetadata = {
    readonly name: string;
    readonly description: string;
    readonly version: string;
};

function readStringValue(value: unknown): string {
    if (isString(value)) {
        return value;
    }

    return '';
}

export function createPackageMetadata(packageJson: Record<string, unknown>): PackageMetadata {
    return {
        name: readStringValue(packageJson.name),
        description: readStringValue(packageJson.description),
        version: readStringValue(packageJson.version)
    };
}
