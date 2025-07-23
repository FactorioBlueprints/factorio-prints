# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --ignore-scripts

# `npm ci`
install-ci:
    npm ci --ignore-scripts --include=dev

# `npm run route:generate`
route-generate: install
    npm run route:generate

# `npm run route:generate`
route-generate-ci: install-ci
    npm run route:generate

# `npm run dev`
dev: install
    npm run dev

# `npm run lint`
lint: install
    npm run lint

# `npm run ci:eslint`
eslint-ci: install-ci
    npm run ci:eslint

# `npm run format`
format: install
    npm run format

# `npm run ci:biome`
biome-ci: install-ci
    npm run ci:biome

# `npm run ci:prettier`
prettier-ci: install-ci
    npm run ci:prettier

# `npm run test:run`
test: install route-generate
    npm run test:run

# `npm run test:run`
test-ci: install-ci route-generate-ci
    npm run test:run

# `npm run typecheck`
typecheck: install route-generate
    npm run typecheck

# `npm run typecheck`
typecheck-ci: install-ci route-generate-ci
    npm run typecheck

# `uv tool run pre-commit run`
hooks:
    uv tool run pre-commit run --all-files

# `npm run build`
build: install
    op run -- npm run build

# `npm run build`
build-ci: route-generate-ci install-ci
    npm run build

# Run all pre-commit checks
precommit: format lint typecheck build test
    @echo "✅ All pre-commit checks passed!"

# `firebase deploy`
deploy: install
    firebase deploy

# `firebase login`
firebase-login: install
    firebase login

# `firebase database:get / > factorio-blueprints-export.json`
database-export: install
    firebase database:get / > factorio-blueprints-export.json
