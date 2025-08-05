#!/bin/bash
set -e

echo "📦 Copying Production Data to Staging"
echo "====================================="
echo ""
echo "⚠️  WARNING: This will overwrite staging data!"
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

echo ""
echo "Choose what to copy:"
echo "1) Sample data only (100 blueprints, recommended)"
echo "2) All summaries + sample blueprints"
echo "3) Full database copy (large!)"
echo ""
read -p "Choice (1-3): " choice

case $choice in
    1)
        echo "📥 Copying sample data..."
        firebase use production
        firebase database:get /blueprints --limit-to-first=100 -o staging-sample.json
        firebase database:get /blueprintSummaries --limit-to-first=100 -o staging-summaries.json
        firebase database:get /users --limit-to-first=10 -o staging-users.json

        firebase use staging
        firebase database:set /blueprints staging-sample.json
        firebase database:set /blueprintSummaries staging-summaries.json
        firebase database:set /users staging-users.json

        rm staging-*.json
        echo "✅ Sample data copied"
        ;;
    2)
        echo "📥 Copying all summaries + sample blueprints..."
        firebase use production
        firebase database:get /blueprintSummaries -o staging-summaries.json
        firebase database:get /blueprints --limit-to-first=100 -o staging-blueprints.json
        firebase database:get /byTag --shallow -o staging-tags.json

        firebase use staging
        firebase database:set /blueprintSummaries staging-summaries.json
        firebase database:set /blueprints staging-blueprints.json
        firebase database:set /byTag staging-tags.json

        rm staging-*.json
        echo "✅ Summaries and sample data copied"
        ;;
    3)
        echo "📥 Copying full database (this may take a while)..."
        firebase use production
        firebase database:get / -o staging-full.json

        firebase use staging
        firebase database:set / staging-full.json

        rm staging-full.json
        echo "✅ Full database copied"
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Data copy complete!"
echo "Test your staging environment at:"
echo "  https://console.firebase.google.com/project/factorio-blueprints-staging/database"
