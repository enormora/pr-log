import assert from 'node:assert';
import { resolveLatestSemverTagBaseRef } from './changelog-base-ref.ts';

test('resolves the latest semver tag base ref', () => {
    assert.deepStrictEqual(resolveLatestSemverTagBaseRef({ tags: ['1.0.0', '2.0.0-alpha.1', '1.2.0'] }), {
        ref: '1.2.0'
    });
});
