import { isString } from '@sindresorhus/is';

export type PackageMetadata = {
    readonly name: string;
    readonly description: string;
    readonly version: string;
};

type PackageMetadataReader = {
    readonly packageJsonUrls: readonly URL[];
    readonly readJsonFile: (filePath: string) => Promise<Readonly<Record<string, unknown>>>;
};

function readStringValue(value: unknown): string {
    if (isString(value)) {
        return value;
    }

    return '';
}

export function createPackageMetadata(packageJson: Readonly<Record<string, unknown>>): PackageMetadata {
    return {
        name: readStringValue(packageJson.name),
        description: readStringValue(packageJson.description),
        version: readStringValue(packageJson.version)
    };
}

export async function readPackageMetadata(reader: PackageMetadataReader): Promise<PackageMetadata> {
    for (const packageJsonUrl of reader.packageJsonUrls) {
        try {
            return createPackageMetadata(await reader.readJsonFile(packageJsonUrl.pathname));
        } catch (error: unknown) {
            if (!(error instanceof Error && Reflect.get(error, 'code') === 'ENOENT')) {
                throw error;
            }
        }
    }

    throw new Error('Failed to read package metadata');
}
