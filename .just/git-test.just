# set up `git-test`
setup-git-test:
    # Combined
    git test add --forget --test default                      'just clean _check-local-modifications mvn'
    git test add --forget --test checkstyle                   'just clean _check-local-modifications checkstyle'
    git test add --forget --test spotless-all                 'just clean _check-local-modifications spotless-all'
    # Individual
    # git test add --forget --test compile                      'just clean _check-local-modifications compile'
    # git test add --forget --test test                         'just clean _check-local-modifications test'
    # git test add --forget --test enforcer                     'just clean _check-local-modifications enforcer'
    # git test add --forget --test dependency                   'just clean _check-local-modifications dependency'
    # git test add --forget --test checkstyle-semantics         'just clean _check-local-modifications checkstyle-semantics'
    # git test add --forget --test checkstyle-formatting        'just clean _check-local-modifications checkstyle-formatting'
    # git test add --forget --test checkstyle-semantics-strict  'just clean _check-local-modifications checkstyle-semantics-strict'
    # git test add --forget --test checkstyle-formatting-strict 'just clean _check-local-modifications checkstyle-formatting-strict'
    # git test add --forget --test javadoc                      'just clean _check-local-modifications javadoc'
    # git test add --forget --test reproducible                 'just clean _check-local-modifications reproducible'
    # git test add --forget --test formats                      'just clean _check-local-modifications spotless formats'
    # git test add --forget --test prettier                     'just clean _check-local-modifications spotless prettier-java'
    # git test add --forget --test gjf                          'just clean _check-local-modifications spotless google-java-format'
    # git test add --forget --test sort-imports                 'just clean _check-local-modifications spotless java-sort-imports'
    # git test add --forget --test unused-imports               'just clean _check-local-modifications spotless java-unused-imports'
    # git test add --forget --test cleanthat                    'just clean _check-local-modifications spotless java-cleanthat'
    # git test add --forget --test pom                          'just clean _check-local-modifications spotless pom'
    # git test add --forget --test markdown                     'just clean _check-local-modifications spotless markdown'
    # git test add --forget --test json                         'just clean _check-local-modifications spotless json'
    # git test add --forget --test yaml                         'just clean _check-local-modifications spotless yaml'
    # git test add --forget --test sql                          'just clean _check-local-modifications spotless sql'

fail_fast := env('FAIL_FAST', "false")

git_tests := env('GIT_TESTS', "--tests default,checkstyle,spotless-all")

# `git-test` on the range of commits between a configurable upstream/main and {{BRANCH}}
test-branch BRANCH="HEAD" TESTS=git_tests *FLAGS="--retest --verbose --verbose":
    #!/usr/bin/env bash
    branch="{{BRANCH}}"
    if [ "$branch" = "HEAD" ]; then
        branch=$(git branch --show-current)
        if [ -z "$branch" ]; then
            branch=$(git rev-parse HEAD)
        fi
    fi
    echo "$branch" > JUSTFILE_BRANCH
    just _run "git test run {{ANSI_GRAY}}{{TESTS}}{{ANSI_DEFAULT}} {{FLAGS}} {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}/{{upstream_branch}}{{ANSI_NORMAL}}..{{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}${branch}{{ANSI_NORMAL}}"

# `just test` all commits with configurable upstream/main as ancestor
test-all TESTS=git_tests *FLAGS="--retest --verbose --verbose":
    #!/usr/bin/env bash
    set -uo pipefail

    if [ "{{fail_fast}}" ]; then
        set -Ee
    fi

    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort -committerdate --contains {{upstream_remote}}/{{upstream_branch}}))

    total_branches=${#branches[@]}
    echo "Found {{ANSI_YELLOW}}${total_branches}{{ANSI_DEFAULT}} branches containing remote ref {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}/{{upstream_branch}}{{ANSI_NORMAL}} as ancestor: {{ANSI_GREEN}}${branches[@]}{{ANSI_NORMAL}}"

    current=1
    for branch in "${branches[@]}"
    do
        echo -n "[{{ANSI_YELLOW}}${current}{{ANSI_DEFAULT}}/${total_branches}] "
        just _run "{{ANSI_BRIGHT_RED}}just{{ANSI_DEFAULT}} test-branch {{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}\"${branch}\"{{ANSI_NORMAL}} {{ANSI_GRAY}}'{{TESTS}}'{{ANSI_DEFAULT}} {{FLAGS}}"
        ((current++))
    done

alias ta := test-all

# `just test results` all branches with configurable upstream/main as ancestor
test-results:
    #!/usr/bin/env bash
    set -uo pipefail

    branches=($(git for-each-ref --format='%(refname:short)' refs/heads/ --sort -committerdate --contains {{upstream_remote}}/{{upstream_branch}}))

    total_branches=${#branches[@]}
    echo "Found {{ANSI_YELLOW}}${total_branches}{{ANSI_DEFAULT}} branches containing remote ref {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}/{{upstream_branch}}{{ANSI_NORMAL}}{{ANSI_DEFAULT}} as ancestor: {{ANSI_BRIGHT_GREEN}}${branches[@]}{{ANSI_NORMAL}}"

    current=1
    for branch in "${branches[@]}"
    do
        echo -n "[{{ANSI_YELLOW}}${current}{{ANSI_DEFAULT}}/${total_branches}] "
        just _run "git test results --color {{ANSI_BRIGHT_RED}}{{ANSI_BOLD}}{{upstream_remote}}/{{upstream_branch}}{{ANSI_NORMAL}}..{{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}${branch}{{ANSI_NORMAL}}"
        ((current++))
    done

# Fix the current commit and `git rebase`
test-fix:
    #!/usr/bin/env bash
    set -Eeuo pipefail

    echo "{{ANSI_BOLD}}Staging changes.{{ANSI_NORMAL}}"
    just _run "git add --update"

    echo "{{ANSI_BOLD}}Committing fixup.{{ANSI_NORMAL}}"
    just _run "git commit --fixup {{ANSI_BOLD}}{{ANSI_CYAN}}HEAD{{ANSI_NORMAL}}"

    echo "{{ANSI_BOLD}}Checking for unstaged files.{{ANSI_NORMAL}}"
    just _check-local-modifications

    BRANCH=$(cat JUSTFILE_BRANCH)
    echo "Rebasing the last branch used with just test-fix: {{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}$BRANCH{{ANSI_NORMAL}}"
    just _run "git rebase --onto HEAD HEAD^ {{ANSI_BRIGHT_GREEN}}{{ANSI_BOLD}}$BRANCH{{ANSI_NORMAL}}"
    just _run "git checkout $BRANCH"

    echo "{{ANSI_BOLD}}Squashing changes.{{ANSI_NORMAL}}"
    just _run "just rebase"

    echo "{{ANSI_BOLD}}Cleaning up.{{ANSI_NORMAL}}"
    just _run "rm {{ANSI_YELLOW}}JUSTFILE_BRANCH{{ANSI_NORMAL}}"