export type JsonFileReader = (filePath: string) => Promise<Record<string, unknown>>;

export type JsonFileReaderDependencies = {
    readonly readTextFile: (filePath: string) => Promise<string>;
};

export function createJsonFileReader(dependencies: JsonFileReaderDependencies): JsonFileReader {
    const { readTextFile } = dependencies;

    return async function readJsonFile(filePath) {
        const fileContent = await readTextFile(filePath);
        return JSON.parse(fileContent) as Record<string, unknown>;
    };
}
