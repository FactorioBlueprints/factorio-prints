# `just --list --unsorted`
default:
    @just --list --unsorted

# `yarn install`
install:
    yarn install --ignore-optional --ignore-engines --ignore-platform --ignore-scripts

# Start the development server
dev:
    yarn run watch

# Run build, test, and lint in sequence
all:
    yarn run build
    yarn run test --watchAll=false
    yarn run lint
