# Import sub-justfiles
import '.just/firebase.just'
import '.just/analysis.just'

# `just --list --unsorted`
default:
    @just --list --unsorted

ci := env("CI", "")

# `vp install`
[group('setup')]
install:
    vp install

# `vp install --frozen-lockfile`
[group('setup')]
install-ci:
    vp install --frozen-lockfile

# `vp run route:generate`
[group('codegen')]
route-generate: install
    vp run route:generate

# `vp run route:generate`
[group('codegen')]
route-generate-ci: install-ci
    vp run route:generate

# `vp run dev`
[group('dev')]
dev: install
    vp run dev

# `vp run lint`
[group('lint')]
lint: install
    vp run lint

# Run formatter
[group('lint')]
format: install
    vp fmt {{ if ci != "" { "--check" } else { "" } }}

# Run formatter, linter, and type checker
[group('test')]
check: install route-generate
    vp check {{ if ci != "" { "" } else { "--fix" } }}

# `vp run test:run`
[group('test')]
test: install route-generate
    vp run test:run
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

# `uv tool run pre-commit run`
[group('test')]
hooks:
    uv tool run pre-commit run --all-files

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
[group('build')]
precommit: check build-no-secrets test
    @echo "✅ All pre-commit checks passed!"

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
