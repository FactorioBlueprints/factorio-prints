#!/bin/bash
set -e

echo "⚡ Fast Production to Staging Copy"
echo "==================================="
echo ""
echo "⚠️  WARNING: This will overwrite ALL staging data!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

# Check if staging exists
if ! firebase use staging 2>/dev/null; then
    echo "❌ Staging project not found. Run ./scripts/setup-staging-project.sh first"
    exit 1
fi

echo "📦 Starting fast copy..."
echo ""

# Create temporary directory for parallel processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Function to copy a node
copy_node() {
    local node=$1
    local file="$TEMP_DIR/${node}.json"

    echo "  📥 Copying /$node..."
    firebase use production > /dev/null 2>&1
    firebase database:get "/$node" -o "$file"

    firebase use staging > /dev/null 2>&1
    firebase database:set "/$node" "$file" -y

    echo "  ✅ /$node done"
}

# Export function for parallel execution
export -f copy_node
export TEMP_DIR

# Copy all main nodes in parallel
echo "Copying database nodes in parallel..."
printf "%s\n" "blueprints" "blueprintSummaries" "users" "byTag" | \
    xargs -P 4 -I {} bash -c 'copy_node "$@"' _ {}

echo ""
echo "✅ Fast copy complete!"
echo ""
echo "📊 Verifying copy..."
firebase use staging
echo "Staging database stats:"
firebase database:get / --shallow | jq 'keys | length' | xargs echo "  Root nodes:"
firebase database:get /blueprints --shallow | jq 'length' | xargs echo "  Blueprints:"
firebase database:get /blueprintSummaries --shallow | jq 'length' | xargs echo "  Summaries:"

echo ""
echo "Test your staging environment at:"
echo "  https://console.firebase.google.com/project/factorio-blueprints-staging/database"
