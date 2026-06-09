// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/packtory/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const readmePath = path.join(projectFolder, 'README.md');

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
        additionalFiles: [
            { sourceFilePath: licensePath, targetFilePath: 'LICENSE' },
            { sourceFilePath: readmePath, targetFilePath: 'README.md' }
        ],
        deadCodeElimination: { enabled: false },
        publishSettings: {
            access: 'public',
            provenance: { type: 'auto' }
        }
    };
}

function corePackage(sharedAttributes) {
    return {
        name: '@pr-log/core',
        versioning: { automatic: false, version: '0.1.0' },
        roots: {
            main: {
                js: 'packages/core/core.entry-point.js',
                declarationFile: 'packages/core/core.entry-point.d.ts'
            }
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: 'Library API for changelog generation from GitHub pull requests',
            keywords: ['pr-log', 'changelog', 'github', 'pull-request', 'release-plan']
        }
    };
}

function cliPackage(packageInfo, sharedAttributes) {
    return {
        name: 'pr-log',
        versioning: { automatic: false, version: packageInfo.version },
        roots: {
            cli: {
                js: 'packages/command-line-interface/bin.entry-point.js'
            }
        },
        packageInterface: {
            bins: [{ root: 'cli', name: 'pr-log' }]
        },
        additionalPackageJsonAttributes: {
            ...sharedAttributes,
            description: packageInfo.description,
            keywords: packageInfo.keywords
        },
        bundleDependencies: ['@pr-log/core']
    };
}

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageInfo = await readPackageInfo();
    const sharedAttributes = sharedPackageAttributes(packageInfo);

    return {
        commonPackageSettings: commonPackageSettings(packageInfo),
        checks: {
            areTheTypesWrong: { enabled: true, profile: 'esm-only' },
            noDuplicatedFiles: { enabled: true, allowList: [licensePath, readmePath] },
            requiredFiles: { enabled: true, files: ['LICENSE', 'README.md'] },
            uniqueTargetPaths: { enabled: true }
        },
        packages: [corePackage(sharedAttributes), cliPackage(packageInfo, sharedAttributes)]
    };
}
