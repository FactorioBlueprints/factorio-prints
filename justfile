# Import sub-justfiles
import '.just/firebase.just'
import '.just/analysis.just'

# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
[group('setup')]
install:
    npm install --ignore-scripts

# `npm ci`
[group('setup')]
install-ci:
    npm ci --ignore-scripts --include=dev

# `npm run route:generate`
[group('codegen')]
route-generate: install
    npm run route:generate

# `npm run route:generate`
[group('codegen')]
route-generate-ci: install-ci
    npm run route:generate

# `npm run dev`
[group('dev')]
dev: install
    npm run dev

# `npm run lint`
[group('lint')]
lint: install
    npm run lint

# `npm run ci:eslint`
[group('lint')]
eslint-ci: install-ci
    npm run ci:eslint

# `npm run format`
[group('lint')]
format: install
    npm run format

# `npm run ci:biome`
[group('lint')]
biome-ci: install-ci
    npm run ci:biome

# `npm run ci:prettier`
[group('lint')]
prettier-ci: install-ci
    npm run ci:prettier

# `npm run test:run`
[group('test')]
test: install route-generate
    npm run test:run

# `npm run test:run`
[group('test')]
test-ci: install-ci route-generate-ci
    npm run test:run

# `npm run typecheck`
[group('test')]
typecheck: install route-generate
    npm run typecheck

# `npm run typecheck`
[group('test')]
typecheck-ci: install-ci route-generate-ci
    npm run typecheck

# `uv tool run pre-commit run`
[group('test')]
hooks:
    uv tool run pre-commit run --all-files

# `npm run build`
[group('build')]
build: install
    op run -- npm run build

# `npm run build` without 1Password (for precommit checks)
[group('build')]
build-no-secrets: install
    SENTRY_AUTH_TOKEN="" npm run build

# `npm run build`
[group('build')]
build-ci: route-generate-ci install-ci
    npm run build

# Run all pre-commit checks
[group('build')]
precommit: format lint typecheck build-no-secrets test
    @echo "✅ All pre-commit checks passed!"

# `npm run deploy:all`
[group('deploy')]
deploy: install
    npm run deploy:all

# `npm run deploy:functions`
[group('deploy')]
deploy-functions: install
    npm run deploy:functions

# `firebase login`
[group('firebase')]
firebase-login: install
    firebase login

# `firebase database:get / > factorio-blueprints-export.json`
[group('firebase')]
database-export: install
    firebase database:get / > factorio-blueprints-export.json

# `firebase database:get /tags > tags-export.json`
[group('firebase')]
tags-export: install
    firebase database:get /tags > tags-export.json

# Deploy to Cloudflare Pages
[group('deploy')]
deploy-cloudflare: build
    npx wrangler pages deploy dist --project-name=factorio-prints

# Preview deployment on Cloudflare Pages
[group('deploy')]
preview-cloudflare: build
    npx wrangler pages deploy dist --project-name=factorio-prints --branch=preview

# Deploy to Cloudflare Pages (production)
[group('deploy')]
deploy-cloudflare-production: build
    npx wrangler pages deploy dist --project-name=factorio-prints --branch=main
