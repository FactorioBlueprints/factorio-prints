#!/bin/bash

# Load environment variables
if [ -f .envrc ]; then
    source .envrc
else
    echo "Error: .envrc file not found"
    exit 1
fi

# Check if service account file exists
if [ ! -f "$FIREBASE_SERVICE_ACCOUNT" ]; then
    echo "Error: Service account file not found: $FIREBASE_SERVICE_ACCOUNT"
    exit 1
fi

# Check if Disqus export exists
if [ ! -f "disqus-comments.json" ]; then
    echo "Error: disqus-comments.json not found. Run the export first:"
    echo "  npx tsx scripts/disqus-export.ts factorio-blueprints-2025-08-11T11_26_53.796338-all.xml.gz disqus-comments.json"
    exit 1
fi

echo "🚀 Running Firebase Migration"
echo "   Database: $FIREBASE_DATABASE_URL"
echo "   Service Account: $FIREBASE_SERVICE_ACCOUNT"
echo ""

# Run the migration
npx tsx scripts/migrate-to-firebase.ts \
    --quiet \
    "$FIREBASE_SERVICE_ACCOUNT" \
    "$FIREBASE_DATABASE_URL" \
    disqus-comments.json

echo ""
echo "✅ Migration complete!"
