import assert from 'node:assert';
import { Octokit } from '@octokit/rest';
import { stub, type SinonStub } from 'sinon';
import { createGitHubClient, type GitHubClientDependencies } from './github-client.ts';

function createOctokitStub(client: Readonly<Octokit>): GitHubClientDependencies['Octokit'] & SinonStub {
    return stub().returns(client) as unknown as GitHubClientDependencies['Octokit'] & SinonStub;
}

test('creates the default GitHub client when no API base URL is configured', function () {
    const expectedClient = new Octokit({ auth: 'expected' });
    const OctokitConstructor = createOctokitStub(expectedClient);

    const client = createGitHubClient(
        { Octokit: OctokitConstructor },
        { githubToken: 'token', githubApiBaseUrl: undefined }
    );

    assert.strictEqual(client, expectedClient);
    assert.strictEqual(OctokitConstructor.calledWithNew(), true);
    assert.deepStrictEqual(OctokitConstructor.firstCall.args, [ { auth: 'token' } ]);
});

test('creates a GitHub client with the configured API base URL', function () {
    const expectedClient = new Octokit({ auth: 'expected' });
    const OctokitConstructor = createOctokitStub(expectedClient);

    const client = createGitHubClient(
        { Octokit: OctokitConstructor },
        { githubToken: 'token', githubApiBaseUrl: 'https://github.example/api' }
    );

    assert.strictEqual(client, expectedClient);
    assert.strictEqual(OctokitConstructor.calledWithNew(), true);
    assert.strictEqual(
        OctokitConstructor.calledWith({
            auth: 'token',
            baseUrl: 'https://github.example/api'
        }),
        true
    );
});
