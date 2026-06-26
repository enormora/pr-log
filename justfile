export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

compile:
    tsc --build

eslint *OPTIONS:
    eslint . --max-warnings 0 {{OPTIONS}}

eslint-fix: (eslint '--fix')

lint: eslint

lint-fix: eslint-fix

prepare-packtory-source: compile
    rm -rf target/packtory/source
    mkdir -p target/packtory
    cp -R target/build/source target/packtory/source
    perl -pi -e 's/from ([\x22\x27])(\.[^\x22\x27]+)\.ts\1/from $1$2.js$1/g' $(find target/packtory/source -name '*.d.ts')

prepare-release: prepare-packtory-source
    packtory release-pr maintain --no-dry-run

validate-release-pr:
    packtory release-pr validate

authorize-release-publish *OPTIONS:
    packtory release-pr authorize-publish {{OPTIONS}}

publish-release: prepare-packtory-source
    packtory release --publish --tag --push --github-release --no-dry-run

publish: prepare-packtory-source
    packtory publish --no-dry-run

publish-dry-run: prepare-packtory-source
    packtory publish

test-unit:
    mocha --config mocha.config.json

test:
    c8 just test-unit
