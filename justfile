# Import sub-justfiles
import '.just/firebase.just'
import '.just/analysis.just'

# `just --list --unsorted`
default:
    @just --list --unsorted

ci := env("CI", "")

# Override this with a command called `woof` which notifies you in whatever ways you prefer.
# My `woof` command uses `echo`, `say`, and sends a Pushover notification.
echo_command := env('ECHO_COMMAND', "echo")

# ANSI colors for output
ANSI_BOLD := `tput bold`
ANSI_NORMAL := `tput sgr0`
ANSI_DEFAULT := `tput op`
ANSI_YELLOW := `tput setaf 3`
ANSI_GREEN := `tput setaf 2`
ANSI_BRIGHT_GREEN := `tput setaf 10`
ANSI_BRIGHT_RED := `tput setaf 9`
ANSI_CYAN := `tput setaf 6`
ANSI_MAGENTA := `tput setaf 5`
ANSI_BG_BRIGHT_CYAN := `tput setab 14`
ANSI_BG_BRIGHT_MAGENTA := `tput setab 13`
ANSI_BLACK := `tput setaf 0`

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

# Fail if there are local modifications or untracked files
[group('git')]
_check-local-modifications:
    #!/usr/bin/env bash
    set -uo pipefail
    ERRORS=""
    git diff --ignore-submodules --quiet || ERRORS+="- Working tree has uncommitted changes\n"
    git diff --ignore-submodules --staged --quiet || ERRORS+="- Index has staged changes\n"
    git status --porcelain --ignore-submodules | grep -q '^??' && ERRORS+="- Untracked files exist\n"
    if [ -n "$ERRORS" ]; then
        {{ echo_command }} "Local modifications"
        echo -e "$ERRORS"
        git status --ignore-submodules
        exit 1
    fi

# Rebase all branches onto their own tracking branches
[group('git')]
rebase-tracking: _check-local-modifications
    #!/usr/bin/env bash
    set -Eeuo pipefail

    git fetch --all --quiet --tags --prune

    original_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort=-committerdate))
    total=${#branches[@]}
    current=0

    for branch in "${branches[@]}"
    do
        current=$((current + 1))

        tracking=$(git for-each-ref --format='%(upstream:short)' "refs/heads/$branch")

        if [ -z "$tracking" ]; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - {{ ANSI_MAGENTA }}no tracking branch{{ ANSI_NORMAL }}"
            continue
        fi

        if ! git rev-parse --verify "$tracking" &>/dev/null; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - tracking branch {{ ANSI_BRIGHT_RED }}$tracking{{ ANSI_NORMAL }} {{ ANSI_MAGENTA }}does not exist{{ ANSI_NORMAL }}"
            continue
        fi

        # Skip if branch is included in other branches (child branch)
        included_count=$(git branch --contains "$branch" | wc -l)
        if [ "$included_count" -gt 1 ]; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - {{ ANSI_BG_BRIGHT_CYAN }}{{ ANSI_BLACK }}included in other branches{{ ANSI_NORMAL }}"
            continue
        fi

        # Skip if branch is checked out in another worktree
        current_branch_check=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
        if [ "$branch" != "$current_branch_check" ] && git worktree list 2>/dev/null | grep -q "\[$branch\]"; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - {{ ANSI_BG_BRIGHT_MAGENTA }}{{ ANSI_BLACK }}checked out in another worktree{{ ANSI_NORMAL }}"
            continue
        fi

        # Check if branch is already up-to-date with tracking
        if git merge-base --is-ancestor "$tracking" "$branch" && git merge-base --is-ancestor "$branch" "$tracking"; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_CYAN }}Up-to-date{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} with {{ ANSI_BRIGHT_RED }}$tracking{{ ANSI_NORMAL }}"
            continue
        fi

        if ! git checkout --quiet "$branch" 2>/dev/null; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - {{ ANSI_MAGENTA }}cannot be checked out{{ ANSI_NORMAL }}"
            continue
        fi

        echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_GREEN }}Rebasing{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} onto {{ ANSI_BRIGHT_RED }}{{ ANSI_BOLD }}$tracking{{ ANSI_NORMAL }}"
        git rebase --rebase-merges --update-refs --quiet "$tracking"
    done

    # Return to original branch
    if [ -n "$original_branch" ]; then
        git checkout --quiet "$original_branch" 2>/dev/null || true
    fi

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
