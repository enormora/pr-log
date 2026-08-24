import { format as formatDate } from 'date-fns';
import { isArray } from '@sindresorhus/is';
import { enUS as enLocale } from 'date-fns/locale/en-US';
import semver from 'semver';
import type { Just, Nothing } from 'true-myth/maybe';
import type {
    CollapseRule,
    HighestVersionCollapseRule,
    PrLogConfig,
    SameTitleCollapseRule,
    VersionChainCollapseRule
} from './pr-log-config.ts';
import type { ChangelogEntryInput } from './render-changelog-markdown.ts';

function formatLinkToPullRequest(pullRequestId: number, repo: string): string {
    return `[#${pullRequestId}](https://github.com/${repo}/pull/${pullRequestId})`;
}

type ChangelogEntry = {
    readonly title: string;
    readonly pullRequestIds: readonly number[];
};

function formatChangelogEntry(entry: ChangelogEntry, repo: string): string {
    const formattedLinks = entry.pullRequestIds.map(function (pullRequestId) {
        return formatLinkToPullRequest(pullRequestId, repo);
    });

    if (formattedLinks.length === 0) {
        return `* ${entry.title}\n`;
    }

    return `* ${entry.title} (${formattedLinks.join(', ')})\n`;
}

function formatListOfPullRequests(entries: readonly ChangelogEntry[], repo: string): string {
    return entries
        .map(function (entry) {
            return formatChangelogEntry(entry, repo);
        })
        .join('');
}

function formatSection(displayLabel: string, entries: readonly ChangelogEntry[], repo: string): string {
    return `### ${displayLabel}\n\n${formatListOfPullRequests(entries, repo)}\n`;
}

export type CreateChangelog = (options: ChangelogOptions) => string;

const defaultDateFormat = 'MMMM d, yyyy';

export function formatChangelogDate(dateFormat: string | undefined, date: Readonly<Date>): string {
    const resolvedDateFormat = dateFormat ?? defaultDateFormat;
    return formatDate(date, resolvedDateFormat, { locale: enLocale });
}

function groupByLabel(pullRequests: readonly ChangelogEntryInput[]): Record<string, ChangelogEntryInput[]> {
    return pullRequests.reduce(function (groupedObject: Readonly<Record<string, ChangelogEntryInput[]>>, pullRequest) {
        const { label } = pullRequest;
        const group = groupedObject[label];

        if (isArray(group)) {
            return {
                ...groupedObject,
                [label]: [ ...group, pullRequest ]
            };
        }

        return {
            ...groupedObject,
            [label]: [ pullRequest ]
        };
    }, {});
}

type ChangelogEntryWithLabel = ChangelogEntry & {
    readonly label: string;
};

type CollapseMatch = {
    readonly groups: Readonly<Record<string, string>>;
};

type RuleMatch = CollapseMatch & {
    readonly key: string;
    readonly from: string;
    readonly to: string;
};

type HighestVersionRuleMatch = CollapseMatch & {
    readonly key: string;
    readonly version: string;
};

type SameTitleRuleMatch = CollapseMatch & {
    readonly key: string;
};

type CollapseChain = {
    readonly firstIndex: number;
    readonly indexes: readonly number[];
    readonly groups: Readonly<Record<string, string>>;
    readonly pullRequestIds: readonly number[];
};

type HighestVersionCollapseGroup = CollapseChain & {
    readonly version: string;
};

type CollapseChainUpdate = {
    readonly fromGroup: string;
    readonly from: string;
};

type CollapseChainContext = {
    readonly rule: VersionChainCollapseRule;
    readonly ruleMatch: RuleMatch;
};

function createChangelogEntries(pullRequests: readonly ChangelogEntryInput[]): readonly ChangelogEntryWithLabel[] {
    return pullRequests.map(function (pullRequest) {
        return {
            title: pullRequest.title,
            pullRequestIds: pullRequest.id === undefined ? [] : [ pullRequest.id ],
            label: pullRequest.label
        };
    });
}

