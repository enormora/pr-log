import assert from 'node:assert';
import { stub } from 'sinon';
import { createErrorReporter } from './error-reporter.ts';

test('createErrorReporter() reports plain errors', () => {
    const writeError = stub();
    const setExitCode = stub();
    const reportError = createErrorReporter({
        writeError(message) {
            writeError(message);
        },
        setExitCode(exitCode) {
            setExitCode(exitCode);
        }
    });

    reportError(new Error('failed'), { isTracingEnabled: false });

    assert.deepStrictEqual(writeError.firstCall.args, ['Error: failed']);
    assert.deepStrictEqual(setExitCode.firstCall.args, [1]);
});

test('createErrorReporter() reports stack traces', () => {
    const writeError = stub();
    const setExitCode = stub();
    const error = new Error('failed');
    error.stack = 'stack trace';
    const reportError = createErrorReporter({
        writeError(message) {
            writeError(message);
        },
        setExitCode(exitCode) {
            setExitCode(exitCode);
        }
    });

    reportError(error, { isTracingEnabled: true });

    assert.deepStrictEqual(writeError.firstCall.args, ['stack trace']);
    assert.deepStrictEqual(setExitCode.firstCall.args, [1]);
});
