factorio_prints_dir := env('FACTORIO_PRINTS_DIR', '~/projects/factorio.school')
ui_module := env('UI_MODULE', 'factorio-prints-dropwizard-application-ui-static')

# `just --list --unsorted`
[group('default')]
default:
    @just --list --unsorted

# Build and rsync UI to {{FACTORIO_PRINTS_DIR}}
deploy-rsync-ui: install
    GENERATE_SOURCEMAP=true op run --env-file=".envrc" -- npm run build
    npm run styles
    # Source maps are uploaded to Sentry during build, then deleted by the Sentry webpack plugin
    rsync -av build/ {{factorio_prints_dir}}/{{ui_module}}/src/main/resources/ui
    git -C {{factorio_prints_dir}} add {{ui_module}}/src/main/resources/ui
    git -C {{factorio_prints_dir}} commit --no-verify --message "Upgrade UI to $(git log -n1 --pretty='%H %s')" || true
    cd {{factorio_prints_dir}}/{{ui_module}} && just spotless json || true
    j absorb
    # git -C {{factorio_prints_dir}} push open-source HEAD:factorio.school

# `npm run start`
run:
    npm run start

# `factorio --dump-icon-sprites`
dump-icon-sprites:
    ~/Library/Application\ Support/Steam/SteamApps/common/Factorio/factorio.app/Contents/MacOS/factorio --dump-icon-sprites

# `rsync` icon sprites
sync-icon-sprites:
    rsync -av ~/Library/Application\ Support/factorio/script-output/entity/*.png         {{justfile_directory()}}/public/icons/entity/
    rsync -av ~/Library/Application\ Support/factorio/script-output/fluid/*.png          {{justfile_directory()}}/public/icons/fluid/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item-group/*.png     {{justfile_directory()}}/public/icons/item-group/
    rsync -av ~/Library/Application\ Support/factorio/script-output/item/*.png           {{justfile_directory()}}/public/icons/item/
    rsync -av ~/Library/Application\ Support/factorio/script-output/quality/*.png        {{justfile_directory()}}/public/icons/quality/
    rsync -av ~/Library/Application\ Support/factorio/script-output/recipe/*.png         {{justfile_directory()}}/public/icons/recipe/
    rsync -av ~/Library/Application\ Support/factorio/script-output/space-location/*.png {{justfile_directory()}}/public/icons/space-location/
    rsync -av ~/Library/Application\ Support/factorio/script-output/technology/*.png     {{justfile_directory()}}/public/icons/technology/
    rsync -av ~/Library/Application\ Support/factorio/script-output/tile/*.png           {{justfile_directory()}}/public/icons/tile/
    rsync -av ~/Library/Application\ Support/factorio/script-output/virtual-signal/*.png {{justfile_directory()}}/public/icons/virtual-signal/

# Override this with a command called `woof` which notifies you in whatever ways you prefer.
# My `woof` command uses `echo`, `say`, and sends a Pushover notification.
echo_command := env('ECHO_COMMAND', "echo")

# `npm install`
[group('setup')]
install:
    npm install --legacy-peer-deps

# Run lint check
lint:
    npm run lint:fix

# Run type check
typecheck:
    npx tsc --noEmit

# Compile styles
styles:
    npm run styles

# Run tests
test:
    npm test -- --watchAll=false

# Build the project
build:
    SENTRY_AUTH_TOKEN="" npm run build

# Run all validation checks before committing
precommit: install lint typecheck styles test build

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

    # Get all local branches sorted by most recent commit
    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort=-committerdate))
    total=${#branches[@]}
    current=0

    for branch in "${branches[@]}"
    do
        current=$((current + 1))

        # Get the tracking branch for this branch
        tracking=$(git for-each-ref --format='%(upstream:short)' "refs/heads/$branch")

        if [ -z "$tracking" ]; then
            echo "[{{ ANSI_YELLOW }}${current}{{ ANSI_DEFAULT }}/${total}] {{ ANSI_YELLOW }}Skipping{{ ANSI_NORMAL }} branch {{ ANSI_BRIGHT_GREEN }}{{ ANSI_BOLD }}$branch{{ ANSI_NORMAL }} - {{ ANSI_MAGENTA }}no tracking branch{{ ANSI_NORMAL }}"
            continue
        fi

        # Check if tracking branch exists on remote
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
