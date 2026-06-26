import assert from 'node:assert';
import { fake } from 'sinon';
import { createRemoteAliasReader, type RemoteAliasReaderDependencies } from './remote-alias-reader.ts';

test('createRemoteAliasReader() reads aliases through the git command runner', async function () {
    const dependencies: RemoteAliasReaderDependencies = {
        gitCommandRunner: {
            getShortStatus: fake.resolves(''),
            getCurrentBranchName: fake.resolves('main'),
            fetchRemote: fake.resolves(undefined),
            getSymmetricDifferencesBetweenBranches: fake.resolves([]),
            getRemoteAliases: fake.resolves([ { alias: 'origin', url: 'git@example.com/repo/a.git' } ]),
            listTags: fake.resolves([]),
            hasRef: fake.resolves(false),
            getMergeCommitLogs: fake.resolves([]),
            getFirstParentCommitLogs: fake.resolves([])
        }
    };
    const remoteAliasReader = createRemoteAliasReader(dependencies);

    const result = await remoteAliasReader.getRemoteAliases();

    assert.deepStrictEqual(result, [ { alias: 'origin', url: 'git@example.com/repo/a.git' } ]);
});
