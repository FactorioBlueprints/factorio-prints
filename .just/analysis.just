# Data analysis recipes

# Detect authors who have favorited their own blueprints
analysis-detect-author-self-favorite:
    jq --raw-output '.blueprints | map_values({author: .author.userId, favorites: (if .favorites? == null then [] else (.favorites | keys) end)}) | to_entries | .[] | . as {$key, value: {$author, $favorites}} | {$key, $author, $favorites} | select($favorites | contains([$author])) | "http://localhost:3000/view/" + .key' < factorio-blueprints-export.json

# Detect mismatches between blueprint favorites and summary counts
analysis-detect-summary-mismatch:
    jq --raw-output '(.blueprints | map_values(.favorites | length)) as $b | (.blueprintSummaries | map_values(.numberOfFavorites)) as $bs | $b | to_entries | map({key: .key, value: {blueprints: .value, summaries: $bs[.key]}}) | map(select(.value.blueprints != .value.summaries)) | map("http://localhost:3000/view/" + .key) | .[]' < factorio-blueprints-export.json
