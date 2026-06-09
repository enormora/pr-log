export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

compile:
    tsc --build

eslint *OPTIONS:
    eslint . --max-warnings 0 {{OPTIONS}}

eslint-fix: (eslint '--fix')

prettier *OPTIONS:
    prettier './**/*.{yml,yaml,json,md}' {{OPTIONS}}

prettier-check: (prettier '--check')

prettier-fix: (prettier '--write')

lint: eslint prettier-check

lint-fix: eslint-fix prettier-fix

prepare-packtory-source: compile
    rm -rf target/packtory/source
    mkdir -p target/packtory
    cp -R target/build/source target/packtory/source
    perl -pi -e 's/from ([\x22\x27])(\.[^\x22\x27]+)\.ts\1/from $1$2.js$1/g' $(find target/packtory/source -name '*.d.ts')

pack PACKAGE VERSION OUTPUT: prepare-packtory-source
    mkdir -p target/packages
    packtory pack {{PACKAGE}} --format tar --out {{OUTPUT}} --version {{VERSION}} --vendor-dependencies

pack-all: prepare-packtory-source
    mkdir -p target/packages
    packtory pack pr-log --format tar --out target/packages/pr-log-6.1.1.tgz --version 6.1.1 --vendor-dependencies
    packtory pack @pr-log/core --format tar --out target/packages/@pr-log-core-0.1.0.tgz --version 0.1.0 --vendor-dependencies

publish: prepare-packtory-source
    packtory publish --no-dry-run

publish-dry-run: prepare-packtory-source
    packtory publish

test-unit:
    mocha --config mocha.config.json

test:
    c8 just test-unit
