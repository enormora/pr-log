import assert from 'node:assert';
import { createPackageMetadata, readPackageMetadata } from './package-metadata.ts';

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

test('readPackageMetadata() reads the first available package manifest', async () => {
    const packageMetadata = await readPackageMetadata({
        packageJsonUrls: [
            new URL('file:///project/package/package.json'),
            new URL('file:///project/source/package.json')
        ],
        async readJsonFile(filePath) {
            if (filePath === '/project/package/package.json') {
                return { name: 'pr-log', description: 'generated package', version: '9.9.9' };
            }

            throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        }
    });

    assert.deepStrictEqual(packageMetadata, {
        name: 'pr-log',
        description: 'generated package',
        version: '9.9.9'
    });
});

test('readPackageMetadata() falls back when a package manifest is missing', async () => {
    const packageMetadata = await readPackageMetadata({
        packageJsonUrls: [
            new URL('file:///project/package/package.json'),
            new URL('file:///project/package/source/package.json')
        ],
        async readJsonFile(filePath) {
            if (filePath === '/project/package/source/package.json') {
                return { name: 'pr-log', description: 'source package', version: '1.2.3' };
            }

            throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        }
    });

    assert.deepStrictEqual(packageMetadata, {
        name: 'pr-log',
        description: 'source package',
        version: '1.2.3'
    });
});

test('readPackageMetadata() rejects non-missing read errors', async () => {
    await assert.rejects(
        readPackageMetadata({
            packageJsonUrls: [new URL('file:///project/package/package.json')],
            async readJsonFile() {
                throw new Error('failed');
            }
        }),
        { message: 'failed' }
    );
});

test('readPackageMetadata() rejects when all package manifests are missing', async () => {
    await assert.rejects(
        readPackageMetadata({
            packageJsonUrls: [new URL('file:///project/package/package.json')],
            async readJsonFile() {
                throw Object.assign(new Error('not found'), { code: 'ENOENT' });
            }
        }),
        { message: 'Failed to read package metadata' }
    );
});
