import assert from 'node:assert';
import { err, ok } from 'true-myth/result';
import {
    extractChangelogReleaseSection,
    type ReleaseSectionNotFound
} from './render-changelog-markdown.ts';

test('extracts a package release section', function () {
    const changelogMarkdown = [
        '## package-name 1.2.3 (January 1, 1970)',
        '',
        '### Bug Fixes',
        '',
        '* Fix package bug',
        '',
        '## package-name 1.2.2 (December 31, 1969)',
        '',
        '* Older change',
        ''
    ]
        .join('\n');

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: 'package-name',
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(
        releaseSection,
        ok('## package-name 1.2.3 (January 1, 1970)\n\n### Bug Fixes\n\n* Fix package bug')
    );
});

test('extracts a scoped package release section', function () {
    const changelogMarkdown = [
        '## @scope/name 1.2.3 (January 1, 1970)',
        '',
        '### Features',
        '',
        '* Add scoped feature',
        '',
        '## @scope/name 1.2.2 (December 31, 1969)',
        '',
        '* Older change',
        ''
    ]
        .join('\n');

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: '@scope/name',
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(
        releaseSection,
        ok('## @scope/name 1.2.3 (January 1, 1970)\n\n### Features\n\n* Add scoped feature')
    );
});

test('extracts a release section without a target', function () {
    const changelogMarkdown = [
        '## 1.2.3 (January 1, 1970)',
        '',
        '### Documentation',
        '',
        '* Update docs',
        '',
        '## 1.2.2 (December 31, 1969)',
        '',
        '* Older change',
        ''
    ]
        .join('\n');

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, ok('## 1.2.3 (January 1, 1970)\n\n### Documentation\n\n* Update docs'));
});

test('returns a typed not found result for missing versions', function () {
    const changelogMarkdown = '## 1.2.2 (December 31, 1969)\n\n* Older change\n';
    const expectedError: ReleaseSectionNotFound = {
        reason: 'release-section-not-found',
        targetName: undefined,
        versionNumber: '1.2.3'
    };

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, err(expectedError));
});

test('does not return empty release sections', function () {
    const changelogMarkdown = [
        '## 1.2.3 (January 1, 1970)',
        '',
        ' '.repeat(3),
        '',
        '## 1.2.2 (December 31, 1969)',
        '',
        '* Older change',
        ''
    ]
        .join('\n');
    const expectedError: ReleaseSectionNotFound = {
        reason: 'release-section-not-found',
        targetName: undefined,
        versionNumber: '1.2.3'
    };

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, err(expectedError));
});

test('stops extraction at the next release section boundary', function () {
    const changelogMarkdown = [
        '## 1.2.3 (January 1, 1970)',
        '',
        '### Bug Fixes',
        '',
        '* Fix current bug',
        '',
        '## package-name 1.2.2 (December 31, 1969)',
        '',
        '* Older package change',
        ''
    ]
        .join('\n');

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, ok('## 1.2.3 (January 1, 1970)\n\n### Bug Fixes\n\n* Fix current bug'));
});

test('extracts a final release section without a following boundary', function () {
    const changelogMarkdown = [
        '## 1.2.4 (January 2, 1970)',
        '',
        '* Newer change',
        '',
        '## 1.2.3 (January 1, 1970)',
        '',
        '* Final matching change',
        ''
    ]
        .join('\n');

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, ok('## 1.2.3 (January 1, 1970)\n\n* Final matching change'));
});

test('does not match unrelated headings or partial versions', function () {
    const changelogMarkdown = [
        '## Release 1.2.3 (January 1, 1970)',
        '',
        '* Not a pr-log release heading',
        '',
        '## 1.2.30 (January 1, 1970)',
        '',
        '* Wrong version',
        ''
    ]
        .join('\n');
    const expectedError: ReleaseSectionNotFound = {
        reason: 'release-section-not-found',
        targetName: undefined,
        versionNumber: '1.2.3'
    };

    const releaseSection = extractChangelogReleaseSection({
        changelogMarkdown,
        targetName: undefined,
        versionNumber: '1.2.3'
    });

    assert.deepStrictEqual(releaseSection, err(expectedError));
});
