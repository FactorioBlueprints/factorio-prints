#!/bin/bash
set -e

echo "🔒 Safe Firebase Rules Deployment Script"
echo "========================================"
echo ""

# Step 1: Backup current rules
echo "📦 Step 1: Backing up current production rules..."
firebase database:get /.settings/rules > database.rules.backup.json
echo "✅ Current rules backed up to database.rules.backup.json"
echo ""

# Step 2: Run local tests
echo "🧪 Step 2: Testing new rules locally..."
./scripts/test-rules-emulator.sh
echo ""

# Step 3: Check if staging project exists
echo "🔍 Step 3: Checking for staging project..."
if firebase use staging 2>/dev/null; then
    echo "✅ Staging project found!"
    echo ""
    echo "📦 Deploying to staging first..."
    firebase deploy --only database,functions
    echo ""
    echo "✅ Staging deployment complete!"
    echo ""
    echo "🧪 Test your rules in staging:"
    echo "  https://console.firebase.google.com/project/factorio-blueprints-staging/database"
    echo ""
    echo "When ready for production:"
    echo "  firebase use production"
    echo "  firebase deploy --only database,functions"
else
    echo "⚠️  No staging project found!"
    echo ""
    echo "To create a staging project, run:"
    echo "  ./scripts/setup-staging-project.sh"
    echo ""
    echo "Alternative testing options:"
    echo ""
    echo "Option A: Use Firebase Rules staging (test mode)"
    echo "  firebase database:rules:stage database.rules.json"
    echo "  (This stages rules for testing without affecting production)"
    echo ""
    echo "Option B: Direct production deployment (⚠️  RISKY)"
    echo "  firebase deploy --only database"
fi

echo ""
echo "📝 To rollback if needed:"
echo "  firebase database:rules:release database.rules.backup.json"
