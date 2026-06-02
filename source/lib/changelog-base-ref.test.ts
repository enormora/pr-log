import assert from 'node:assert';
import { fake } from 'sinon';
import {
    formatPackageVersionTag,
    resolveChangelogBaseRef,
    resolveLatestSemverTagBaseRef,
    type GitRefReader,
    type MissingChangelogBaseRefError
} from './changelog-base-ref.ts';

function gitRefReaderFactory(existingRefs: readonly string[]): GitRefReader {
    return {
        async hasRef(ref) {
            return existingRefs.includes(ref);
        }
    };
}

const packageInput = {
    packageName: '@scope/package',
    previousVersion: '1.2.3',
    previousGitHead: 'abc123',
    packageTagFormat: undefined,
    explicitBaseRef: 'explicit-ref'
};

test('resolves the latest semver tag base ref', () => {
    assert.deepStrictEqual(resolveLatestSemverTagBaseRef({ tags: ['1.0.0', '2.0.0-alpha.1', '1.2.0'] }), {
        ref: '1.2.0'
    });
});

test('formats package version tags', () => {
    assert.strictEqual(
        formatPackageVersionTag({ packageName: '@scope/package', version: '1.2.3', packageTagFormat: undefined }),
        '@scope/package@1.2.3'
    );
});

test('formats package version tags with a custom format', () => {
    assert.strictEqual(
        formatPackageVersionTag({
            packageName: '@scope/package',
            version: '1.2.3',
            packageTagFormat: 'release/{packageName}/v{version}'
        }),
        'release/@scope/package/v1.2.3'
    );
});

test('uses the explicit base ref first', async () => {
    const hasRef = fake.resolves(true);
    const gitRefReader = { hasRef };

    const baseRef = await resolveChangelogBaseRef(packageInput, gitRefReader);

    assert.deepStrictEqual(baseRef, { ref: 'explicit-ref' });
    assert.deepStrictEqual(hasRef.firstCall.args, ['explicit-ref']);
});

test('uses the previous git head before the package version tag', async () => {
    const baseRef = await resolveChangelogBaseRef(
        { ...packageInput, explicitBaseRef: undefined },
        gitRefReaderFactory(['abc123', '@scope/package@1.2.3'])
    );

    assert.deepStrictEqual(baseRef, { ref: 'abc123' });
});

test('uses the package version tag when no git head was provided', async () => {
    const baseRef = await resolveChangelogBaseRef(
        { ...packageInput, explicitBaseRef: undefined, previousGitHead: undefined },
        gitRefReaderFactory(['@scope/package@1.2.3'])
    );

    assert.deepStrictEqual(baseRef, { ref: '@scope/package@1.2.3' });
});

test('throws when the selected base ref is missing', async () => {
    await assert.rejects(resolveChangelogBaseRef(packageInput, gitRefReaderFactory([])), (error: unknown) => {
        const missingBaseRefError = error as MissingChangelogBaseRefError;

        assert.strictEqual(missingBaseRefError.name, 'MissingChangelogBaseRefError');
        assert.strictEqual(missingBaseRefError.packageName, '@scope/package');
        assert.strictEqual(missingBaseRefError.ref, 'explicit-ref');
        assert.strictEqual(missingBaseRefError.reason, 'explicit-base-ref');
        return true;
    });
});

test('throws when no package base ref can be determined', async () => {
    await assert.rejects(
        resolveChangelogBaseRef(
            {
                packageName: '@scope/package',
                previousVersion: undefined,
                previousGitHead: undefined,
                packageTagFormat: undefined,
                explicitBaseRef: undefined
            },
            gitRefReaderFactory([])
        ),
        { message: 'No base ref could be determined for package "@scope/package" using package-version-tag' }
    );
});
