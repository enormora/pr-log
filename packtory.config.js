// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/packtory/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const coreReadmePath = path.join(projectFolder, 'source/packages/core/README.md');
const cliReadmePath = path.join(projectFolder, 'source/packages/command-line-interface/README.md');

async function readPackageInfo() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    return JSON.parse(packageJsonContent);
}

function sharedPackageAttributes(packageInfo) {
    return {
        author: packageInfo.author,
        contributors: packageInfo.contributors,
        license: packageInfo.license,
        repository: packageInfo.repository,
        engines: packageInfo.engines
    };
}

function commonPackageSettings(packageInfo) {
    return {
        sourcesFolder,
        mainPackageJson: { type: 'module', dependencies: packageInfo.dependencies },
        deadCodeElimination: { enabled: true },
        publishSettings: {
            access: 'public',
            provenance: { type: 'auto' }
        }
    };
}

function registrySettings() {
    return {
        auth: { type: 'npm-oidc', provider: 'github-actions' }
    };
}

function publishedPackageFiles(readmePath) {
    return [
        { sourceFilePath: licensePath, targetFilePath: 'LICENSE' },
        { sourceFilePath: readmePath, targetFilePath: 'README.md' }
    ];
}

function corePackage(sharedAttributes) {
    return {
        name: '@pr-log/core',
        versioning: { automatic: true, minimumVersion: '0.0.1' },
        additionalFiles: publishedPackageFiles(coreReadmePath),
        roots: {
            main: {
                js: 'packages/core/core.entry-point.js',
                declarationFile: 'packages/core/core.entry-point.d.ts'
            }
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: 'Library API for changelog generation from GitHub pull requests',
            keywords: [ 'pr-log', 'changelog', 'github', 'pull-request', 'release-plan' ]
        }
    };
}

function cliPackage(packageInfo, sharedAttributes) {
    return {
        name: 'pr-log',
        versioning: {
            automatic: false,
            source: 'pull-request-labels'
        },
        additionalFiles: publishedPackageFiles(cliReadmePath),
        roots: {
            cli: {
                js: 'packages/command-line-interface/bin.entry-point.js',
                declarationFile: 'packages/command-line-interface/bin.entry-point.d.ts'
            }
        },
        packageInterface: {
            bins: [ { root: 'cli', name: 'pr-log' } ]
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: packageInfo.description,
            keywords: packageInfo.keywords
        },
        bundleDependencies: [ '@pr-log/core' ]
    };
}

function releasePullRequestSettings() {
    return {
        branch: 'release/pr-log',
        body: 'Updates changelogs for the next `pr-log` release.',
        githubActionsCi: {
            trigger: 'workflow-dispatch',
            workflowFile: 'continuous-integration.yml',
            requiredStatusContexts: [
                'Node v22',
                'Node v24',
                'Node v26',
                'Release PR policy',
                'Workflow security analysis'
            ]
        }
    };
}

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfig>}
 */
export async function buildConfig() {
    const packageInfo = await readPackageInfo();
    const sharedAttributes = sharedPackageAttributes(packageInfo);

    return {
        registrySettings: registrySettings(),
        changelog: {
            packageTagFormat: '{packageName}@{version}',
            prLog: {
                ignoredLabels: [ 'release' ],
                collapseRules: [
                    {
                        label: 'upgrade',
                        pattern: '^⬆️ Update dependency (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                        replace: '⬆️ Update dependency $<dependency> from $<from> to $<to>'
                    }
                ]
            },
            outputs: [
                {
                    kind: 'package-file',
                    paths: {
                        '@pr-log/core': 'source/packages/core/CHANGELOG.md',
                        'pr-log': 'source/packages/command-line-interface/CHANGELOG.md'
                    }
                },
                { kind: 'github-release' }
            ]
        },
        commonPackageSettings: commonPackageSettings(packageInfo),
        checks: {
            typeScriptIntegrity: { enabled: true, declarations: 'all' },
            noDuplicatedFiles: { enabled: true, allowList: [ licensePath ] },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            maxBundleSize: { enabled: true },
            noUnusedBundleDependencies: { enabled: true },
            noDevDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noSideEffects: { enabled: false }
        },
        releasePullRequest: releasePullRequestSettings(),
        packages: [ corePackage(sharedAttributes), cliPackage(packageInfo, sharedAttributes) ]
    };
}
