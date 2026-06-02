import assert from 'node:assert';
import { renderChangelogMarkdown } from './render-changelog-markdown.ts';
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
