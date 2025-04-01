# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --ignore-engines --ignore-platform --ignore-scripts --legacy-peer-deps

# Start the development server
dev:
    npm run watch

# Run install, build, test, and lint in sequence
all: install
    npm run build
    npm run test:run
    npm run lint
