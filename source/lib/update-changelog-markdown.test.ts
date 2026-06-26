import assert from 'node:assert';
import { renderGroupedTargetChangelogMarkdown, updateChangelogMarkdown } from './render-changelog-markdown.ts';
import { defaultValidLabels } from './valid-labels.ts';

test('updates an empty changelog', function () {
    const changelog = updateChangelogMarkdown({
        existingChangelogMarkdown: '',
        generatedChangelogMarkdown: '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n'
    });

    assert.strictEqual(changelog, '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n\n');
});

test('preserves existing changelog history', function () {
    const existingChangelogMarkdown = '## 0.9.0\n\n### Features\n\n* Add old feature\n';

    const changelog = updateChangelogMarkdown({
        existingChangelogMarkdown,
        generatedChangelogMarkdown: '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n'
    });

    assert.strictEqual(
        changelog,
        '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n\n## 0.9.0\n\n### Features\n\n* Add old feature\n'
    );
});

test('prepends repeated generated changelog sections', function () {
    const generatedChangelogMarkdown = '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n';
    const firstChangelog = updateChangelogMarkdown({
        existingChangelogMarkdown: '',
        generatedChangelogMarkdown
    });

    const secondChangelog = updateChangelogMarkdown({
        existingChangelogMarkdown: firstChangelog,
        generatedChangelogMarkdown
    });

    assert.strictEqual(
        secondChangelog,
        '## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n\n## 1.0.0\n\n### Bug Fixes\n\n* Fix bug\n\n'
    );
});

test('updates a changelog with grouped target sections', function () {
    const generatedChangelogMarkdown = renderGroupedTargetChangelogMarkdown({
        packageInfo: {},
        currentDate: new Date(0),
        validLabels: defaultValidLabels,
        targets: [
            {
                targetName: 'pkg-a',
                unreleased: false,
                versionNumber: '1.0.0',
                mergedPullRequests: [ { id: 1, title: 'Fix bug', label: 'bug' } ]
            },
            {
                targetName: 'pkg-b',
                unreleased: false,
                versionNumber: '2.0.0',
                mergedPullRequests: [ { id: 2, title: 'Add feature', label: 'feature' } ]
            }
        ],
        githubRepo: 'owner/repo'
    });

    const changelog = updateChangelogMarkdown({
        existingChangelogMarkdown: '## Older\n\n* Keep history\n',
        generatedChangelogMarkdown
    });

    assert.ok(changelog.startsWith('## pkg-a 1.0.0 (January 1, 1970)'));
    assert.ok(changelog.includes('## pkg-b 2.0.0 (January 1, 1970)'));
    assert.ok(changelog.endsWith('\n\n## Older\n\n* Keep history\n'));
});
