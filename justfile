# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --ignore-scripts --legacy-peer-deps

# `npm run dev`
dev: install
    npm run dev

# `npm run lint:fix`
lint-fix:
    npm run lint:fix

# `uv tool run pre-commit run`
hooks:
    uv tool run pre-commit run --all-files

# `npm run build`
build: install
    npm run version:sync
    op run -- npm run build

# Run install, build, test, lint, and pre-commit hooks in sequence
precommit: build
    npm run test
    npm run lint:fix
    just hooks