function isHighestVersionCollapseRule(rule: CollapseRule): rule is HighestVersionCollapseRule {
    return Object.hasOwn(rule, 'versionGroup');
}

function isSameTitleCollapseRule(rule: CollapseRule): rule is SameTitleCollapseRule {
    return Object.hasOwn(rule, 'collapse');
}

function getRuleKey(match: CollapseMatch, rule: CollapseRule): string {
    const key = match.groups[rule.keyGroup];

    if (key === undefined) {
        throw new TypeError(`Collapse rule for label "${rule.label}" requires capture group "${rule.keyGroup}"`);
    }

    return key;
}

function getRuleGroups(match: CollapseMatch, rule: VersionChainCollapseRule): Readonly<[string, string, string]> {
    const key = getRuleKey(match, rule);
    const from = match.groups[rule.fromGroup];
    const to = match.groups[rule.toGroup];

    if (from === undefined) {
        throw new TypeError(`Collapse rule for label "${rule.label}" requires capture group "${rule.fromGroup}"`);
    }
    if (to === undefined) {
        throw new TypeError(`Collapse rule for label "${rule.label}" requires capture group "${rule.toGroup}"`);
    }

    return [ key, from, to ];
}

function getSemverGroup(match: CollapseMatch, rule: HighestVersionCollapseRule): string {
    const version = match.groups[rule.versionGroup];

    if (version === undefined) {
        throw new TypeError(`Collapse rule for label "${rule.label}" requires capture group "${rule.versionGroup}"`);
    }

    const parsedVersion = semver.coerce(version);
    if (parsedVersion === null) {
        throw new TypeError(
            `Collapse rule for label "${rule.label}" requires semver capture group "${rule.versionGroup}"`
        );
    }

    return parsedVersion.version;
}

function renderCollapsedTitle(replace: string, groups: Readonly<Record<string, string>>): string {
    return replace.replaceAll(/\$<(?<groupName>[^>]+)>/gu, function (_match, groupName: string) {
        return groups[groupName] ?? '';
    });
}

function getVersionChainRuleMatch(
    entry: ChangelogEntryWithLabel,
    rule: VersionChainCollapseRule
): RuleMatch | undefined {
    const match = rule.pattern.exec(entry.title);

    if (match?.groups === undefined) {
        return undefined;
    }

    const [ key, from, to ] = getRuleGroups({ groups: match.groups }, rule);

    return { key, from, to, groups: { ...match.groups } };
}

function getHighestVersionRuleMatch(
    entry: ChangelogEntryWithLabel,
    rule: HighestVersionCollapseRule
): HighestVersionRuleMatch | undefined {
    const match = rule.pattern.exec(entry.title);

    if (match?.groups === undefined) {
        return undefined;
    }

    const groups = { ...match.groups };
    const key = getRuleKey({ groups }, rule);
    const version = getSemverGroup({ groups }, rule);

    return { key, version, groups };
}

function getSameTitleRuleMatch(
    entry: ChangelogEntryWithLabel,
    rule: SameTitleCollapseRule
): SameTitleRuleMatch | undefined {
    const match = rule.pattern.exec(entry.title);

    if (match?.groups === undefined) {
        return undefined;
    }

    const groups = { ...match.groups };
    const key = getRuleKey({ groups }, rule);

    return { key, groups };
}

function createExtendedChain(
    chain: CollapseChain,
    entry: ChangelogEntryWithLabel,
    index: number,
    update: CollapseChainUpdate
): CollapseChain {
    return {
        ...chain,
        indexes: [ ...chain.indexes, index ],
        groups: {
            ...chain.groups,
            [update.fromGroup]: update.from
        },
        pullRequestIds: [ ...chain.pullRequestIds, ...entry.pullRequestIds ]
    };
}

