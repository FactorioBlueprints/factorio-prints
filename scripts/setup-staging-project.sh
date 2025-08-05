#!/bin/bash
set -e

echo "🚀 Firebase Staging Project Setup"
echo "================================="
echo ""
echo "This script will help you create a staging environment for testing database rules"
echo ""

# Step 1: Create staging project
echo "📝 Step 1: Create a new Firebase project for staging"
echo ""
echo "Option A: Using Firebase CLI (Recommended):"
echo "  firebase projects:create factorio-blueprints-staging --display-name 'Factorio Blueprints Staging'"
echo ""
echo "Option B: Using Firebase Console:"
echo "  1. Go to https://console.firebase.google.com"
echo "  2. Click 'Add project'"
echo "  3. Name it 'factorio-blueprints-staging'"
echo "  4. Disable Google Analytics (not needed for staging)"
echo ""
echo "Press Enter after creating the project..."
read -p ""

# Step 2: Add staging to .firebaserc
echo "📝 Step 2: Adding staging project to .firebaserc..."
cat > .firebaserc << EOF
{
  "projects": {
    "default": "facorio-blueprints",
    "production": "facorio-blueprints",
    "staging": "factorio-blueprints-staging"
  }
}
EOF
echo "✅ Updated .firebaserc"

# Step 3: Initialize database in staging
echo ""
echo "📝 Step 3: Initialize Realtime Database in staging project"
echo ""
echo "Run these commands:"
echo "  firebase use staging"
echo "  firebase init database"
echo ""
echo "When prompted:"
echo "  - Choose 'Use an existing project'"
echo "  - Select 'factorio-blueprints-staging'"
echo "  - Accept default for database rules file"
echo "  - Choose your preferred database location (us-central1 recommended)"
echo ""
echo "Press Enter after initializing the database..."
read -p ""

# Step 4: Copy production data (optional)
echo ""
echo "📝 Step 4: Copy production data to staging (Optional)"
echo ""
echo "To copy a subset of production data for testing:"
echo ""
echo "  # Export from production"
echo "  firebase use production"
echo "  firebase database:get /blueprintSummaries --shallow > staging-sample-data.json"
echo ""
echo "  # Import to staging"
echo "  firebase use staging"
echo "  firebase database:set /blueprintSummaries staging-sample-data.json"
echo ""

# Step 5: Update environment configs
echo "📝 Step 5: Environment configuration"
echo ""
echo "You may need to update your app to support staging environment:"
echo ""
echo "  1. Create .env.staging with staging Firebase config"
echo "  2. Update your build scripts to support staging builds"
echo "  3. Consider adding a staging deployment workflow"
echo ""

# Step 6: Create staging deployment script
cat > scripts/deploy-to-staging.sh << 'SCRIPT'
#!/bin/bash
set -e

echo "🚀 Deploying to Staging Environment"
echo ""

# Switch to staging project
firebase use staging

# Deploy database rules and functions
echo "📦 Deploying database rules and functions..."
firebase deploy --only database,functions

echo ""
echo "✅ Staging deployment complete!"
echo ""
echo "Test your staging environment at:"
echo "  https://console.firebase.google.com/project/factorio-blueprints-staging/database"
SCRIPT

chmod +x scripts/deploy-to-staging.sh

echo "✅ Created scripts/deploy-to-staging.sh"
echo ""
echo "🎉 Staging setup complete!"
echo ""
echo "Next steps:"
echo "  1. Test deployment: ./scripts/deploy-to-staging.sh"
echo "  2. Run your app against staging to test"
echo "  3. When satisfied, deploy to production"
