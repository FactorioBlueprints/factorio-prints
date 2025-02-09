upstream_remote := env('UPSTREAM_REMOTE', "upstream")
upstream_branch := env('UPSTREAM_BRANCH', "main")
offline := env_var_or_default('OFFLINE', 'false')

# Add git refspec to fetch GitHub PR refs from `REMOTE`
setup-github-refspec REMOTE:
    #!/usr/bin/env bash
    set -Eeuo pipefail

    if git remote get-url {{REMOTE}} &> /dev/null && git remote get-url {{REMOTE}} | grep -q 'github\.'; then
        just _run "git config --add remote.{{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{REMOTE}}{{ANSI_NORMAL}}.fetch '+refs/pull/*/head:refs/remotes/{{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{REMOTE}}{{ANSI_NORMAL}}/pr/*'"
        just _run "git config --add remote.{{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{REMOTE}}{{ANSI_NORMAL}}.fetch '+refs/pull/*/merge:refs/remotes/{{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{REMOTE}}{{ANSI_NORMAL}}/pr/merge/*'"
    else
        echo "Remote {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{REMOTE}}{{ANSI_NORMAL}} is not a GitHub remote"
    fi

# Add git refspec to fetch GitHub PR refs from origin and upstream
setup-github-refspecs: (setup-github-refspec "origin") (setup-github-refspec "upstream")

# git clean helper
_clean-git:

# Fail if there are local modifications or untracked files
_check-local-modifications:
    #!/usr/bin/env bash
    set -uo pipefail

    ERRORS=""

    git diff --quiet || ERRORS+="- Working tree has uncommitted changes\n"
    git diff --staged --quiet || ERRORS+="- Index has staged changes\n"
    git status --porcelain | grep -q '^??' && ERRORS+="- Untracked files exist\n"

    if [ -n "$ERRORS" ]; then
        {{echo_command}} "Local modifications"
        echo -e "$ERRORS"
        just _run "git status"
        exit 1
    fi

# git fetch configurable upstream
fetch:
    #!/usr/bin/env bash
    set -Eeuo pipefail
    if [ "{{offline}}" != "true" ]; then
        just _run "git fetch {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}{{ANSI_NORMAL}} --tags --prune"
    fi

# Create a branch if HEAD is detached
recover-detached-head:
    #!/usr/bin/env bash
    set -Eeuo pipefail

    if ! git symbolic-ref -q HEAD >/dev/null; then
        current_date=$(date +%Y-%m-%d)
        branch_name="branch-${current_date}"
        git checkout -b "$branch_name"
        echo "Recovering detached HEAD. Created new branch: {{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}$branch_name{{ANSI_NORMAL}}"
    fi

# Generate a markdown list of commit messages
pull-request-description:
    #!/usr/bin/env bash
    set -Eeuo pipefail
    just _run "git log {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}/{{upstream_branch}}{{ANSI_NORMAL}}..{{ANSI_BRIGHT_CYAN}}{{ANSI_BOLD}}HEAD{{ANSI_NORMAL}} --reverse --format='- %s'"
