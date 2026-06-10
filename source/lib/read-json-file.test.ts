import assert from 'node:assert';
import { fake } from 'sinon';
import { createJsonFileReader } from './read-json-file.ts';

test('createJsonFileReader() reads JSON object content from text file content', async () => {
    const readTextFile = fake.resolves('{"name":"pr-log"}');
    const readJsonFile = createJsonFileReader({ readTextFile });

    const result = await readJsonFile('package.json');

    assert.deepStrictEqual(result, { name: 'pr-log' });
    assert.deepStrictEqual(readTextFile.firstCall.args, ['package.json']);
});
