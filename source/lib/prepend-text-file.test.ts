import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prependTextFile } from './prepend-text-file.ts';

const byteOrderMark = JSON.parse([ '"\\u', 'fe', 'ff"' ].join('')) as string;

async function withTemporaryFile(testFile: (filePath: string) => Promise<void>): Promise<void> {
    const directoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'pr-log-'));

    try {
        await testFile(path.join(directoryPath, 'CHANGELOG.md'));
    } finally {
        await fs.rm(directoryPath, { force: true, recursive: true });
    }
}

test('prependTextFile() creates a missing file', async function () {
    await withTemporaryFile(async function (filePath) {
        await prependTextFile(filePath, 'generated changelog\n\n');

        assert.strictEqual(await fs.readFile(filePath, { encoding: 'utf8' }), 'generated changelog\n\n');
    });
});

test('prependTextFile() prepends text to an existing file', async function () {
    await withTemporaryFile(async function (filePath) {
        await fs.writeFile(filePath, 'existing changelog\n', { encoding: 'utf8' });

        await prependTextFile(filePath, 'generated changelog\n\n');

        assert.strictEqual(
            await fs.readFile(filePath, { encoding: 'utf8' }),
            'generated changelog\n\nexisting changelog\n'
        );
    });
});

test('prependTextFile() keeps a byte order mark at the start of the file', async function () {
    await withTemporaryFile(async function (filePath) {
        await fs.writeFile(filePath, `${byteOrderMark}existing changelog\n`, { encoding: 'utf8' });

        await prependTextFile(filePath, 'generated changelog\n\n');

        assert.strictEqual(
            await fs.readFile(filePath, { encoding: 'utf8' }),
            `${byteOrderMark}generated changelog\n\nexisting changelog\n`
        );
    });
});

test('prependTextFile() rejects read errors', async function () {
    await withTemporaryFile(async function (filePath) {
        await fs.mkdir(filePath);

        await assert.rejects(prependTextFile(filePath, 'generated changelog\n\n'), { code: 'EISDIR' });
    });
});