function createCollapseChain(
    index: number,
    entry: ChangelogEntryWithLabel,
    groups: Readonly<Record<string, string>>
): CollapseChain {
    return {
        firstIndex: index,
        indexes: [ index ],
        groups,
        pullRequestIds: Array.from(entry.pullRequestIds)
    };
}

function createUpdatedChains(
    existingChains: readonly CollapseChain[],
    entry: ChangelogEntryWithLabel,
    index: number,
    context: CollapseChainContext
): readonly CollapseChain[] {
    const { rule, ruleMatch } = context;
    const previousChain = existingChains.at(-1);

    if (previousChain?.groups[rule.fromGroup] !== ruleMatch.to) {
        return [ ...existingChains, createCollapseChain(index, entry, ruleMatch.groups) ];
    }

    return [
        ...existingChains.slice(0, -1),
        createExtendedChain(previousChain, entry, index, {
            fromGroup: rule.fromGroup,
            from: ruleMatch.from
        })
    ];
}

function createUpdatedChainsByKey(
    chainsByKey: ReadonlyMap<string, readonly CollapseChain[]>,
    entry: ChangelogEntryWithLabel,
    index: number,
    rule: VersionChainCollapseRule
): ReadonlyMap<string, readonly CollapseChain[]> {
    const ruleMatch = getVersionChainRuleMatch(entry, rule);

    if (ruleMatch === undefined) {
        return chainsByKey;
    }

    const nextChainsByKey = new Map(chainsByKey);
    const existingChains = chainsByKey.get(ruleMatch.key) ?? [];
    const updatedChains = createUpdatedChains(existingChains, entry, index, { rule, ruleMatch });

    nextChainsByKey.set(ruleMatch.key, updatedChains);
    return nextChainsByKey;
}

function createChainsByKey(
    entries: readonly ChangelogEntryWithLabel[],
    rule: VersionChainCollapseRule
): ReadonlyMap<string, readonly CollapseChain[]> {
    return entries.reduce<ReadonlyMap<string, readonly CollapseChain[]>>(function (chainsByKey, entry, index) {
        return createUpdatedChainsByKey(chainsByKey, entry, index, rule);
    }, new Map<string, readonly CollapseChain[]>());
}

function createHighestVersionCollapseGroup(
    index: number,
    entry: ChangelogEntryWithLabel,
    ruleMatch: HighestVersionRuleMatch
): HighestVersionCollapseGroup {
    return {
        ...createCollapseChain(index, entry, ruleMatch.groups),
        version: ruleMatch.version
    };
}

function extendHighestVersionCollapseGroup(
    group: HighestVersionCollapseGroup,
    entry: ChangelogEntryWithLabel,
    index: number,
    ruleMatch: HighestVersionRuleMatch
): HighestVersionCollapseGroup {
    const highestVersionGroups = semver.gt(ruleMatch.version, group.version) ? ruleMatch.groups : group.groups;
    const highestVersion = semver.gt(ruleMatch.version, group.version) ? ruleMatch.version : group.version;

    return {
        ...group,
        indexes: [ ...group.indexes, index ],
        groups: highestVersionGroups,
        version: highestVersion,
        pullRequestIds: [ ...group.pullRequestIds, ...entry.pullRequestIds ]
    };
}

function updateHighestVersionGroupsByKey(
    groupsByKey: ReadonlyMap<string, HighestVersionCollapseGroup>,
    entry: ChangelogEntryWithLabel,
    index: number,
    rule: HighestVersionCollapseRule
): ReadonlyMap<string, HighestVersionCollapseGroup> {
    const ruleMatch = getHighestVersionRuleMatch(entry, rule);

    if (ruleMatch === undefined) {
        return groupsByKey;
    }

    const nextGroupsByKey = new Map(groupsByKey);
    const group = groupsByKey.get(ruleMatch.key);
    const nextGroup = group === undefined
        ? createHighestVersionCollapseGroup(index, entry, ruleMatch)
        : extendHighestVersionCollapseGroup(group, entry, index, ruleMatch);

    nextGroupsByKey.set(ruleMatch.key, nextGroup);
    return nextGroupsByKey;
}

