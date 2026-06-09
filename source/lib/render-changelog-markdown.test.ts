import assert from 'node:assert';
import {
    renderChangelogMarkdown,
    renderGroupedTargetChangelogMarkdown,
    renderTargetChangelogMarkdown
} from './render-changelog-markdown.ts';
import { defaultValidLabels } from './valid-labels.ts';

test('renders released changelog markdown', () => {
    const changelog = renderChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [{ id: 1, title: 'Fix bug', label: 'bug' }],
        githubRepo: 'owner/repo',
        unreleased: false,
        versionNumber: '1.2.3'
    });

    assert.ok(changelog.includes('## 1.2.3 (January 1, 1970)'));
    assert.ok(changelog.includes('* Fix bug ([#1](https://github.com/owner/repo/pull/1))'));
});

test('renders unreleased changelog markdown without a title', () => {
    const changelog = renderChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        mergedPullRequests: [{ id: 1, title: 'Fix bug', label: 'bug' }],
        githubRepo: 'owner/repo',
        unreleased: true,
        versionNumber: undefined
    });

    assert.ok(!changelog.startsWith('## '));
    assert.ok(changelog.includes('* Fix bug ([#1](https://github.com/owner/repo/pull/1))'));
});

test('renders target changelog markdown', () => {
    const changelog = renderTargetChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targetName: 'pkg-a',
        mergedPullRequests: [{ id: 1, title: 'Fix bug', label: 'bug' }],
        githubRepo: 'owner/repo',
        unreleased: true,
        versionNumber: undefined
    });

    assert.ok(changelog.includes('### Bug Fixes'));
    assert.ok(changelog.includes('* Fix bug ([#1](https://github.com/owner/repo/pull/1))'));
});

test('renders grouped target changelog markdown', () => {
    const changelog = renderGroupedTargetChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targets: [
            {
                targetName: 'pkg-a',
                unreleased: false,
                versionNumber: '1.2.3',
                mergedPullRequests: [{ id: 1, title: 'Fix bug', label: 'bug' }]
            },
            {
                targetName: 'pkg-b',
                unreleased: false,
                versionNumber: '2.0.0',
                mergedPullRequests: [{ id: 2, title: 'Add feature', label: 'feature' }]
            }
        ],
        githubRepo: 'owner/repo'
    });

    assert.ok(changelog.includes('## pkg-a 1.2.3 (January 1, 1970)'));
    assert.ok(changelog.includes('### Bug Fixes'));
    assert.ok(changelog.includes('## pkg-b 2.0.0 (January 1, 1970)'));
    assert.ok(changelog.includes('### Features'));
});

test('does not render empty target sections', () => {
    const changelog = renderGroupedTargetChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targets: [
            { targetName: 'pkg-a', unreleased: true, versionNumber: undefined, mergedPullRequests: [] },
            {
                targetName: 'pkg-b',
                unreleased: true,
                versionNumber: undefined,
                mergedPullRequests: [{ id: 2, title: 'Add feature', label: 'feature' }]
            }
        ],
        githubRepo: 'owner/repo'
    });

    assert.ok(!changelog.includes('## pkg-a'));
    assert.ok(changelog.includes('## pkg-b'));
});

test('renders grouped target changelog markdown with custom date formatting', () => {
    const changelog = renderGroupedTargetChangelogMarkdown({
        packageInfo: { 'pr-log': { dateFormat: 'dd.MM.yyyy' } },
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targets: [
            {
                targetName: 'pkg-a',
                unreleased: false,
                versionNumber: '1.2.3',
                mergedPullRequests: [{ id: 1, title: 'Fix bug', label: 'bug' }]
            }
        ],
        githubRepo: 'owner/repo'
    });

    assert.ok(changelog.includes('## pkg-a 1.2.3 (01.01.1970)'));
});
