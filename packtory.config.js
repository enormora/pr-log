// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/packtory/source');

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
            { sourceFilePath: path.join(projectFolder, 'LICENSE'), targetFilePath: 'LICENSE' },
            { sourceFilePath: path.join(projectFolder, 'README.md'), targetFilePath: 'README.md' }
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
        packageInterface: {
            modules: [{ root: 'main', export: '.' }]
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
        }
    };
}

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageInfo = await readPackageInfo();
    const sharedAttributes = sharedPackageAttributes(packageInfo);

    return {
        commonPackageSettings: commonPackageSettings(packageInfo),
        packages: [corePackage(sharedAttributes), cliPackage(packageInfo, sharedAttributes)]
    };
}
