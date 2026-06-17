import assert from 'node:assert';
import { fake, type SinonSpy } from 'sinon';
import type { PrLogEngine } from '../core/pr-log-engine.ts';
import {
    createChangelogMarkdownRenderer,
    createLatestVersionTagReader,
    createMergedPullRequestReader
} from './pr-log-engine-cli-adapter.ts';

const validLabels = new Map([['bug', 'Bug Fixes']]);

type FactoryResult = {
    readonly prLogEngine: Pick<
        PrLogEngine,
        | 'collectMergedPullRequests'
        | 'renderChangelog'
        | 'resolveLatestSemverChangelogBaseRef'
        | 'resolvePullRequestLabels'
    >;
    readonly collectMergedPullRequests: SinonSpy;
    readonly renderChangelog: SinonSpy;
    readonly resolvePullRequestLabels: SinonSpy;
};

function createPrLogEngine(): FactoryResult {
    const collectMergedPullRequests = fake.resolves([{ id: 1, title: 'Fix bug' }]);
    const renderChangelog = fake.returns('rendered changelog');
    const resolvePullRequestLabels = fake.resolves([{ id: 1, title: 'Fix bug', label: 'bug' }]);

    return {
        prLogEngine: {
            resolveLatestSemverChangelogBaseRef: fake.resolves({ ref: '1.0.0' }),
            collectMergedPullRequests,
            renderChangelog,
            resolvePullRequestLabels
        },
        collectMergedPullRequests,
        renderChangelog,
        resolvePullRequestLabels
    };
}

test('createLatestVersionTagReader() returns the latest resolved base ref', async () => {
    const { prLogEngine } = createPrLogEngine();
    const getLatestVersionTag = createLatestVersionTagReader(prLogEngine);

    assert.strictEqual(await getLatestVersionTag(), '1.0.0');
});

test('createMergedPullRequestReader() collects pull requests from the latest base ref', async () => {
    const { prLogEngine, collectMergedPullRequests, resolvePullRequestLabels } = createPrLogEngine();
    const getMergedPullRequests = createMergedPullRequestReader(prLogEngine, {
        targetName: undefined,
        targetScopedLabelPattern: undefined
    });

    const result = await getMergedPullRequests('owner/repository', validLabels, []);

    assert.deepStrictEqual(result, [{ id: 1, title: 'Fix bug', label: 'bug' }]);
    assert.deepStrictEqual(collectMergedPullRequests.firstCall.args, [
        { githubRepo: 'owner/repository', baseRef: '1.0.0' }
    ]);
    assert.deepStrictEqual(resolvePullRequestLabels.firstCall.args, [
        {
            githubRepo: 'owner/repository',
            validLabels,
            ignoredLabels: [],
            pullRequests: [{ id: 1, title: 'Fix bug' }],
            targetName: undefined,
            targetScopedLabelPattern: undefined
        }
    ]);
});

test('createChangelogMarkdownRenderer() renders through the pr-log engine', () => {
    const { prLogEngine, renderChangelog } = createPrLogEngine();
    const renderChangelogMarkdown = createChangelogMarkdownRenderer(prLogEngine);
    const input = {
        packageInfo: {},
        currentDate: new Date(0),
        validLabels,
        githubRepo: 'owner/repository',
        mergedPullRequests: [],
        unreleased: true as const,
        versionNumber: undefined
    };

    assert.strictEqual(renderChangelogMarkdown(input), 'rendered changelog');
    assert.deepStrictEqual(renderChangelog.firstCall.args, [input]);
});
