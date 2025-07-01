# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --ignore-scripts --legacy-peer-deps

# `npm ci` for CI
install-ci:
    npm ci --ignore-engines --ignore-platform --ignore-scripts --legacy-peer-deps

# Generate routes
route-generate: install
    npm run route:generate

# Generate routes for CI
route-generate-ci: install-ci
    npm run route:generate

# `npm run dev`
dev: install
    npm run dev

# `npm run lint:fix`
lint-fix: install
    npm run lint:fix

# `npm run lint`
lint: install
    npm run lint

# `npm run lint` for CI
lint-ci: install-ci
    npm run lint

# ESLint with JSON output for CI annotations
ci-lint: install-ci
    npx eslint . --format json --output-file eslint_report.json || true

# `npm run test`
test: route-generate
    npm run test

# `npm run test` for CI
test-ci: route-generate-ci
    npm run test

# `uv tool run pre-commit run`
hooks:
    uv tool run pre-commit run --all-files

# `npm run build`
build: install
    op run -- npm run build

# Build for CI
build-ci: route-generate-ci
    npm run build

# Run install, build, test, lint, and pre-commit hooks in sequence
precommit: lint-fix hooks build test
