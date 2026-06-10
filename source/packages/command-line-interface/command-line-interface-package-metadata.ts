import { isString } from '@sindresorhus/is';

export type CommandLineInterfacePackageMetadata = {
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

export function createCommandLineInterfacePackageMetadata(
    packageJson: Record<string, unknown>
): CommandLineInterfacePackageMetadata {
    return {
        name: readStringValue(packageJson.name),
        description: readStringValue(packageJson.description),
        version: readStringValue(packageJson.version)
    };
}
