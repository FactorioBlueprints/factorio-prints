# `just --list --unsorted`
default:
    @just --list --unsorted

# `npm install`
install:
    npm install --no-optional --ignore-engines --ignore-platform --ignore-scripts --legacy-peer-deps

# Start the development server
dev:
    npm run watch

# Run install, build, test, and lint in sequence
all: install
    npm run build
    npm test -- --watchAll=false
    npm run lint
