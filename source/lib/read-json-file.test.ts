import assert from 'node:assert';
import { fake } from 'sinon';
import { createJsonFileReader } from './read-json-file.ts';

test('createJsonFileReader() reads JSON object content from text file content', async function () {
    const readTextFile = fake.resolves('{"name":"pr-log"}');
    const readJsonFile = createJsonFileReader({ readTextFile });

    const result = await readJsonFile('package.json');

    assert.deepStrictEqual(result, { name: 'pr-log' });
    assert.deepStrictEqual(readTextFile.firstCall.args, [ 'package.json' ]);
});

test('createJsonFileReader() rejects non-object JSON content', async function () {
    const readTextFile = fake.resolves('[]');
    const readJsonFile = createJsonFileReader({ readTextFile });

    await assert.rejects(readJsonFile('package.json'), {
        message: 'JSON file "package.json" must contain an object'
    });
});