function createHighestVersionGroupsByKey(
    entries: readonly ChangelogEntryWithLabel[],
    rule: HighestVersionCollapseRule
): ReadonlyMap<string, HighestVersionCollapseGroup> {
    return entries.reduce<ReadonlyMap<string, HighestVersionCollapseGroup>>(function (groupsByKey, entry, index) {
        return updateHighestVersionGroupsByKey(groupsByKey, entry, index, rule);
    }, new Map<string, HighestVersionCollapseGroup>());
}

function createSameTitleCollapseGroup(
    index: number,
    entry: ChangelogEntryWithLabel,
    ruleMatch: SameTitleRuleMatch
): CollapseChain {
    return createCollapseChain(index, entry, ruleMatch.groups);
}

function extendSameTitleCollapseGroup(
    group: CollapseChain,
    entry: ChangelogEntryWithLabel,
    index: number
): CollapseChain {
    return {
        ...group,
        indexes: [ ...group.indexes, index ],
        pullRequestIds: [ ...group.pullRequestIds, ...entry.pullRequestIds ]
    };
}

function updateSameTitleGroupsByKey(
    groupsByKey: ReadonlyMap<string, CollapseChain>,
    entry: ChangelogEntryWithLabel,
    index: number,
    rule: SameTitleCollapseRule
): ReadonlyMap<string, CollapseChain> {
    const ruleMatch = getSameTitleRuleMatch(entry, rule);

    if (ruleMatch === undefined) {
        return groupsByKey;
    }

    const nextGroupsByKey = new Map(groupsByKey);
    const group = groupsByKey.get(ruleMatch.key);
    const nextGroup = group === undefined
        ? createSameTitleCollapseGroup(index, entry, ruleMatch)
        : extendSameTitleCollapseGroup(group, entry, index);

    nextGroupsByKey.set(ruleMatch.key, nextGroup);
    return nextGroupsByKey;
}

function createSameTitleGroupsByKey(
    entries: readonly ChangelogEntryWithLabel[],
    rule: SameTitleCollapseRule
): ReadonlyMap<string, CollapseChain> {
    return entries.reduce<ReadonlyMap<string, CollapseChain>>(function (groupsByKey, entry, index) {
        return updateSameTitleGroupsByKey(groupsByKey, entry, index, rule);
    }, new Map<string, CollapseChain>());
}

function createCollapsedEntriesByIndex(
    chainsByKey: ReadonlyMap<string, readonly CollapseChain[]>,
    rule: CollapseRule
): Readonly<[Map<number, ChangelogEntryWithLabel>, Set<number>]> {
    const collapsedEntries = new Map<number, ChangelogEntryWithLabel>();
    const skippedIndexes = new Set<number>();
    const minimumChainLength = 2;
    const collapsedChains = Array
        .from(chainsByKey.values())
        .flat()
        .filter(function (chain) {
            return chain.indexes.length >= minimumChainLength;
        });

    collapsedChains.forEach(function (chain) {
        const [ , ...remainingIndexes ] = chain.indexes;

        collapsedEntries.set(chain.firstIndex, {
            title: renderCollapsedTitle(rule.replace, chain.groups),
            pullRequestIds: chain.pullRequestIds,
            label: rule.label
        });

        remainingIndexes.forEach(function (index) {
            skippedIndexes.add(index);
        });
    });

    return [ collapsedEntries, skippedIndexes ];
}

