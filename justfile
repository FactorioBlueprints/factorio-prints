# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --ignore-engines --ignore-platform --ignore-scripts --legacy-peer-deps

# `npm run dev`
dev:
    npm run start

# Run install, build, test, lint, and pre-commit hooks in sequence
all: install
    npm run build
    npm run test:run
    npm run lint:fix
    just hooks

# `npm run lint:fix`
lint-fix:
    npm run lint:fix

# `uv tool run pre-commit run`
hooks:
    uv tool run pre-commit run

# `npm run build`
build:
    npm run build

# Run all checks, continuing even if some fail
precommit:
    @echo "🔍 Running pre-commit checks..."
    @just lint-fix || (echo "❌ Lint-fix failed but continuing...")
    @just hooks || (echo "❌ Precommit hooks failed but continuing...")
    @echo "✅ Pre-commit checks completed. Review any errors above."
