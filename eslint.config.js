import { baseConfig } from '@enormora/eslint-config-base';
import { mochaNodeAssertConfig } from '@enormora/eslint-config-mocha-node-assert';
import { nodeConfig, nodeConfigFileConfig, nodeEntryPointFileConfig } from '@enormora/eslint-config-node';
import { typescriptConfig } from '@enormora/eslint-config-typescript';

export default [
    {
        ignores: [ '**/CHANGELOG.md', 'target/**' ]
    },
    ...baseConfig,
    {
        ...nodeConfig,
        files: [ '**/*.{js,cjs,mjs,ts,cts,mts}' ]
    },
    {
        files: [ '**/*.{js,cjs,mjs,ts,cts,mts}' ],
        rules: {
            '@stylistic/operator-linebreak': 'off'
        }
    },
    {
        ...typescriptConfig,
        files: [ '**/*.{ts,cts,mts}' ]
    },
    {
        ...nodeConfigFileConfig,
        files: [ 'eslint.config.js', 'mocha.config.json', 'packtory.config.js' ]
    },
    {
        ...mochaNodeAssertConfig,
        files: [ '**/*.test.ts' ],
        languageOptions: {
            globals: {
                test: 'readonly'
            }
        }
    },
    {
        ...nodeEntryPointFileConfig,
        files: [
            'source/packages/command-line-interface/bin.entry-point.ts',
            'source/packages/command-line-interface/composition.ts'
        ]
    }
];
