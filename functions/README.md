# Firebase Cloud Functions

These Cloud Functions help maintain data consistency and implement features that require server-side logic.

## Functions Included:

### updateFavoriteCount
Triggers when favorites change and atomically updates the count to prevent drift and race conditions.

### syncBlueprintTags
Keeps the `/byTag` collection synchronized with blueprint tag changes.

### cascadeDeleteBlueprint
Handles cleanup when a blueprint is deleted, removing all related data across collections.

### createBlueprintAtomic
HTTP callable function for creating blueprints with all related data atomically.

### reconcileFavoriteCounts
HTTP endpoint for manually reconciling favorite counts across the database.

## Deployment:

Functions are deployed automatically with the main application through:
- `./deploy.sh` - Local deployment script
- GitHub Actions - On release

The deployment process:
1. Builds the main application
2. Builds the Cloud Functions
3. Deploys everything together (hosting, database rules, and functions)

## Testing:

Run the Firebase emulator:
```bash
npm run serve
```

## Notes:

- These functions are optional but recommended for better data consistency
- The database rules allow the current client-side approach to continue working
- Deploy these functions when you're ready to improve data integrity
