# Import sub-justfiles
import '.just/firebase.just'
import '.just/analysis.just'

# `just --list --unsorted`
[group('default')]
default:
    @just --list --unsorted

ci := env("CI", "")

export PATH := justfile_directory() / "node_modules/.bin" + ":" + env("PATH")

# `pnpm install`
[group('setup')]
install:
    pnpm install

# `pnpm install --frozen-lockfile`
[group('setup')]
install-ci:
    pnpm install --frozen-lockfile

# `vp run route:generate`
[group('codegen')]
route-generate: install
    vp run route:generate

# `vp run route:generate`
[group('codegen')]
route-generate-ci: install-ci
    vp run route:generate

# Run dev server
[group('dev')]
dev *args: install
    vp dev {{ args }}

# Run linter
[group('lint')]
lint: install
    vp lint {{ if ci != "" { "--format github" } else { "--fix" } }}

# Run formatter
[group('lint')]
format: install
    pre-commit run just-fmt --all-files
    oxfmt-next-line {{ if ci != "" { "--check" } else { "" } }}

# Run checks (lint + typecheck; formatting is `just format`)
[group('test')]
check *args: install route-generate
    vp run --cache check {{ if ci != "" { "" } else { "--fix" } }} {{ args }}

# Run tests
[group('test')]
test *args: install route-generate
    vp run --cache test:run {{ args }}
    vp run test:database-rules

# `vp run test:run`
[group('test')]
test-ci: install-ci route-generate-ci
    vp run test:run
    vp run test:database-rules

# `vp run typecheck`
[group('test')]
typecheck: install route-generate
    vp run typecheck

# Apply safe Fallow fixes locally, then reject remaining dead code
[group('test')]
fallow: install
    {{ if ci == "" { "vp run fallow" } else { "true" } }}
    vp run fallow:ci

# vp run fallow:ci
[group('test')]
fallow-check: install
    vp run fallow:ci

# Run pre-commit hooks on all files (same as CI's pre-commit job)
[group('test')]
pre-commit: install
    pre-commit run --all-files

# `vp run build`
[group('build')]
build: install
    op run -- vp run build

# `vp run build` without 1Password (for precommit checks)
[group('build')]
build-no-secrets: install
    SENTRY_AUTH_TOKEN="" vp run build

# `vp run build`
[group('build')]
build-ci: route-generate-ci install-ci
    vp run build

# Run all pre-commit checks
[arg("quick", long, value="true", help="Skip tests")]
[group('build')]
verify quick="": check build-no-secrets fallow pre-commit
    {{ if quick != "true" { "just test" } else { "true" } }}
    @echo "All pre-commit checks passed!"

# Deprecated alias for `verify`
[arg("quick", long, value="true", help="Skip tests")]
[group('build')]
precommit quick="": (verify quick)

# `vp run deploy:all`
[group('deploy')]
deploy: install verify-functions
    vp run deploy:all

# `vp run deploy:functions`
[group('deploy')]
deploy-functions: install verify-functions
    vp run deploy:functions

# `vp run verify:functions`
[group('test')]
verify-functions:
    vp run verify:functions

# `vp exec firebase login`
[group('firebase')]
firebase-login: install
    vp exec firebase login

# `vp exec firebase database:get / > factorio-blueprints-export.json`
[group('firebase')]
database-export: install
    vp exec firebase database:get / > factorio-blueprints-export.json

# `vp exec firebase database:get /tags > tags-export.json`
[group('firebase')]
tags-export: install
    vp exec firebase database:get /tags > tags-export.json

# Deploy to Cloudflare Pages
[group('deploy')]
deploy-cloudflare: build
    vp exec wrangler pages deploy dist --project-name=factorio-prints

# Preview deployment on Cloudflare Pages
[group('deploy')]
preview-cloudflare: build
    vp exec wrangler pages deploy dist --project-name=factorio-prints --branch=preview

# Deploy to Cloudflare Pages (production)
[group('deploy')]
deploy-cloudflare-production: build
    vp exec wrangler pages deploy dist --project-name=factorio-prints --branch=main
