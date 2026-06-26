import assert from 'node:assert';
import { fake } from 'sinon';
import {
    findRemoteAliasFactory,
    type FindRemoteAliasDependencies,
    type FindRemoteAlias,
    type RemoteAlias
} from './find-remote-alias.ts';

const githubRepo = 'foo/bar';

function factory(result: readonly RemoteAlias[] = []): FindRemoteAlias {
    const getRemoteAliases = fake.resolves(result);
    const dependencies = { remoteAliasReader: { getRemoteAliases } } as unknown as FindRemoteAliasDependencies;

    return findRemoteAliasFactory(dependencies);
}

test('rejects if no alias is found', async function () {
    const expectedGitRemote = `git://github.com/${githubRepo}.git`;
    const expectedErrorMessage = `This local git repository doesn’t have a remote pointing to ${expectedGitRemote}`;
    const findRemoteAlias = factory();

    await assert.rejects(findRemoteAlias(githubRepo), { message: expectedErrorMessage });
});

test('resolves with the correct remote alias', async function () {
    const gitRemotes = [
        { alias: 'origin', url: 'git://github.com/fork/bar' },
        { alias: 'upstream', url: 'git://github.com/foo/bar' }
    ];
    const findRemoteAlias = factory(gitRemotes);

    assert.strictEqual(await findRemoteAlias(githubRepo), 'upstream');
});

test('works with different forms of the same URL', async function () {
    const gitRemotes = [ { alias: 'origin', url: 'git+ssh://git@github.com/foo/bar ' } ];
    const findRemoteAlias = factory(gitRemotes);

    assert.strictEqual(await findRemoteAlias(githubRepo), 'origin');
});
