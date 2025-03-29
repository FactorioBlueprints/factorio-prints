# `just --list --unsorted`
default:
    @just --list --unsorted

# `yarn install`
install:
    yarn install --ignore-optional --ignore-engines --ignore-platform --ignore-scripts