function createGroupedCollapsedEntriesByIndex(
    groupsByKey: ReadonlyMap<string, CollapseChain>,
    rule: HighestVersionCollapseRule | SameTitleCollapseRule
): Readonly<[Map<number, ChangelogEntryWithLabel>, Set<number>]> {
    const collapsedEntries = new Map<number, ChangelogEntryWithLabel>();
    const skippedIndexes = new Set<number>();
    const minimumGroupLength = 2;
    const collapsedGroups = Array
        .from(groupsByKey.values())
        .filter(function (group) {
            return group.indexes.length >= minimumGroupLength;
        });

    collapsedGroups.forEach(function (group) {
        const [ , ...remainingIndexes ] = group.indexes;

        collapsedEntries.set(group.firstIndex, {
            title: renderCollapsedTitle(rule.replace, group.groups),
            pullRequestIds: group.pullRequestIds,
            label: rule.label
        });

        remainingIndexes.forEach(function (index) {
            skippedIndexes.add(index);
        });
    });

    return [ collapsedEntries, skippedIndexes ];
}

function createCollapseResultForRule(
    entries: readonly ChangelogEntryWithLabel[],
    rule: CollapseRule
): Readonly<[Map<number, ChangelogEntryWithLabel>, Set<number>]> {
    if (isSameTitleCollapseRule(rule)) {
        return createGroupedCollapsedEntriesByIndex(
            createSameTitleGroupsByKey(entries, rule),
            rule
        );
    }

    if (isHighestVersionCollapseRule(rule)) {
        return createGroupedCollapsedEntriesByIndex(
            createHighestVersionGroupsByKey(entries, rule),
            rule
        );
    }

    return createCollapsedEntriesByIndex(createChainsByKey(entries, rule), rule);
}

function collapseEntriesForRule(
    entries: readonly ChangelogEntryWithLabel[],
    rule: CollapseRule
): readonly ChangelogEntryWithLabel[] {
    const [ collapsedEntries, skippedIndexes ] = createCollapseResultForRule(entries, rule);

    return entries.flatMap(function (entry, index) {
        if (skippedIndexes.has(index)) {
            return [];
        }

        return [ collapsedEntries.get(index) ?? entry ];
    });
}

function collapseEntries(
    label: string,
    entries: readonly ChangelogEntryWithLabel[],
    rules: readonly CollapseRule[]
): readonly ChangelogEntryWithLabel[] {
    return rules
        .filter(function (rule) {
            return rule.label === label;
        })
        .reduce(collapseEntriesForRule, entries);
}

type Dependencies = {
    readonly config: PrLogConfig;
    getCurrentDate: () => Readonly<Date>;
};

type ChangelogOptionsUnreleased = {
    readonly unreleased: true;
    readonly versionNumber: Nothing<string>;
    readonly mergedPullRequests: readonly ChangelogEntryInput[];
    readonly githubRepo: string;
};

type ChangelogOptionsReleased = {
    readonly unreleased: false;
    readonly versionNumber: Just<string>;
    readonly mergedPullRequests: readonly ChangelogEntryInput[];
    readonly githubRepo: string;
};

export type ChangelogOptions = ChangelogOptionsReleased | ChangelogOptionsUnreleased;

export function createChangelogFactory(dependencies: Dependencies): CreateChangelog {
    const { config, getCurrentDate } = dependencies;

    function createChangelogTitle(options: ChangelogOptions): string {
        const { unreleased } = options;

        if (unreleased) {
            return '';
        }

        const date = formatChangelogDate(config.dateFormat, getCurrentDate());
        const title = `## ${options.versionNumber.value} (${date})`;

        return `${title}\n\n`;
    }

    return function createChangelog(options) {
        const { mergedPullRequests, githubRepo } = options;
        const groupedPullRequests = groupByLabel(mergedPullRequests);

        let changelog = createChangelogTitle(options);

        for (const [ label, displayLabel ] of config.validLabels) {
            const pullRequests = groupedPullRequests[label];

            if (isArray(pullRequests)) {
                const entries = collapseEntries(label, createChangelogEntries(pullRequests), config.collapseRules);
                changelog += formatSection(displayLabel, entries, githubRepo);
            }
        }

        return changelog;
    };
}
