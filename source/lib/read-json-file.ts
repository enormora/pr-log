import { isPlainObject } from '@sindresorhus/is';

export type JsonFileReader = (filePath: string) => Promise<Record<string, unknown>>;

export type JsonFileReaderDependencies = {
    readonly readTextFile: (filePath: string) => Promise<string>;
};

export function createJsonFileReader(dependencies: JsonFileReaderDependencies): JsonFileReader {
    const { readTextFile } = dependencies;

    return async function readJsonFile(filePath) {
        const fileContent = await readTextFile(filePath);
        const data: unknown = JSON.parse(fileContent);

        if (!isPlainObject(data)) {
            throw new TypeError(`JSON file "${filePath}" must contain an object`);
        }

        return data;
    };
}
