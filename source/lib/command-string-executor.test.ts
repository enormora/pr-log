import assert from 'node:assert';
import { createCommandStringExecutor } from './command-string-executor.ts';

test('executes a command string in the configured working directory', async function () {
    const execute = createCommandStringExecutor({ workingDirectory: process.cwd() });

    const result = await execute(`${process.execPath} -p process.cwd()`);

    assert.strictEqual(result.stdout, process.cwd());
});

test('throws when the command string is empty', async function () {
    const execute = createCommandStringExecutor({ workingDirectory: process.cwd() });

    await assert.rejects(execute(''), { message: 'Cannot execute an empty command' });
});
