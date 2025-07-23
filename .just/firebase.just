# Firebase-related recipes

# Fetch Firebase export data
firebase-fetch-export:
    firebase database:get / > factorio-blueprints-export.json

# Deploy to Firebase with automatic tagging
firebase-deploy:
    #!/bin/bash
    set -exuo pipefail

    # Find the next available tag number for today
    BASE_TAG="$(date +%Y.%m.%d)"
    COUNT=1
    DATE_TAG="$BASE_TAG.$COUNT"
    while git tag -l "$DATE_TAG" | grep -q .; do
        ((COUNT++))
        DATE_TAG="$BASE_TAG.$COUNT"
    done

    just precommit \
        && git pushf origin HEAD:factorio-prints.com \
        && git pushf origin HEAD:factorio-prints.com \
        && git tag "$DATE_TAG" HEAD -f \
        && npm install --ignore-scripts \
        && op run -- npm run build \
        && firebase deploy \
        && git push origin "$DATE_TAG" -f

# Set tags in Firebase database
firebase-set-tags:
    firebase database:set /tags data/tags.json
