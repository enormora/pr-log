import assert from 'node:assert';
import { createPackageMetadata } from './package-metadata.ts';

test('createPackageMetadata() reads string package fields', () => {
    const packageMetadata = createPackageMetadata({
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

test('createPackageMetadata() ignores non-string package fields', () => {
    const packageMetadata = createPackageMetadata({
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
