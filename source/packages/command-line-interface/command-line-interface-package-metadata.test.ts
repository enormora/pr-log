import assert from 'node:assert';
import { createCommandLineInterfacePackageMetadata } from './command-line-interface-package-metadata.ts';

test('createCommandLineInterfacePackageMetadata() reads string package fields', () => {
    const packageMetadata = createCommandLineInterfacePackageMetadata({
        name: 'pr-log',
        description: 'Changelog generator',
        version: '1.2.3'
    });

    assert.deepStrictEqual(packageMetadata, {
        name: 'pr-log',
        description: 'Changelog generator',
        version: '1.2.3'
    });
});

test('createCommandLineInterfacePackageMetadata() ignores non-string package fields', () => {
    const packageMetadata = createCommandLineInterfacePackageMetadata({
        name: 1,
        description: false,
        version: null
    });

    assert.deepStrictEqual(packageMetadata, {
        name: '',
        description: '',
        version: ''
    });
});
