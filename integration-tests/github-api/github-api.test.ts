import assert from 'node:assert';
import {
    createPrLogEngine,
    defaultPrLogConfig,
    type PrLogEngine
} from '../../source/packages/core/core.entry-point.ts';
import {
    createDeterministicGitHubApiServer,
    type DeterministicGitHubApiRequest
} from './deterministic-github-api-server.ts';
import {
    emptyFilesScenario,
    failingFilesScenario,
    paginatedFiles,
    paginatedFilesScenario,
    renamedReadmeFiles,
    renamedReadmeScenario,
    type DeterministicGitHubApiScenario
} from './deterministic-github-api-scenarios.ts';

type WithServerContext = {
    readonly engine: PrLogEngine;
    readonly baseUrl: string;
    readonly requests: () => readonly DeterministicGitHubApiRequest[];
};

type WithServerTest = (context: WithServerContext) => Promise<void>;

function withServer(scenario: DeterministicGitHubApiScenario, testFunction: WithServerTest): () => Promise<void> {
    return async function executeWithServer() {
        const server = await createDeterministicGitHubApiServer(scenario);

        try {
            await testFunction({
                baseUrl: server.baseUrl,
                requests: server.requests,
                engine: createPrLogEngine({
                    githubToken: undefined,
                    githubApiBaseUrl: server.baseUrl,
                    workingDirectory: process.cwd(),
                    config: defaultPrLogConfig
                })
            });
        } finally {
            await server.stop();
        }
    };
}

async function readChangedFiles(engine: PrLogEngine, pullRequestId: number): Promise<unknown> {
    return engine.readPullRequestChangedFiles({
        githubRepo: 'owner/repo',
        pullRequests: [ { id: pullRequestId, title: 'Change files' } ]
    });
}

test(
    'reads changed file metadata from the configured GitHub API base URL',
    withServer(renamedReadmeScenario, async function (context) {
        assert.deepStrictEqual(
            await readChangedFiles(context.engine, 123),
            new Map([ [ 123, renamedReadmeFiles ] ])
        );
        assert.deepStrictEqual(context.requests(), [
            {
                method: 'GET',
                path: '/repos/owner/repo/pulls/123/files',
                search: ''
            }
        ]);
    })
);

test(
    'follows GitHub pagination while reading changed files',
    withServer(paginatedFilesScenario, async function (context) {
        assert.deepStrictEqual(
            await readChangedFiles(context.engine, 321),
            new Map([ [ 321, paginatedFiles ] ])
        );
        assert.deepStrictEqual(context.requests(), [
            {
                method: 'GET',
                path: '/repos/owner/repo/pulls/321/files',
                search: ''
            },
            {
                method: 'GET',
                path: '/repos/owner/repo/pulls/321/files',
                search: '?page=2'
            }
        ]);
    })
);

test(
    'reads an empty changed file list from GitHub',
    withServer(emptyFilesScenario, async function (context) {
        assert.deepStrictEqual(await readChangedFiles(context.engine, 404), new Map([ [ 404, [] ] ]));
    })
);

test(
    'surfaces GitHub API errors while reading changed files',
    withServer(failingFilesScenario, async function (context) {
        await assert.rejects(readChangedFiles(context.engine, 500), /deterministic failure/u);
    })
);

test(
    'returns not found for unsupported deterministic GitHub API routes',
    withServer(emptyFilesScenario, async function (context) {
        const response = await fetch(`${context.baseUrl}/unsupported`);

        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(await response.json(), { message: 'not found' });
        assert.deepStrictEqual(context.requests(), [
            {
                method: 'GET',
                path: '/unsupported',
                search: ''
            }
        ]);
    })
);
