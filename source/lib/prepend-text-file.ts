import fs from 'node:fs/promises';

export type PrependTextFile = (filePath: string, text: string) => Promise<void>;

const byteOrderMark = Buffer.from('77u/', 'base64').toString('utf8');

function isMissingFileError(error: unknown): boolean {
    return Reflect.get(new Object(error), 'code') === 'ENOENT';
}

function hasByteOrderMark(text: string): boolean {
    return text.startsWith(byteOrderMark);
}

async function readTextFileIfPresent(filePath: string): Promise<string | undefined> {
    try {
        return await fs.readFile(filePath, { encoding: 'utf8' });
    } catch (error: unknown) {
        if (isMissingFileError(error)) {
            return undefined;
        }

        throw error;
    }
}

export const prependTextFile: PrependTextFile = async function (filePath, text) {
    const currentText = await readTextFileIfPresent(filePath);

    if (currentText === undefined) {
        await fs.writeFile(filePath, text, { encoding: 'utf8' });
        return;
    }

    const nextText = hasByteOrderMark(currentText)
        ? `${byteOrderMark}${text}${currentText.slice(byteOrderMark.length)}`
        : `${text}${currentText}`;

    await fs.writeFile(filePath, nextText, { encoding: 'utf8' });
};
